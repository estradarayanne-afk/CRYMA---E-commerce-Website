import 'dart:convert';

import 'package:cryma_flutter_app/models/buyer_voucher.dart';
import 'package:cryma_flutter_app/services/api_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() =>
      SharedPreferences.setMockInitialValues({'cryma_api_token': 'qa-token'}));

  final voucher = <String, dynamic>{
    'id': 42,
    'code': 'SAVE10',
    'discount_type': 'percentage',
    'discount_value': '10.00',
    'minimum_spend': '500.00',
    'maximum_discount': '200.00',
    'buyer_status': 'available',
    'buyer_status_reason': null,
    'is_claimed': true,
    'categories': ['Beauty'],
    'eligible_product_names': ['Sample item'],
  };

  test('voucher parser uses backend fields without calculating a discount', () {
    final parsed = BuyerVoucher.fromJson(voucher);
    expect(parsed.id, 42);
    expect(parsed.isClaimed, isTrue);
    expect(parsed.discountLabel, '10% off');
    expect(parsed.minimumSpend, '500.00');
    expect(parsed.categories, ['Beauty']);
    final validation = BuyerVoucherValidation.fromJson({
      'voucher': {'code': 'SAVE10'},
      'subtotal': '800.00',
      'eligible_subtotal': '800.00',
      'discount_amount': '80.00',
    });
    expect(validation.discountAmount, '80.00');
  });

  test('list and claim use authenticated Buyer endpoints', () async {
    final requests = <http.Request>[];
    final api = ApiService(
      baseUrl: 'https://qa.example.test',
      client: MockClient((request) async {
        requests.add(request);
        final body = request.method == 'GET'
            ? {
                'success': true,
                'data': [voucher]
              }
            : {
                'success': true,
                'data': {'voucher_id': 42, 'is_claimed': true}
              };
        return http.Response(
            jsonEncode(body), request.method == 'POST' ? 201 : 200,
            headers: {'content-type': 'application/json'});
      }),
    );
    expect((await api.getBuyerVouchers()).single['code'], 'SAVE10');
    expect((await api.claimBuyerVoucher(42))['data']['is_claimed'], isTrue);
    expect(requests.map((request) => '${request.method} ${request.url.path}'), [
      'GET /api/buyer/vouchers',
      'POST /api/buyer/vouchers/42/claim',
    ]);
    expect(
        requests.every(
            (request) => request.headers['authorization'] == 'Bearer qa-token'),
        isTrue);
  });

  test('validation sends code and checkout items and parses server discount',
      () async {
    late http.Request request;
    final api = ApiService(
      baseUrl: 'https://qa.example.test',
      client: MockClient((value) async {
        request = value;
        return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'voucher': {'code': 'SAVE10'},
                'subtotal': '800.00',
                'eligible_subtotal': '800.00',
                'discount_amount': '80.00',
              },
            }),
            200,
            headers: {'content-type': 'application/json'});
      }),
    );
    final data = await api.validateBuyerVoucher(
      code: ' SAVE10 ',
      items: const [
        {'product_id': 7, 'quantity': 2}
      ],
    );
    expect(request.url.path, '/api/buyer/vouchers/validate');
    expect(jsonDecode(request.body), {
      'code': 'SAVE10',
      'items': [
        {'product_id': 7, 'quantity': 2}
      ],
    });
    expect(BuyerVoucherValidation.fromJson(data).discountAmount, '80.00');
  });

  test(
      'validation errors preserve backend messages and order forwards voucher code',
      () async {
    final requests = <http.Request>[];
    final api = ApiService(
      baseUrl: 'https://qa.example.test',
      client: MockClient((request) async {
        requests.add(request);
        if (request.url.path.endsWith('/validate')) {
          return http.Response(
              jsonEncode({
                'message': 'The given data was invalid.',
                'errors': {
                  'code': ['This voucher has expired.']
                }
              }),
              422,
              headers: {'content-type': 'application/json'});
        }
        return http.Response(jsonEncode({'success': true, 'data': {}}), 201,
            headers: {'content-type': 'application/json'});
      }),
    );
    await expectLater(
      api.validateBuyerVoucher(code: 'OLD', items: const [
        {'product_id': 7, 'quantity': 1}
      ]),
      throwsA(isA<ApiException>().having(
          (error) => error.message, 'message', 'This voucher has expired.')),
    );
    await api.createOrder(
      addressId: 1,
      deliveryAddress: 'Synthetic address',
      paymentMethod: 'cash_on_delivery',
      items: const [
        {'product_id': 7, 'quantity': 1}
      ],
      idempotencyKey: 'qa-order-key',
      voucherCode: 'SAVE10',
    );
    expect(jsonDecode(requests.last.body)['voucher_code'], 'SAVE10');
  });
}

import 'dart:convert';

import 'package:cryma_flutter_app/models/buyer_address.dart';
import 'package:cryma_flutter_app/services/api_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  final row = <String, dynamic>{
    'id': 17,
    'label': 'home',
    'recipient_name': 'QA Buyer',
    'phone': '+639171234567',
    'region': 'National Capital Region',
    'province': 'Metro Manila',
    'municipality': 'Quezon City',
    'barangay': 'Bagong Pag-asa',
    'house_number': '12',
    'building_name': 'Tower A',
    'unit_number': '4B',
    'street': 'Sample Road',
    'postal_code': '1105',
    'is_default': true,
  };

  setUp(() =>
      SharedPreferences.setMockInitialValues({'cryma_api_token': 'qa-token'}));

  test('address parser and payload retain backend field names and default flag',
      () {
    final address = BuyerAddress.fromJson(row);
    expect(address.id, 17);
    expect(address.isDefault, isTrue);
    expect(address.formattedAddress, contains('Bagong Pag-asa'));
    expect(address.toPayload(makeDefault: false), {
      'label': 'home',
      'recipient_name': 'QA Buyer',
      'phone': '+639171234567',
      'region': 'National Capital Region',
      'province': 'Metro Manila',
      'municipality': 'Quezon City',
      'barangay': 'Bagong Pag-asa',
      'house_number': '12',
      'building_name': 'Tower A',
      'unit_number': '4B',
      'street': 'Sample Road',
      'postal_code': '1105',
      'is_default': false,
    });
  });

  test('address list and checkout use authenticated Buyer API contracts',
      () async {
    final seen = <http.Request>[];
    final api = ApiService(
      baseUrl: 'https://qa.example.test',
      client: MockClient((request) async {
        seen.add(request);
        final body = request.url.path.endsWith('/buyer/addresses')
            ? {
                'success': true,
                'data': [row]
              }
            : {
                'success': true,
                'data': {
                  'addresses': [row]
                }
              };
        return http.Response(jsonEncode(body), 200,
            headers: {'content-type': 'application/json'});
      }),
    );

    final addresses = await api.getBuyerAddresses();
    final checkout = await api.getCheckoutData();
    expect(addresses.single['id'], 17);
    expect(checkout['addresses'], hasLength(1));
    expect(seen.map((request) => request.url.path), [
      '/api/buyer/addresses',
      '/api/buyer/checkout-data',
    ]);
    expect(
      seen.every((request) => request.headers.entries.any(
            (entry) =>
                entry.key.toLowerCase() == 'authorization' &&
                entry.value == 'Bearer qa-token',
          )),
      isTrue,
    );
  });

  test('create, edit, default, and delete use the registered endpoint methods',
      () async {
    final seen = <http.Request>[];
    final api = ApiService(
      baseUrl: 'https://qa.example.test',
      client: MockClient((request) async {
        seen.add(request);
        return http.Response(jsonEncode({'success': true, 'data': row}), 200,
            headers: {'content-type': 'application/json'});
      }),
    );
    final payload = BuyerAddress.fromJson(row).toPayload(makeDefault: true);

    await api.createBuyerAddress(payload);
    await api.updateBuyerAddress(17, payload);
    await api.setDefaultBuyerAddress(17);
    await api.deleteBuyerAddress(17);

    expect(seen.map((request) => '${request.method} ${request.url.path}'), [
      'POST /api/buyer/addresses',
      'PATCH /api/buyer/addresses/17',
      'PATCH /api/buyer/addresses/17/default',
      'DELETE /api/buyer/addresses/17',
    ]);
    expect(jsonDecode(seen.first.body)['recipient_name'], 'QA Buyer');
  });

  test('validation errors preserve backend field messages and status',
      () async {
    final api = ApiService(
      baseUrl: 'https://qa.example.test',
      client: MockClient((_) async => http.Response(
            jsonEncode({
              'message': 'The given data was invalid.',
              'errors': {
                'region': ['Select a supported region.']
              },
            }),
            422,
            headers: {'content-type': 'application/json'},
          )),
    );
    await expectLater(
      api.createBuyerAddress(
          BuyerAddress.fromJson(row).toPayload(makeDefault: false)),
      throwsA(isA<ApiException>()
          .having((error) => error.statusCode, 'statusCode', 422)
          .having((error) => error.fieldErrors['region'], 'region error',
              'Select a supported region.')),
    );
  });

  test(
      'authenticated address requests fail before network when token is absent',
      () async {
    SharedPreferences.setMockInitialValues({});
    var requested = false;
    final api = ApiService(
      baseUrl: 'https://qa.example.test',
      client: MockClient((_) async {
        requested = true;
        return http.Response('{}', 200);
      }),
    );
    await expectLater(api.getBuyerAddresses(), throwsA(isA<ApiException>()));
    expect(requested, isFalse);
  });
}

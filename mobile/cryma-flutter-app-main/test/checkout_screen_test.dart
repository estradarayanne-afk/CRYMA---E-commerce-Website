import 'dart:convert';

import 'package:cryma_flutter_app/models/buyer_address.dart';
import 'package:cryma_flutter_app/navigation/app_router.dart';
import 'package:cryma_flutter_app/screens/account/add_address_screen.dart';
import 'package:cryma_flutter_app/screens/cart/checkout_screen.dart';
import 'package:cryma_flutter_app/screens/cart/order_success_screen.dart';
import 'package:cryma_flutter_app/screens/cart/voucher_selection_screen.dart';
import 'package:cryma_flutter_app/services/api_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _address = <String, dynamic>{
  'id': 17,
  'label': 'home',
  'recipient_name': 'QA Buyer',
  'phone': '+639171234567',
  'region': 'National Capital Region',
  'province': 'Metro Manila',
  'municipality': 'Quezon City',
  'barangay': 'Bagong Pag-asa',
  'street': 'Sample Road',
  'is_default': true,
};

const _cartItem = <String, dynamic>{
  'id': '1',
  'product_id': '1',
  'cart_key': '1|base',
  'name': 'Everyday Tote',
  'price': '100',
  'quantity': 1,
  'stock': 3,
  'selected': true,
};

ApiService _apiWith({
  required List<Map<String, dynamic>> addresses,
  required List<http.Request> requests,
}) {
  return ApiService(
    baseUrl: 'https://qa.example.test',
    client: MockClient((request) async {
      requests.add(request);
      if (request.url.path == '/api/buyer/checkout-data') {
        return http.Response(
          jsonEncode({
            'success': true,
            'data': {'addresses': addresses},
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }
      if (request.url.path == '/api/buyer/shipping-quote') {
        return http.Response(
          jsonEncode({
            'success': true,
            'data': {
              'region': 'National Capital Region',
              'province': 'Metro Manila',
              'shipping_fee': '85.00',
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }
      if (request.url.path == '/api/buyer/vouchers' &&
          request.method == 'GET') {
        return http.Response(
          jsonEncode({'success': true, 'data': <dynamic>[]}),
          200,
          headers: {'content-type': 'application/json'},
        );
      }
      if (request.url.path == '/api/buyer/vouchers/validate') {
        return http.Response(
          jsonEncode({
            'success': true,
            'data': {
              'voucher': {'code': 'SAVE10'},
              'discount_amount': '10.00',
              'subtotal': '100.00',
              'eligible_subtotal': '100.00',
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }
      if (request.url.path == '/api/buyer/address-options') {
        final options = request.url.queryParameters['path'] == 'regions'
            ? [
                {'name': 'Region VII', 'code': '0700000000'}
              ]
            : <Map<String, dynamic>>[];
        return http.Response(
          jsonEncode({'success': true, 'data': options}),
          200,
          headers: {'content-type': 'application/json'},
        );
      }
      return http.Response(
        jsonEncode({'success': true, 'data': _address}),
        200,
        headers: {'content-type': 'application/json'},
      );
    }),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('production routes preserve checkout result types', () {
    final addAddressRoute = AppRouter.generateRoute(
      const RouteSettings(name: '/add_address'),
    );
    final voucherRoute = AppRouter.generateRoute(
      const RouteSettings(name: '/voucher_selection'),
    );

    expect(addAddressRoute, isA<MaterialPageRoute<bool>>());
    expect(voucherRoute, isA<MaterialPageRoute<Map<String, dynamic>>>());
  });

  setUp(() {
    SharedPreferences.setMockInitialValues({
      'cryma_api_token': 'qa-token',
      'cryma_api_user': jsonEncode({
        'id': 1,
        'role': 'buyer',
        'first_name': 'QA',
        'last_name': 'Buyer',
        'phone': '+639171234567',
      }),
      'cryma_cart_items_buyer_1': jsonEncode([_cartItem]),
    });
  });

  Future<void> pumpCheckout(
    WidgetTester tester, {
    required ApiService api,
  }) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        home: CheckoutScreen(apiService: api),
        onGenerateRoute: (settings) {
          if (settings.name == '/voucher_selection') {
            final arguments = settings.arguments as Map<String, dynamic>;
            return MaterialPageRoute<Map<String, dynamic>>(
              builder: (_) => VoucherSelectionScreen(
                items: arguments['items'] as List<Map<String, dynamic>>,
                scope: arguments['scope']?.toString() ?? 'product',
                addressId:
                    int.tryParse(arguments['address_id']?.toString() ?? ''),
                apiService: api,
              ),
            );
          }
          if (settings.name == '/add_address') {
            return MaterialPageRoute<bool>(
              builder: (_) => AddAddressScreen(
                address: settings.arguments as BuyerAddress?,
                apiService: api,
              ),
            );
          }
          return null;
        },
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('checkout voucher button opens, validates, and applies a voucher',
      (tester) async {
    final requests = <http.Request>[];
    final api = _apiWith(addresses: [_address], requests: requests);
    await pumpCheckout(tester, api: api);

    await tester.tap(find.text('Select a voucher'));
    await tester.pumpAndSettle();
    expect(find.text('Select Product Voucher'), findsOneWidget);
    expect(find.text('No claimed product vouchers'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'save10');
    await tester.pump();
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller?.text,
      'save10',
    );
    expect(
      tester
          .widget<FilledButton>(
            find.widgetWithText(FilledButton, 'Validate and apply'),
          )
          .onPressed,
      isNotNull,
    );
    await tester.tap(find.text('Validate and apply'));
    await tester.pumpAndSettle();

    expect(
      requests.any((request) =>
          request.method == 'POST' &&
          request.url.path == '/api/buyer/vouchers/validate'),
      isTrue,
      reason:
          'The voucher Apply action must send a validation request. Requests: '
          '${requests.map((request) => '${request.method} ${request.url}').join(', ')}',
    );
    expect(find.text('SAVE10'), findsOneWidget);
    expect(find.text('Change'), findsOneWidget);
    expect(
      requests.any((request) =>
          request.method == 'POST' &&
          request.url.path == '/api/buyer/vouchers/validate'),
      isTrue,
    );
  });

  testWidgets('checkout add-address button opens the address form',
      (tester) async {
    final requests = <http.Request>[];
    final api = _apiWith(addresses: const [], requests: requests);
    await pumpCheckout(tester, api: api);

    await tester.tap(find.text('Add address'));
    await tester.pumpAndSettle();

    expect(find.text('Add New Address'), findsOneWidget);
    expect(find.text('Recipient name'), findsNothing);
    expect(find.text('Philippine mobile number'), findsNothing);
    expect(find.text('PHILIPPINE LOCATION'), findsOneWidget);
    expect(find.text('MANUAL ADDRESS'), findsOneWidget);
    expect(
      requests.any(
        (request) => request.url.path == '/api/buyer/address-options',
      ),
      isTrue,
    );
  });

  testWidgets('checkout add-new-address button opens the address form',
      (tester) async {
    final requests = <http.Request>[];
    final api = _apiWith(addresses: [_address], requests: requests);
    await pumpCheckout(tester, api: api);

    await tester.ensureVisible(find.text('Add new address'));
    await tester.tap(find.text('Add new address'));
    await tester.pumpAndSettle();

    expect(find.text('Add New Address'), findsOneWidget);
    expect(find.text('Recipient name'), findsNothing);
    expect(find.text('Philippine mobile number'), findsNothing);
    expect(find.text('PHILIPPINE LOCATION'), findsOneWidget);
    expect(find.text('MANUAL ADDRESS'), findsOneWidget);
  });

  testWidgets(
      'order success screen shows linked order ids for split seller orders',
      (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => ElevatedButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  settings: const RouteSettings(
                    arguments: {
                      'id': 11,
                      'total_amount': '1200.00',
                      'payment_method': 'cash_on_delivery',
                      'checkout_orders': [
                        {
                          'id': 11,
                          'seller_storefront_name': 'Nora Home Store',
                        },
                        {
                          'id': 12,
                          'seller_storefront_name': 'Daily Finds',
                        },
                      ],
                    },
                  ),
                  builder: (_) => const OrderSuccessScreen(),
                ),
              );
            },
            child: const Text('continue'),
          ),
        ),
      ),
    );

    await tester.tap(find.text('continue'));
    await tester.pumpAndSettle();

    expect(find.text('Your orders are placed!'), findsOneWidget);
    expect(find.text('Linked orders'), findsOneWidget);
    expect(find.text('#12'), findsOneWidget);
    expect(find.text('Nora Home Store'), findsOneWidget);
    expect(find.text('Daily Finds'), findsOneWidget);
    expect(find.text('Total amount'), findsOneWidget);
    expect(find.text('₱1200'), findsOneWidget);
    expect(find.text('View my orders'), findsOneWidget);
  });

  testWidgets('order success screen omits linked-order section for one seller',
      (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => ElevatedButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  settings: const RouteSettings(
                    arguments: {
                      'id': 21,
                      'total_amount': '350.00',
                      'payment_method': 'cash_on_delivery',
                    },
                  ),
                  builder: (_) => const OrderSuccessScreen(),
                ),
              );
            },
            child: const Text('continue'),
          ),
        ),
      ),
    );

    await tester.tap(find.text('continue'));
    await tester.pumpAndSettle();

    expect(find.text('Order placed!'), findsOneWidget);
    expect(find.text('Order number'), findsOneWidget);
    expect(find.text('#21'), findsOneWidget);
    expect(find.text('Linked orders'), findsNothing);
    expect(find.text('₱350'), findsOneWidget);
  });
}

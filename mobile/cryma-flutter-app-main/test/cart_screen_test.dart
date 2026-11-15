import 'dart:convert';

import 'package:cryma_flutter_app/screens/cart/cart_screen.dart';
import 'package:cryma_flutter_app/services/api_service.dart';
import 'package:cryma_flutter_app/services/cart_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('cart additions are capped at the available stock', () async {
    SharedPreferences.setMockInitialValues({
      'cryma_cart_items_guest': jsonEncode([]),
    });

    final added = await CartStore.instance.add({
      'id': 'product-stock',
      'product_id': 'product-stock',
      'quantity': 5,
      'stock': 3,
    });

    expect(added, isTrue);
    expect((await CartStore.instance.items()).single['quantity'], 3);

    await CartStore.instance.add({
      'id': 'product-stock',
      'product_id': 'product-stock',
      'quantity': 1,
      'stock': 3,
    });

    expect((await CartStore.instance.items()).single['quantity'], 3);
  });

  test('cart keeps different products in separate quantity rows', () async {
    SharedPreferences.setMockInitialValues({
      'cryma_cart_items_guest': jsonEncode([]),
    });

    await CartStore.instance.add({
      'id': 'product-one',
      'quantity': 1,
      'stock': 5,
    });
    await CartStore.instance.add({
      'id': 'product-two',
      'quantity': 1,
      'stock': 5,
    });
    await CartStore.instance.add({
      'id': 'product-one',
      'quantity': 1,
      'stock': 5,
    });

    final items = await CartStore.instance.items();
    expect(items, hasLength(2));
    expect(
      {for (final item in items) item['product_id']: item['quantity']},
      {'product-one': 2, 'product-two': 1},
    );
  });

  testWidgets('manual cart quantity cannot exceed available stock',
      (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    SharedPreferences.setMockInitialValues({
      'cryma_cart_items_guest': jsonEncode([
        {
          'id': '13',
          'product_id': '13',
          'cart_key': '13|base',
          'name': 'Stock-limited product',
          'price': 100,
          'quantity': 2,
          'stock': 3,
          'image': '',
          'seller': 'Local Seller',
          'store_slug': 'local-seller',
          'selected': true,
        },
      ]),
    });
    final api = ApiService(
      baseUrl: 'https://test.cryma.store',
      client: MockClient((request) async {
        expect(request.url.path, '/api/products/availability');
        return http.Response(
          jsonEncode({
            'success': true,
            'data': {
              'items': [
                {'product_id': 13, 'variant_id': null, 'stock': 3},
              ],
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }),
    );

    await tester.pumpWidget(
      MaterialApp(home: CartScreen(api: api)),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Edit quantity'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), '4');
    await tester.tap(find.widgetWithText(FilledButton, 'Update'));
    await tester.pumpAndSettle();
    expect(find.text('Enter a quantity from 1 to 3.'), findsOneWidget);

    await tester.enterText(find.byType(TextField), '3');
    await tester.tap(find.widgetWithText(FilledButton, 'Update'));
    await tester.pumpAndSettle();
    expect(find.text('Checkout (3)'), findsOneWidget);
  });

  testWidgets('cart removal asks for confirmation before deleting items',
      (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    SharedPreferences.setMockInitialValues({
      'cryma_cart_items_guest': jsonEncode([
        {
          'id': 'product-1',
          'product_id': 'product-1',
          'cart_key': 'product-1|base',
          'name': 'Everyday Tote',
          'color': 'Rose',
          'price': 500,
          'quantity': 1,
          'stock': 3,
          'image': '',
          'seller': 'Local Seller',
          'selected': true,
        },
      ]),
    });

    await tester.pumpWidget(const MaterialApp(home: CartScreen()));
    await tester.pumpAndSettle();
    expect(find.text('Everyday Tote'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.tap(find.byTooltip('Remove selected items'));
    await tester.pumpAndSettle();
    expect(find.text('Remove selected items?'), findsOneWidget);

    await tester.tap(find.text('Keep items'));
    await tester.pumpAndSettle();
    expect(find.text('Everyday Tote'), findsOneWidget);

    await tester.tap(find.byTooltip('Remove selected items'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Remove'));
    await tester.pumpAndSettle();

    expect(find.text('Your cart is empty'), findsOneWidget);
    expect(await CartStore.instance.items(), isEmpty);
  });

  testWidgets('legacy cart seller heading opens its storefront after backfill',
      (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    SharedPreferences.setMockInitialValues({
      'cryma_cart_items_guest': jsonEncode([
        {
          'id': '13',
          'product_id': '13',
          'cart_key': '13|base',
          'name': 'Everyday tote',
          'price': 500,
          'quantity': 1,
          'stock': 3,
          'image': '',
          'seller': 'Old seller name',
          'selected': true,
        },
        {
          'id': '14',
          'product_id': '14',
          'cart_key': '14|base',
          'name': 'Handmade pouch',
          'price': 250,
          'quantity': 1,
          'stock': 3,
          'image': '',
          'seller': 'Old seller name',
          'selected': true,
        },
      ]),
    });

    final requests = <http.Request>[];
    final api = ApiService(
      baseUrl: 'https://test.cryma.store',
      client: MockClient((request) async {
        requests.add(request);
        if (request.url.path == '/api/products/13' ||
            request.url.path == '/api/products/14') {
          final productId = int.parse(request.url.path.split('/').last);
          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'id': productId,
                'seller': {
                  'id': 7,
                  'seller_profile': {
                    'business_name': 'Nora Home Store',
                    'store_slug': 'nora-home-store',
                  },
                },
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (request.url.path == '/api/products/availability') {
          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'items': [
                  {'product_id': 13, 'variant_id': null, 'stock': 3},
                  {'product_id': 14, 'variant_id': null, 'stock': 3},
                ],
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        throw StateError('Unexpected API request: ${request.url.path}');
      }),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: CartScreen(api: api),
        routes: {
          '/storefront': (_) => const Scaffold(body: Text('Nora storefront')),
        },
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Nora Home Store'), findsOneWidget);
    expect(find.text('Everyday tote'), findsOneWidget);
    expect(find.text('Handmade pouch'), findsOneWidget);
    final savedCart = await CartStore.instance.items();
    expect(savedCart, hasLength(2));
    expect(savedCart.every((item) => item['seller_id'] == '7'), isTrue);
    expect(
      savedCart.every((item) => item['store_slug'] == 'nora-home-store'),
      isTrue,
    );
    expect(
      requests.map((request) => request.url.path).toSet(),
      {
        '/api/products/13',
        '/api/products/14',
        '/api/products/availability',
      },
    );

    await tester.tap(find.text('Nora Home Store'));
    await tester.pumpAndSettle();
    expect(find.text('Nora storefront'), findsOneWidget);
  });
}

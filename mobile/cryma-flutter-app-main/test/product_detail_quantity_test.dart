import 'dart:convert';

import 'package:cryma_flutter_app/screens/catalog/products_detail_screen.dart';
import 'package:cryma_flutter_app/services/api_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => SharedPreferences.setMockInitialValues({}));

  ApiService createApi() => ApiService(
        baseUrl: 'https://qa.example.test',
        client: MockClient((request) async {
          final data = request.url.path.endsWith('/reviews')
              ? <String, dynamic>{
                  'reviews': <dynamic>[],
                  'average_rating': '0',
                  'review_count': 0,
                }
              : <String, dynamic>{
                  'id': 55,
                  'name': 'Everyday Tote',
                  'price': '150.00',
                  'stock': 5,
                  'category': 'Accessories',
                  'images': <String>[],
                  'variants': <dynamic>[],
                  'seller': {
                    'id': 9,
                    'seller_profile': {
                      'business_name': 'Nora Home Store',
                      'store_slug': 'nora-home-store',
                    },
                  },
                };
          return http.Response(
            jsonEncode({'success': true, 'data': data}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }),
      );

  Future<void> pumpProduct(WidgetTester tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        home: ProductsDetailScreen(productId: '55', apiService: createApi()),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('quantity input accepts a number and respects available stock',
      (tester) async {
    await pumpProduct(tester);

    final quantityField = find.byKey(const ValueKey('product-quantity'));
    expect(tester.widget<TextField>(quantityField).controller?.text, '1');

    await tester.enterText(quantityField, '4');
    expect(tester.widget<TextField>(quantityField).controller?.text, '4');

    await tester.enterText(quantityField, '9');
    expect(tester.widget<TextField>(quantityField).controller?.text, '5');
  });

  testWidgets('empty quantity resets to one when editing is completed',
      (tester) async {
    await pumpProduct(tester);

    final quantityField = find.byKey(const ValueKey('product-quantity'));
    await tester.enterText(quantityField, '');
    expect(tester.widget<TextField>(quantityField).controller?.text, isEmpty);

    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump();

    expect(tester.widget<TextField>(quantityField).controller?.text, '1');
  });
}

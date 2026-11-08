import 'dart:convert';

import 'package:cryma_flutter_app/screens/orders/order_details_screen.dart';
import 'package:cryma_flutter_app/services/api_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('order details presents a clear summary and item card',
      (tester) async {
    SharedPreferences.setMockInitialValues({
      'cryma_api_token': 'qa-token',
    });
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = ApiService(
      baseUrl: 'https://qa.example.test',
      client: MockClient((request) async {
        expect(request.url.path, '/api/orders/42');
        return http.Response(
          jsonEncode({
            'success': true,
            'data': {
              'id': 42,
              'status': 'pending',
              'created_at': '2026-11-08T07:42:00.000000Z',
              'payment_method': 'cash_on_delivery',
              'total_amount': '450.00',
              'delivery_address': 'Quezon City',
              'items': [
                {
                  'product_id': 7,
                  'quantity': 2,
                  'subtotal': '450.00',
                  'product': {
                    'id': 7,
                    'name': 'Everyday Tote',
                    'image': null,
                  },
                },
              ],
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: OrderDetailsScreen(orderId: '42', apiService: api),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Order Details'), findsOneWidget);
    expect(find.text('ORDER NUMBER'), findsOneWidget);
    expect(find.text('#42'), findsOneWidget);
    expect(find.text('Pending'), findsOneWidget);
    expect(find.text('Order total'), findsOneWidget);
    expect(find.text('₱450.00'), findsNWidgets(2));
    expect(find.text('Everyday Tote'), findsOneWidget);
    expect(find.text('Qty 2'), findsOneWidget);
    expect(find.text('Contact seller'), findsOneWidget);
    expect(find.text('Cancel order'), findsOneWidget);
  });
}

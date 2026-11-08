import 'dart:convert';

import 'package:cryma_flutter_app/screens/orders/my_orders_screen.dart';
import 'package:cryma_flutter_app/services/api_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => SharedPreferences.setMockInitialValues({
        'cryma_api_token': 'qa-token',
      }));

  testWidgets('orders screen shows the refreshed card hierarchy and actions',
      (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = ApiService(
      baseUrl: 'https://qa.example.test',
      client: MockClient((request) async {
        expect(request.url.path, '/api/orders');
        return http.Response(
          jsonEncode({
            'success': true,
            'data': {
              'data': [
                {
                  'id': 15,
                  'status': 'cancelled',
                  'total_amount': '400.00',
                  'created_at': '2026-11-08T07:42:00.000000Z',
                  'items': [
                    {
                      'quantity': 1,
                      'product': {
                        'id': 7,
                        'name': 'Everyday Tote',
                        'image': null,
                      },
                    },
                  ],
                },
              ],
              'current_page': 1,
              'last_page': 1,
              'total': 1,
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }),
    );

    await tester.pumpWidget(
      MaterialApp(home: MyOrdersScreen(apiService: api)),
    );
    await tester.pumpAndSettle();

    expect(find.text('My Orders'), findsOneWidget);
    expect(find.text('Track and manage your purchases'), findsOneWidget);
    expect(find.text('Order #15'), findsOneWidget);
    expect(find.text('Cancelled'), findsNWidgets(2));
    expect(find.text('Everyday Tote'), findsOneWidget);
    expect(find.text('1 item'), findsOneWidget);
    expect(find.text('₱400'), findsOneWidget);
    expect(find.text('View Order'), findsOneWidget);
  });
}

import 'dart:convert';

import 'package:cryma_flutter_app/screens/account/edit_profile_screen.dart';
import 'package:cryma_flutter_app/screens/account/my_reviews_screen.dart';
import 'package:cryma_flutter_app/screens/account/notification_screen.dart';
import 'package:cryma_flutter_app/screens/account/security_settings_screen.dart';
import 'package:cryma_flutter_app/screens/account/vouchers_screen.dart';
import 'package:cryma_flutter_app/screens/account/wishlist_screen.dart';
import 'package:cryma_flutter_app/services/api_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

Map<String, dynamic> _ordersResponse(String status) => {
      'success': true,
      'data': {
        'data': [
          {
            'id': 42,
            'status': status,
            'total_amount': '699.00',
            'created_at': '2026-11-08T07:42:00.000000Z',
            'updated_at': '2026-11-08T08:42:00.000000Z',
            'items': [
              {
                'quantity': 1,
                'product': {'name': 'Everyday Tote'},
              },
            ],
          },
        ],
        'current_page': 1,
        'last_page': 1,
        'total': 1,
      },
    };

ApiService _apiWith(
  Map<String, dynamic> response, {
  String path = '/api/orders',
}) =>
    ApiService(
      baseUrl: 'https://qa.example.test',
      client: MockClient((request) async {
        expect(request.url.path, path);
        return http.Response(
          jsonEncode(response),
          200,
          headers: {'content-type': 'application/json'},
        );
      }),
    );

Future<void> _setAuthenticatedPreferences() async {
  SharedPreferences.setMockInitialValues({
    'cryma_api_token': 'qa-token',
  });
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Order Activity uses the refreshed order summary layout',
      (tester) async {
    await _setAuthenticatedPreferences();
    final api = _apiWith(_ordersResponse('delivered'));

    await tester.pumpWidget(
      MaterialApp(home: NotificationScreen(apiService: api)),
    );
    await tester.pumpAndSettle();

    expect(find.text('Order Activity'), findsOneWidget);
    expect(find.text('Order #42'), findsOneWidget);
    expect(find.text('Everyday Tote'), findsOneWidget);
    expect(find.text('Delivered'), findsOneWidget);
  });

  testWidgets('My Reviews shows completed orders in polished review cards',
      (tester) async {
    await _setAuthenticatedPreferences();
    final api = _apiWith(_ordersResponse('completed'));

    await tester.pumpWidget(
      MaterialApp(home: MyReviewsScreen(apiService: api)),
    );
    await tester.pumpAndSettle();

    expect(find.text('My Reviews'), findsOneWidget);
    expect(find.text('Everyday Tote'), findsOneWidget);
    expect(find.text('Order #42 · ₱699'), findsOneWidget);
  });

  testWidgets('Vouchers shows claimed offers in the refreshed card style',
      (tester) async {
    await _setAuthenticatedPreferences();
    final api = _apiWith(
      {
        'success': true,
        'data': [
          {
            'id': 3,
            'code': 'SAVE20',
            'discount_type': 'percentage',
            'discount_value': '20',
            'scope': 'product',
            'buyer_status': 'claimed',
            'is_claimed': true,
          },
        ],
      },
      path: '/api/buyer/vouchers',
    );

    await tester.pumpWidget(
      MaterialApp(home: VouchersScreen(apiService: api)),
    );
    await tester.pumpAndSettle();

    expect(find.text('My Vouchers'), findsOneWidget);
    expect(find.text('Offers for you'), findsOneWidget);
    expect(find.text('YOUR VOUCHERS'), findsOneWidget);
    expect(find.text('SAVE20'), findsOneWidget);
    expect(find.text('20% off'), findsOneWidget);
    expect(find.text('Product voucher'), findsOneWidget);
    expect(find.text('In your wallet'), findsOneWidget);
  });

  testWidgets('Wishlist has a clear empty state and continue-shopping action',
      (tester) async {
    SharedPreferences.setMockInitialValues({
      'cryma_buyer_favorites': <String>[],
    });

    await tester.pumpWidget(const MaterialApp(home: WishlistScreen()));
    await tester.pumpAndSettle();

    expect(find.text('Wishlist'), findsOneWidget);
    expect(find.text('SAVED ITEMS'), findsNothing);
    expect(find.text('Your wishlist is empty'), findsOneWidget);
    expect(find.text('Continue shopping'), findsOneWidget);
  });

  testWidgets('Wishlist organizes saved products into compact item cards',
      (tester) async {
    SharedPreferences.setMockInitialValues({
      'cryma_buyer_favorites': ['7'],
    });
    final api = ApiService(
      baseUrl: 'https://qa.example.test',
      client: MockClient((request) async {
        expect(request.url.path, '/api/products/7');
        return http.Response(
          jsonEncode({
            'success': true,
            'data': {
              'id': 7,
              'name': 'Everyday Tote',
              'price': '699.00',
              'image': null,
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }),
    );

    await tester.pumpWidget(
      MaterialApp(home: WishlistScreen(apiService: api)),
    );
    await tester.pumpAndSettle();

    expect(find.text('SAVED ITEMS'), findsOneWidget);
    expect(find.text('Everyday Tote'), findsOneWidget);
    expect(find.text('View item'), findsOneWidget);
    expect(find.byTooltip('Remove from wishlist'), findsOneWidget);
  });

  testWidgets('Edit Profile groups account details with the new header',
      (tester) async {
    SharedPreferences.setMockInitialValues({
      'cryma_api_user': jsonEncode({
        'first_name': 'Ciara',
        'last_name': 'Buyer',
        'middle_name': '',
        'email': 'ciara@example.test',
        'phone': '+639171234567',
      }),
    });

    await tester.pumpWidget(const MaterialApp(home: EditProfileScreen()));
    await tester.pumpAndSettle();

    expect(find.text('Edit Profile'), findsOneWidget);
    expect(find.text('PERSONAL INFORMATION'), findsOneWidget);
    expect(find.text('FIRST NAME'), findsOneWidget);
    expect(
      find.text(
        'Your email address is linked to your account and cannot be changed here.',
      ),
      findsOneWidget,
    );
    expect(find.text('Save Changes'), findsOneWidget);
    expect(find.text('Ciara'), findsOneWidget);
  });

  testWidgets('Security Settings shows the account safety card and action',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: SecuritySettingsScreen(),
    ));

    expect(find.text('Security Settings'), findsOneWidget);
    expect(find.text('Your account security'), findsOneWidget);
    expect(find.text('Change Password'), findsOneWidget);
    expect(
      find.text(
        'You will need your current password to confirm a password change.',
      ),
      findsOneWidget,
    );
  });
}

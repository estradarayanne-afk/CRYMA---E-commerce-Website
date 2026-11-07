import 'dart:convert';

import 'package:cryma_flutter_app/screens/account/logout_confirmation_dialog.dart';
import 'package:cryma_flutter_app/widgets/buyer_auth_guard.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('guest action offers sign-in and account creation',
      (tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => requireBuyerSignIn(
                context,
                title: 'Sign in to add to cart',
                message: 'Sign in to shop on CRYMA.',
              ),
              child: const Text('Add to cart'),
            ),
          ),
        ),
        routes: {
          '/login': (_) => const Scaffold(body: Text('Login destination')),
          '/register_personal': (_) =>
              const Scaffold(body: Text('Create-account destination')),
        },
      ),
    );

    await tester.tap(find.text('Add to cart'));
    await tester.pumpAndSettle();

    expect(find.text('Sign in to add to cart'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('Create account'), findsOneWidget);

    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();
    expect(find.text('Login destination'), findsOneWidget);
  });

  testWidgets('guest navigation to a protected screen prompts before access',
      (tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(
      MaterialApp(
        initialRoute: '/home',
        routes: {
          '/home': (context) => Scaffold(
                body: TextButton(
                  onPressed: () => Navigator.pushNamed(context, '/protected'),
                  child: const Text('Open protected screen'),
                ),
              ),
          '/protected': (_) => const BuyerAuthGuard(
                title: 'Sign in to view your orders',
                child: Scaffold(body: Text('Private orders')),
              ),
          '/login': (_) => const Scaffold(body: Text('Login destination')),
          '/register_personal': (_) =>
              const Scaffold(body: Text('Create-account destination')),
        },
      ),
    );

    await tester.tap(find.text('Open protected screen'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Sign in to view your orders'), findsOneWidget);
    expect(find.text('Private orders'), findsNothing);

    await tester.tap(find.text('Not now'));
    await tester.pumpAndSettle();
    expect(find.text('Open protected screen'), findsOneWidget);
  });

  testWidgets('buyer session can open a protected screen without a prompt',
      (tester) async {
    SharedPreferences.setMockInitialValues({
      'cryma_api_token': 'test-token',
      'cryma_api_user': jsonEncode({'id': 8, 'role': 'buyer'}),
    });

    await tester.pumpWidget(
      const MaterialApp(
        home: BuyerAuthGuard(
          child: Scaffold(body: Text('Private orders')),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Private orders'), findsOneWidget);
    expect(find.byType(AlertDialog), findsNothing);
  });

  testWidgets('logout confirmation is a dialog over the account screen',
      (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          backgroundColor: Colors.white,
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () => showDialog<void>(
                context: context,
                builder: (_) => const LogoutConfirmationDialog(),
              ),
              child: const Text('Account page'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Account page'));
    await tester.pumpAndSettle();

    expect(find.text('Logout?'), findsOneWidget);
    expect(find.byType(Dialog), findsOneWidget);
    expect(find.text('Account page'), findsOneWidget);
    expect(
      tester.widget<Scaffold>(find.byType(Scaffold).first).backgroundColor,
      Colors.white,
    );
  });
}

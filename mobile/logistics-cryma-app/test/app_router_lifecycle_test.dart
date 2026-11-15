import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:logistics_cryma_app/main.dart';
import 'package:logistics_cryma_app/providers/auth_provider.dart';
import 'package:logistics_cryma_app/widgets/cryma_widgets.dart';
import 'package:provider/provider.dart';

class _TestAuthProvider extends AuthProvider {
  @override
  bool get isLoggedIn => true;

  void notifyAuthChanged() => notifyListeners();
}

void main() {
  testWidgets('auth updates do not reset the current account route',
      (tester) async {
    final auth = _TestAuthProvider();
    final router = GoRouter(
      initialLocation: '/rider',
      refreshListenable: auth,
      routes: [
        GoRoute(
          path: '/rider',
          builder: (context, __) => Scaffold(
            body: const Text('Rider home'),
            bottomNavigationBar: AppBottomNav(
              currentIndex: 0,
              items: _navItems,
              routes: _navRoutes,
              onNavigate: context.go,
            ),
          ),
        ),
        GoRoute(
          path: '/rider/account',
          builder: (context, __) => Scaffold(
            body: const Text('Account details and sign out'),
            bottomNavigationBar: AppBottomNav(
              currentIndex: 2,
              items: _navItems,
              routes: _navRoutes,
              onNavigate: context.go,
            ),
          ),
        ),
      ],
    );
    addTearDown(router.dispose);

    await tester.pumpWidget(
      ChangeNotifierProvider<AuthProvider>.value(
        value: auth,
        child: CrymaApp(router: router),
      ),
    );
    expect(find.text('Rider home'), findsOneWidget);

    await tester.tap(find.text('Account').last);
    await tester.pumpAndSettle();
    expect(find.text('Account details and sign out'), findsOneWidget);

    auth.notifyAuthChanged();
    await tester.pumpAndSettle();

    expect(find.text('Account details and sign out'), findsOneWidget);
  });
}

const _navItems = [
  BottomNavigationBarItem(icon: Icon(Icons.home_outlined), label: 'Home'),
  BottomNavigationBarItem(
    icon: Icon(Icons.inventory_2_outlined),
    label: 'Parcels',
  ),
  BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Account'),
];

const _navRoutes = ['/rider', '/rider/parcels', '/rider/account'];

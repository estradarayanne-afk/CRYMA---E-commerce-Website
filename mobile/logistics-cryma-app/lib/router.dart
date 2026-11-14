import 'package:go_router/go_router.dart';
import 'models/courier_parcel.dart';
import 'providers/auth_provider.dart';
import 'screens/auth/welcome_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/rider/rider_account_screen.dart';
import 'screens/rider/rider_dashboard_screen.dart';
import 'screens/rider/rider_parcel_detail_screen.dart';
import 'screens/rider/rider_parcels_screen.dart';

GoRouter createRouter(AuthProvider auth) => GoRouter(
      initialLocation: '/welcome',
      redirect: (context, state) {
        final loggedIn = auth.isLoggedIn;
        final path = state.matchedLocation;
        final onAuth = path == '/welcome' ||
            path.startsWith('/login') ||
            path.startsWith('/register');

        if (!loggedIn && !onAuth) return '/welcome';
        if (loggedIn && onAuth) {
          return '/rider';
        }
        return null;
      },
      refreshListenable: auth,
      routes: [
        GoRoute(path: '/welcome', pageBuilder: (_, __) => const NoTransitionPage(child: WelcomeScreen())),
        GoRoute(path: '/login', pageBuilder: (_, __) => const NoTransitionPage(child: LoginScreen())),
        GoRoute(path: '/register', pageBuilder: (_, __) => const NoTransitionPage(child: RegisterScreen())),

        GoRoute(path: '/rider', pageBuilder: (_, __) => const NoTransitionPage(child: RiderDashboardScreen())),
        GoRoute(path: '/rider/parcels', pageBuilder: (_, __) => const NoTransitionPage(child: RiderParcelsScreen())),
        GoRoute(
          path: '/rider/parcels/:kind/:id',
          pageBuilder: (_, state) => NoTransitionPage(
            child: RiderParcelDetailScreen(
              type: state.pathParameters['kind'] == 'pickups'
                  ? CourierTaskType.pickup
                  : CourierTaskType.delivery,
              id: int.tryParse(state.pathParameters['id'] ?? '') ?? 0,
            ),
          ),
        ),
        GoRoute(path: '/rider/account', pageBuilder: (_, __) => const NoTransitionPage(child: RiderAccountScreen())),
      ],
    );

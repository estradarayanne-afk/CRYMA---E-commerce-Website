import 'package:flutter/material.dart';
import '../config/app_config.dart';
import '../screens/auth/login_screen.dart';
import '../screens/main_navigation_screen.dart';
import '../screens/orders/order_detail_screen.dart';

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CRYMA Logistics',
      theme: AppConfig.appTheme(),
      home: const LoginScreen(),
      routes: {
        '/login': (context) => const LoginScreen(),
        '/home': (context) => const MainNavigationScreen(),
      },
      onGenerateRoute: (settings) {
        if (settings.name == '/order-detail') {
          final args = settings.arguments as String?;
          return MaterialPageRoute(
            builder: (context) => OrderDetailScreen(
              orderId: args ?? 'unknown',
            ),
          );
        }
        return null;
      },
    );
  }
}

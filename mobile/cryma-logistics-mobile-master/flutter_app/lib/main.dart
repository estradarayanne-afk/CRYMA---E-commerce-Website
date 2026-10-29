import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'app/app.dart';
import 'config/app_config.dart';
import 'providers/auth_provider.dart';
import 'providers/user_provider.dart';
import 'providers/address_provider.dart';
import 'providers/order_provider.dart';
import 'services/api_client.dart';
import 'services/auth_service.dart';
import 'services/address_service.dart';
import 'services/order_service.dart';
import 'services/token_storage.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyAppWithProviders());
}

class MyAppWithProviders extends StatelessWidget {
  const MyAppWithProviders({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Initialize services
    final tokenStorage = TokenStorage();
    final apiClient = ApiClient(
      baseUrl: AppConfig.apiBaseUrl,
      timeout: AppConfig.defaultTimeout,
      tokenStorage: tokenStorage,
    );
    final authService = AuthService(
      apiClient: apiClient,
      tokenStorage: tokenStorage,
    );
    final addressService = AddressService();
    final orderService = OrderService(apiClient: apiClient);

    return MultiProvider(
      providers: [
        // Auth
        ChangeNotifierProvider(
          create: (_) => AuthProvider(authService: authService),
        ),
        // User
        ChangeNotifierProvider(
          create: (_) => UserProvider(authService: authService),
        ),
        // Address
        ChangeNotifierProvider(
          create: (_) => AddressProvider(addressService: addressService),
        ),
        // Orders
        ChangeNotifierProvider(
          create: (_) => OrderProvider(orderService: orderService),
        ),
      ],
      child: const MyApp(),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'router.dart';
import 'theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final auth = AuthProvider();
  await auth.tryAutoLogin();
  final router = createRouter(auth);
  runApp(
    ChangeNotifierProvider.value(
      value: auth,
      child: CrymaApp(router: router),
    ),
  );
}

class CrymaApp extends StatelessWidget {
  const CrymaApp({required this.router, super.key});

  final GoRouter router;

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'CRYMA Logistics',
      debugShowCheckedModeBanner: false,
      theme: CrymaTheme.theme,
      routerConfig: router,
    );
  }
}

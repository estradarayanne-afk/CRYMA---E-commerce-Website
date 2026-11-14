import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'router.dart';
import 'theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final auth = AuthProvider();
  await auth.tryAutoLogin();
  runApp(
    ChangeNotifierProvider.value(
      value: auth,
      child: const CrymaApp(),
    ),
  );
}

class CrymaApp extends StatelessWidget {
  const CrymaApp({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final router = createRouter(auth);

    return MaterialApp.router(
      title: 'CRYMA Logistics',
      debugShowCheckedModeBanner: false,
      theme: CrymaTheme.theme,
      routerConfig: router,
    );
  }
}

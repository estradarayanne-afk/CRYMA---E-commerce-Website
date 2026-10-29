import 'package:flutter/material.dart';
import 'navigation/app_router.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CRYMA',
      theme: ThemeData(
        primaryColor: const Color(0xFF0F5A59),
        scaffoldBackgroundColor: const Color(0xFFF5F6F8),
        fontFamily: 'Poppins',
      ),
      debugShowCheckedModeBanner: false,
      initialRoute: '/',
      onGenerateRoute: AppRouter.generateRoute,
    );
  }
}
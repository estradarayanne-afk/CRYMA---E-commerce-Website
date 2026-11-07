import 'package:flutter/material.dart';

import 'navigation/app_router.dart';
import 'theme/app_theme.dart';
import 'utils/colors.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CRYMA',
      theme: AppTheme.light,
      debugShowCheckedModeBanner: false,
      builder: (context, child) => DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.background, AppColors.surfaceNeutral],
          ),
        ),
        child: child ?? const SizedBox.shrink(),
      ),
      initialRoute: '/',
      onGenerateRoute: AppRouter.generateRoute,
    );
  }
}

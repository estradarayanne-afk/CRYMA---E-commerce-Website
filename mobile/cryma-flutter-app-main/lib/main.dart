import 'package:flutter/material.dart';

import 'navigation/app_router.dart';
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
      theme: ThemeData(
        colorScheme: const ColorScheme.light(
          primary: AppColors.primary,
          onPrimary: AppColors.white,
          secondary: AppColors.primaryDark,
          onSecondary: AppColors.white,
          surface: AppColors.white,
          onSurface: AppColors.darkGray,
          error: AppColors.danger,
          onError: AppColors.white,
        ),
        primaryColor: AppColors.primary,
        scaffoldBackgroundColor: AppColors.background,
        fontFamily: 'Poppins',
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.white,
          foregroundColor: AppColors.primary,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: AppColors.white,
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          focusedBorder: OutlineInputBorder(
            borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
            borderRadius: BorderRadius.circular(10),
          ),
          enabledBorder: OutlineInputBorder(
            borderSide: const BorderSide(color: AppColors.lightGray),
            borderRadius: BorderRadius.circular(10),
          ),
          labelStyle: const TextStyle(color: AppColors.textSecondary),
          hintStyle: const TextStyle(color: AppColors.gray),
        ),
        cardTheme: CardThemeData(
          color: AppColors.white,
          surfaceTintColor: Colors.transparent,
          elevation: 1,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
        dialogTheme: const DialogThemeData(
          backgroundColor: AppColors.white,
          surfaceTintColor: Colors.transparent,
          titleTextStyle: TextStyle(
            color: AppColors.wine,
            fontFamily: 'Poppins',
            fontWeight: FontWeight.w600,
            fontSize: 20,
          ),
        ),
        snackBarTheme: const SnackBarThemeData(
          backgroundColor: AppColors.wine,
          contentTextStyle: TextStyle(color: AppColors.white),
          behavior: SnackBarBehavior.floating,
        ),
        dividerColor: AppColors.lightGray,
        iconTheme: const IconThemeData(color: AppColors.primary),
      ),
      debugShowCheckedModeBanner: false,
      initialRoute: '/',
      onGenerateRoute: AppRouter.generateRoute,
    );
  }
}

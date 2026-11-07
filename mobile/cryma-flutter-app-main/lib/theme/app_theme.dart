import 'package:flutter/material.dart';

import '../utils/colors.dart';

class AppTheme {
  const AppTheme._();

  static ThemeData get light => ThemeData(
        useMaterial3: true,
        colorScheme: const ColorScheme.light(
          primary: AppColors.primary,
          onPrimary: AppColors.white,
          primaryContainer: AppColors.softRose,
          onPrimaryContainer: AppColors.primaryDark,
          secondary: AppColors.primaryDark,
          onSecondary: AppColors.white,
          secondaryContainer: AppColors.floralPink,
          onSecondaryContainer: AppColors.primaryDark,
          surface: AppColors.surface,
          onSurface: AppColors.darkGray,
          error: AppColors.danger,
          onError: AppColors.white,
          outline: AppColors.borderStrong,
        ),
        primaryColor: AppColors.primary,
        scaffoldBackgroundColor: AppColors.background,
        fontFamily: 'Poppins',
        textTheme: const TextTheme(
          displayLarge: TextStyle(
            color: AppColors.darkGray,
            fontSize: 32,
            fontWeight: FontWeight.w700,
            height: 1.15,
          ),
          headlineMedium: TextStyle(
            color: AppColors.darkGray,
            fontSize: 24,
            fontWeight: FontWeight.w600,
            height: 1.2,
          ),
          titleLarge: TextStyle(
            color: AppColors.darkGray,
            fontSize: 20,
            fontWeight: FontWeight.w600,
            height: 1.25,
          ),
          titleMedium: TextStyle(
            color: AppColors.darkGray,
            fontSize: 16,
            fontWeight: FontWeight.w600,
            height: 1.3,
          ),
          bodyLarge: TextStyle(
            color: AppColors.darkGray,
            fontSize: 16,
            height: 1.5,
          ),
          bodyMedium: TextStyle(
            color: AppColors.textSecondary,
            fontSize: 14,
            height: 1.45,
          ),
          bodySmall: TextStyle(
            color: AppColors.gray,
            fontSize: 12,
            height: 1.4,
          ),
          labelLarge: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.surface,
          foregroundColor: AppColors.darkGray,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          centerTitle: false,
          titleTextStyle: TextStyle(
            color: AppColors.darkGray,
            fontFamily: 'Poppins',
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: AppColors.white,
            disabledBackgroundColor: AppColors.borderNeutral,
            disabledForegroundColor: AppColors.gray,
            minimumSize: const Size(48, 48),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            textStyle: const TextStyle(
              fontFamily: 'Poppins',
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: AppColors.white,
            minimumSize: const Size(48, 48),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            textStyle: const TextStyle(
              fontFamily: 'Poppins',
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.primaryDark,
            minimumSize: const Size(48, 48),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
            side: const BorderSide(color: AppColors.borderStrong),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            textStyle: const TextStyle(
              fontFamily: 'Poppins',
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: AppColors.primary,
            minimumSize: const Size(44, 44),
            textStyle: const TextStyle(
              fontFamily: 'Poppins',
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.surface,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.borderNeutral),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.borderNeutral),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.danger),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.danger, width: 1.5),
          ),
          labelStyle: const TextStyle(color: AppColors.textSecondary),
          hintStyle: const TextStyle(color: AppColors.textSubtle),
        ),
        cardTheme: CardThemeData(
          color: AppColors.surface,
          surfaceTintColor: Colors.transparent,
          elevation: 1,
          shadowColor: AppColors.wine.withValues(alpha: 0.05),
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: const BorderSide(color: AppColors.borderNeutral),
          ),
        ),
        dialogTheme: DialogThemeData(
          backgroundColor: AppColors.surface,
          surfaceTintColor: Colors.transparent,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
          titleTextStyle: const TextStyle(
            color: AppColors.darkGray,
            fontFamily: 'Poppins',
            fontWeight: FontWeight.w600,
            fontSize: 20,
          ),
          contentTextStyle: const TextStyle(
            color: AppColors.textSecondary,
            fontFamily: 'Poppins',
            fontSize: 14,
            height: 1.5,
          ),
        ),
        snackBarTheme: const SnackBarThemeData(
          backgroundColor: AppColors.wine,
          contentTextStyle: TextStyle(
            color: AppColors.white,
            fontFamily: 'Poppins',
            fontSize: 14,
          ),
          behavior: SnackBarBehavior.floating,
          insetPadding: EdgeInsets.fromLTRB(16, 0, 16, 16),
        ),
        navigationBarTheme: const NavigationBarThemeData(
          height: 68,
          backgroundColor: AppColors.surface,
          surfaceTintColor: Colors.transparent,
          indicatorColor: AppColors.softRose,
          elevation: 0,
          labelTextStyle: WidgetStatePropertyAll(
            TextStyle(fontFamily: 'Poppins', fontSize: 11),
          ),
        ),
        checkboxTheme: CheckboxThemeData(
          fillColor: WidgetStateProperty.resolveWith((states) =>
              states.contains(WidgetState.selected)
                  ? AppColors.primary
                  : AppColors.surface),
          side: const BorderSide(color: Color(0xFFB0B0B0), width: 1.5),
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(5)),
          ),
        ),
        dividerTheme: const DividerThemeData(
          color: AppColors.borderNeutral,
          thickness: 1,
          space: 1,
        ),
        progressIndicatorTheme: const ProgressIndicatorThemeData(
          color: AppColors.primary,
          linearTrackColor: AppColors.softRose,
          circularTrackColor: AppColors.softRose,
        ),
        floatingActionButtonTheme: const FloatingActionButtonThemeData(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.white,
          elevation: 2,
        ),
        dividerColor: AppColors.borderNeutral,
        iconTheme: const IconThemeData(color: AppColors.primary),
      );
}

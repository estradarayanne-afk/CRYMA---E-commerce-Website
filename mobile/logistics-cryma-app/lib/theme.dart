import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// ── CRYMA Color Tokens ──────────────────────────────────────────────────────
class CrymaColors {
  CrymaColors._();

  // Primary burgundy palette
  static const primary = Color(0xFFA7193D);
  static const primaryDark = Color(0xFF7D1632);
  static const primaryLight = Color(0xFFC52A4B);
  static const palePink = Color(0xFFF4DDE3);
  static const veryLightPink = Color(0xFFFAF1F3);
  static const primarySurface = Color(0xFFF4DDE3); // alias for palePink

  // Backgrounds
  static const background = Color(0xFFFCFAFA);
  static const surface = Color(0xFFFFFFFF);
  static const inputFill = Color(0xFFEAF1FC);
  static const divider = Color(0xFFD9D9D9);

  // Text
  static const textPrimary = Color(0xFF111111);
  static const textSecondary = Color(0xFF777777);
  static const textHint = Color(0xFF9A9A9A);

  // Status colors — restrained to work with burgundy theme
  static const statusPending = Color(0xFFD97706);
  static const statusPendingSurface = Color(0xFFFEF3C7);
  static const statusInTransit = Color(0xFF2563EB);
  static const statusInTransitSurface = Color(0xFFDBEAFE);
  static const statusAtSorting = Color(0xFF7C3AED);
  static const statusAtSortingSurface = Color(0xFFEDE9FE);
  static const statusOutForDelivery = Color(0xFF0891B2);
  static const statusOutForDeliverySurface = Color(0xFFCFFAFE);
  static const statusDelivered = Color(0xFF16A34A);
  static const statusDeliveredSurface = Color(0xFFDCFCE7);

  // Semantic
  static const error = Color(0xFFDC2626);
  static const errorSurface = Color(0xFFFEE2E2);
  static const success = Color(0xFF16A34A);
  static const successSurface = Color(0xFFDCFCE7);
  static const warning = Color(0xFFD97706);
  static const warningSurface = Color(0xFFFEF3C7);

  // Warning notice accent (burgundy-tinted)
  static const warningNotice = Color(0xFFA7193D);
  static const warningNoticeSurface = Color(0xFFF4DDE3);
}

// ── CRYMA Text Styles ────────────────────────────────────────────────────────
class CrymaText {
  CrymaText._();

  static const displayLarge = TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    color: CrymaColors.textPrimary,
    letterSpacing: -0.5,
  );

  static const headingLarge = TextStyle(
    fontSize: 22,
    fontWeight: FontWeight.w700,
    color: CrymaColors.textPrimary,
    letterSpacing: -0.3,
  );

  static const headingMedium = TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.w600,
    color: CrymaColors.textPrimary,
  );

  static const headingSmall = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w600,
    color: CrymaColors.textPrimary,
  );

  static const bodyLarge = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w400,
    color: CrymaColors.textPrimary,
  );

  static const bodyMedium = TextStyle(
    fontSize: 13,
    fontWeight: FontWeight.w400,
    color: CrymaColors.textSecondary,
  );

  static const labelLarge = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w600,
    color: Colors.white,
    letterSpacing: 0.2,
  );

  static const caption = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: CrymaColors.textSecondary,
  );
}

// ── CRYMA ThemeData ──────────────────────────────────────────────────────────
class CrymaTheme {
  CrymaTheme._();

  static ThemeData get theme {
    final base = ColorScheme.fromSeed(
      seedColor: CrymaColors.primary,
      primary: CrymaColors.primary,
      onPrimary: Colors.white,
      secondary: CrymaColors.primaryLight,
      surface: CrymaColors.surface,
      onSurface: CrymaColors.textPrimary,
      error: CrymaColors.error,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: base,
      scaffoldBackgroundColor: CrymaColors.background,
      fontFamily: null,

      appBarTheme: const AppBarTheme(
        backgroundColor: CrymaColors.surface,
        foregroundColor: CrymaColors.textPrimary,
        elevation: 0,
        scrolledUnderElevation: 1,
        shadowColor: CrymaColors.divider,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w600,
          color: CrymaColors.textPrimary,
        ),
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.dark,
        ),
      ),

      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: CrymaColors.surface,
        selectedItemColor: CrymaColors.primary,
        unselectedItemColor: CrymaColors.textHint,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
        unselectedLabelStyle: TextStyle(fontSize: 11),
      ),

      cardTheme: const CardThemeData(
        color: CrymaColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(16)),
          side: BorderSide(color: CrymaColors.divider),
        ),
        margin: EdgeInsets.zero,
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: CrymaColors.inputFill,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: CrymaColors.divider),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: CrymaColors.divider),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: CrymaColors.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: CrymaColors.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: CrymaColors.error, width: 1.5),
        ),
        labelStyle: const TextStyle(color: CrymaColors.textSecondary, fontSize: 14),
        hintStyle: const TextStyle(color: CrymaColors.textHint, fontSize: 14),
        prefixIconColor: CrymaColors.textSecondary,
        suffixIconColor: CrymaColors.textSecondary,
      ),

      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: CrymaColors.primary,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: CrymaText.labelLarge,
          elevation: 0,
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: CrymaColors.primary,
          side: const BorderSide(color: CrymaColors.primary),
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: CrymaColors.primary,
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ),

      chipTheme: ChipThemeData(
        backgroundColor: CrymaColors.background,
        selectedColor: CrymaColors.palePink,
        labelStyle: const TextStyle(fontSize: 13, color: CrymaColors.textSecondary),
        secondaryLabelStyle: const TextStyle(fontSize: 13, color: CrymaColors.primary, fontWeight: FontWeight.w600),
        side: const BorderSide(color: CrymaColors.divider),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        padding: const EdgeInsets.symmetric(horizontal: 4),
      ),

      dividerTheme: const DividerThemeData(
        color: CrymaColors.divider,
        thickness: 1,
        space: 1,
      ),

      listTileTheme: const ListTileThemeData(
        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      ),

      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        backgroundColor: CrymaColors.textPrimary,
        contentTextStyle: const TextStyle(color: Colors.white, fontSize: 14),
      ),
    );
  }
}

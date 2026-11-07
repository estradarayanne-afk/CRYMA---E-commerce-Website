import 'package:cryma_flutter_app/theme/app_theme.dart';
import 'package:cryma_flutter_app/utils/colors.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('buyer theme uses the CRYMA brand palette and Poppins', () {
    final theme = AppTheme.light;

    expect(theme.colorScheme.primary, AppColors.primary);
    expect(theme.colorScheme.primaryContainer, AppColors.softRose);
    expect(theme.scaffoldBackgroundColor, AppColors.background);
    expect(theme.useMaterial3, isTrue);
    expect(theme.textTheme.titleLarge?.fontSize, 20);
  });

  test('buyer theme standardizes controls and rounded surfaces', () {
    final theme = AppTheme.light;

    expect(theme.cardTheme.shape, isA<RoundedRectangleBorder>());
    expect(theme.inputDecorationTheme.filled, isTrue);
    expect(theme.navigationBarTheme.height, 68);
    expect(theme.snackBarTheme.behavior, SnackBarBehavior.floating);
  });
}

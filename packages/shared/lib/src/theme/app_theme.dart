import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';

/// `ThemeData` compartilhado pelos 3 apps, portado de
/// `legacy/tailwind.config.js` + `legacy/src/index.css`.
///
/// Único tema (o app legado não tem modo claro — "Dark Industrial" é o
/// tema padrão). Fontes: Bebas Neue (display/títulos) e DM Sans (corpo),
/// mesmas do `--font-display` / `--font-body` do CSS.
class AppTheme {
  AppTheme._();

  static ThemeData get dark {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.dark(
        surface: AppColors.background,
        onSurface: AppColors.foreground,
        primary: AppColors.primary,
        onPrimary: AppColors.primaryForeground,
        secondary: AppColors.secondary,
        onSecondary: AppColors.secondaryForeground,
        error: AppColors.destructive,
        onError: AppColors.destructiveForeground,
        surfaceContainerHighest: AppColors.muted,
        onSurfaceVariant: AppColors.mutedForeground,
        outline: AppColors.border,
      ),
      scaffoldBackgroundColor: AppColors.background,
      cardColor: AppColors.card,
      dividerColor: AppColors.border,
    );

    final bodyTextTheme = GoogleFonts.dmSansTextTheme(base.textTheme).apply(
      bodyColor: AppColors.foreground,
      displayColor: AppColors.foreground,
    );

    final displayFont = GoogleFonts.bebasNeue();

    return base.copyWith(
      textTheme: bodyTextTheme.copyWith(
        displayLarge: bodyTextTheme.displayLarge?.merge(displayFont),
        displayMedium: bodyTextTheme.displayMedium?.merge(displayFont),
        displaySmall: bodyTextTheme.displaySmall?.merge(displayFont),
        headlineLarge: bodyTextTheme.headlineLarge?.merge(displayFont),
        headlineMedium: bodyTextTheme.headlineMedium?.merge(displayFont),
        headlineSmall: bodyTextTheme.headlineSmall?.merge(displayFont),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.foreground,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: AppColors.card,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppColors.radius),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.input,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.radius),
          borderSide: BorderSide(color: AppColors.border),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.primaryForeground,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppColors.radius),
          ),
        ),
      ),
    );
  }
}

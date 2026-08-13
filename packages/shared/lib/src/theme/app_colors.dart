import 'package:flutter/material.dart';

/// Paleta "Dark Industrial — Electric Amber", portada de
/// `legacy/src/index.css` (`:root`). Valores HSL convertidos 1:1.
class AppColors {
  AppColors._();

  static Color _hsl(double h, double s, double l) =>
      HSLColor.fromAHSL(1, h, s / 100, l / 100).toColor();

  static final background = _hsl(222, 22, 7);
  static final foreground = _hsl(46, 18, 93);
  static final card = _hsl(222, 20, 11);
  static final cardForeground = foreground;
  static final popover = _hsl(222, 20, 11);
  static final popoverForeground = foreground;
  static final primary = _hsl(45, 96, 53);
  static final primaryForeground = background;
  static final secondary = _hsl(222, 14, 17);
  static final secondaryForeground = _hsl(46, 12, 82);
  static final muted = _hsl(222, 14, 14);
  static final mutedForeground = _hsl(222, 8, 50);
  static final accent = _hsl(222, 14, 18);
  static final accentForeground = _hsl(46, 12, 88);
  static final destructive = _hsl(4, 84, 58);
  static final destructiveForeground = _hsl(0, 0, 98);
  static final border = _hsl(222, 14, 20);
  static final input = _hsl(222, 14, 17);
  static final ring = _hsl(45, 96, 53);

  static final chart1 = _hsl(45, 96, 53);
  static final chart2 = _hsl(200, 65, 50);
  static final chart3 = _hsl(152, 60, 42);
  static final chart4 = _hsl(280, 60, 55);
  static final chart5 = _hsl(24, 90, 55);

  static const radius = 8.0; // --radius: 0.5rem
}

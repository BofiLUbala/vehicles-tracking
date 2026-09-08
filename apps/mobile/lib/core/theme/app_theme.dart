import 'package:flutter/material.dart';

/// Thème de l'application chauffeur.
///
/// Contraintes du cahier des charges (section 19) : gros boutons, textes
/// lisibles, peu de saisies. On privilégie donc de grandes cibles tactiles
/// et des tailles de police généreuses, utilisables en extérieur / plein
/// soleil et avec des gants.
class AppTheme {
  AppTheme._();

  static const Color primary = Color(0xFF0B6E4F);
  static const Color danger = Color(0xFFB3261E);
  static const Color warning = Color(0xFFB26A00);
  static const Color success = Color(0xFF1E7B3C);
  static const Color neutralBg = Color(0xFFF5F6F5);

  static ThemeData light() {
    final base = ThemeData(
      useMaterial3: true,
      colorSchemeSeed: primary,
      brightness: Brightness.light,
      scaffoldBackgroundColor: neutralBg,
    );

    return base.copyWith(
      textTheme: base.textTheme.apply(fontSizeFactor: 1.05),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size.fromHeight(64),
          textStyle: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(64),
          textStyle: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 20, vertical: 22),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
      ),
      appBarTheme: const AppBarTheme(
        centerTitle: true,
        elevation: 0,
        backgroundColor: neutralBg,
        foregroundColor: Colors.black87,
      ),
    );
  }
}

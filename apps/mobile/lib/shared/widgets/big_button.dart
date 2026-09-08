import 'package:flutter/material.dart';

/// Gros bouton d'action principal, avec état de chargement intégré.
///
/// Respecte la contrainte "gros boutons, textes lisibles" du cahier des
/// charges : cible tactile haute, texte large.
class BigButton extends StatelessWidget {
  const BigButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.icon,
    this.variant = BigButtonVariant.primary,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final IconData? icon;
  final BigButtonVariant variant;

  @override
  Widget build(BuildContext context) {
    final child = isLoading
        ? const SizedBox(
            height: 26,
            width: 26,
            child: CircularProgressIndicator(strokeWidth: 3),
          )
        : Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 26),
                const SizedBox(width: 10),
              ],
              Text(label),
            ],
          );

    final effectiveOnPressed = isLoading ? null : onPressed;

    switch (variant) {
      case BigButtonVariant.primary:
        return ElevatedButton(
          onPressed: effectiveOnPressed,
          child: child,
        );
      case BigButtonVariant.secondary:
        return OutlinedButton(
          onPressed: effectiveOnPressed,
          child: child,
        );
      case BigButtonVariant.danger:
        return ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFB3261E),
            foregroundColor: Colors.white,
          ),
          onPressed: effectiveOnPressed,
          child: child,
        );
    }
  }
}

enum BigButtonVariant { primary, secondary, danger }

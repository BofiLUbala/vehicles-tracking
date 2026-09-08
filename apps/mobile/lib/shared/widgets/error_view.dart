import 'package:flutter/material.dart';

import 'big_button.dart';

/// Affichage plein écran (ou en section) d'une erreur, avec un bouton
/// "Réessayer" optionnel — messages toujours en français, clairs et
/// actionnables.
class ErrorView extends StatelessWidget {
  const ErrorView({
    super.key,
    required this.message,
    this.onRetry,
  });

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 24),
              BigButton(label: 'Réessayer', onPressed: onRetry),
            ],
          ],
        ),
      ),
    );
  }
}

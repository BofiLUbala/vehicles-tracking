import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Petite pastille de statut (mission ou étape), texte en français.
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.status});

  final String status;

  /// Traduit un code de statut technique (venant de l'API) en libellé
  /// français lisible, avec une couleur associée.
  static ({String label, Color color}) describe(String status) {
    switch (status.toUpperCase()) {
      case 'PENDING':
      case 'PLANNED':
        return (label: 'À venir', color: Colors.grey.shade700);
      case 'IN_PROGRESS':
      case 'STARTED':
        return (label: 'En cours', color: AppTheme.warning);
      case 'COMPLETED':
      case 'DONE':
      case 'VALIDATED':
        return (label: 'Terminée', color: AppTheme.success);
      case 'LATE':
      case 'DELAYED':
        return (label: 'En retard', color: AppTheme.danger);
      case 'CANCELLED':
      case 'CANCELED':
        return (label: 'Annulée', color: Colors.grey.shade600);
      case 'FAILED':
      case 'REJECTED':
        return (label: 'Échec', color: AppTheme.danger);
      default:
        return (label: status, color: Colors.grey.shade700);
    }
  }

  @override
  Widget build(BuildContext context) {
    final info = describe(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: info.color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: info.color.withOpacity(0.4)),
      ),
      child: Text(
        info.label,
        style: TextStyle(
          color: info.color,
          fontWeight: FontWeight.w600,
          fontSize: 14,
        ),
      ),
    );
  }
}

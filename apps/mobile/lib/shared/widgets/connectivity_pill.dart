import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/connectivity/connectivity_provider.dart';
import '../../core/theme/app_theme.dart';

/// Pastille "En ligne" / "Hors ligne" affichée dans les en-têtes d'écran.
///
/// En Phase 2, l'application suppose une connexion active pour parler à
/// l'API ; cet indicateur reste une brique d'interface prête à recevoir
/// le vrai statut de synchronisation en Phase 3 (file d'attente locale).
class ConnectivityPill extends ConsumerWidget {
  const ConnectivityPill({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOnline = ref.watch(isOnlineProvider);
    final color = isOnline ? AppTheme.success : AppTheme.danger;
    final label = isOnline ? 'En ligne' : 'Hors ligne';
    final icon = isOnline ? Icons.wifi : Icons.wifi_off;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}

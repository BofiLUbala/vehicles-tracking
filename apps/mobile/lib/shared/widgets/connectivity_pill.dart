import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/connectivity/connectivity_provider.dart';
import '../../core/sync/sync_providers.dart';
import '../../core/theme/app_theme.dart';

/// Pastille affichée dans les en-têtes d'écran : statut réseau, et — s'il y
/// a des données locales pas encore confirmées par le serveur — le nombre
/// d'éléments en attente de synchronisation. Tape dessus ouvre l'écran
/// "Synchronisations en attente".
class ConnectivityPill extends ConsumerWidget {
  const ConnectivityPill({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOnline = ref.watch(isOnlineProvider);
    final pendingCount = ref.watch(totalPendingSyncCountProvider);

    final hasPending = pendingCount > 0;
    final color = !isOnline
        ? AppTheme.danger
        : hasPending
            ? AppTheme.warning
            : AppTheme.success;
    final label = !isOnline
        ? 'Hors ligne'
        : hasPending
            ? '$pendingCount en attente'
            : 'En ligne';
    final icon = !isOnline
        ? Icons.wifi_off
        : hasPending
            ? Icons.sync
            : Icons.wifi;

    return InkWell(
      borderRadius: BorderRadius.circular(999),
      onTap: () => context.push('/sync'),
      child: Container(
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
      ),
    );
  }
}

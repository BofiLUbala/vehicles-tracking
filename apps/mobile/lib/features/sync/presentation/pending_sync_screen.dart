import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/sync/sync_providers.dart';
import '../../../core/sync/sync_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/big_button.dart';
import '../../fuel/application/fuel_flow_notifier.dart';
import '../../qr/application/qr_flow_notifier.dart';
import '../../tracking/application/tracking_providers.dart';

/// Écran "Synchronisations en attente" — nombre réel de positions GPS et de
/// validations d'étape pas encore confirmées par le serveur, avec un
/// bouton pour forcer une synchronisation immédiate (ignore le backoff).
class PendingSyncScreen extends ConsumerStatefulWidget {
  const PendingSyncScreen({super.key});

  @override
  ConsumerState<PendingSyncScreen> createState() => _PendingSyncScreenState();
}

class _PendingSyncScreenState extends ConsumerState<PendingSyncScreen> {
  bool _syncing = false;

  Future<void> _syncNow() async {
    setState(() => _syncing = true);
    try {
      await ref.read(syncServiceProvider).syncNow(force: true);
    } finally {
      if (mounted) setState(() => _syncing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final gpsPending = ref.watch(pendingGpsCountProvider).valueOrNull ?? 0;
    final gpsFailed = ref.watch(gpsFailedCountProvider).valueOrNull ?? 0;
    final validationsPending =
        ref.watch(pendingValidationsCountProvider).valueOrNull ?? 0;
    final validationsFailed =
        ref.watch(validationsFailedCountProvider).valueOrNull ?? 0;
    final fuelPending =
        ref.watch(pendingFuelRecordsCountProvider).valueOrNull ?? 0;
    final fuelFailed =
        ref.watch(fuelRecordsFailedCountProvider).valueOrNull ?? 0;

    final total = gpsPending + validationsPending + fuelPending;

    return Scaffold(
      appBar: AppBar(title: const Text('Synchronisations en attente')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _SummaryCard(
                total: total,
                hasFailed: gpsFailed + validationsFailed > 0,
              ),
              const SizedBox(height: 16),
              _QueueTile(
                icon: Icons.gps_fixed,
                label: 'Positions GPS',
                pendingCount: gpsPending,
                failedCount: gpsFailed,
              ),
              const SizedBox(height: 12),
              _QueueTile(
                icon: Icons.fact_check_outlined,
                label: "Validations d'étape",
                pendingCount: validationsPending,
                failedCount: validationsFailed,
              ),
              const SizedBox(height: 12),
              _QueueTile(
                icon: Icons.local_gas_station_outlined,
                label: 'Déclarations de plein',
                pendingCount: fuelPending,
                failedCount: fuelFailed,
              ),
              const Spacer(),
              Text(
                total == 0
                    ? 'Tout est synchronisé.'
                    : "Les envois échoués sont retentés automatiquement "
                        "(jusqu'à ${SyncService.maxAutoRetries} essais) dès "
                        "que la connexion revient. Rien n'est jamais perdu.",
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 16),
              BigButton(
                label: 'Synchroniser maintenant',
                icon: Icons.sync,
                isLoading: _syncing,
                onPressed: total == 0 ? null : _syncNow,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.total, required this.hasFailed});

  final int total;
  final bool hasFailed;

  @override
  Widget build(BuildContext context) {
    final color = total == 0
        ? AppTheme.success
        : hasFailed
            ? AppTheme.danger
            : AppTheme.warning;
    final icon = total == 0
        ? Icons.check_circle_outline
        : hasFailed
            ? Icons.error_outline
            : Icons.cloud_upload_outlined;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 40),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              total == 0
                  ? 'Toutes les données sont synchronisées.'
                  : '$total élément(s) en attente d\'envoi.',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(color: color, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}

class _QueueTile extends StatelessWidget {
  const _QueueTile({
    required this.icon,
    required this.label,
    required this.pendingCount,
    required this.failedCount,
  });

  final IconData icon;
  final String label;
  final int pendingCount;
  final int failedCount;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: Icon(icon),
        title: Text(label),
        subtitle: Text(
          failedCount > 0
              ? '$pendingCount en attente, dont $failedCount en échec (retenté automatiquement)'
              : '$pendingCount en attente',
        ),
        trailing: pendingCount == 0
            ? const Icon(Icons.check, color: AppTheme.success)
            : null,
      ),
    );
  }
}

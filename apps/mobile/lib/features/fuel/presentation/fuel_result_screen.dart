import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/big_button.dart';
import '../application/fuel_error_messages.dart';
import '../application/fuel_flow_notifier.dart';
import '../application/fuel_flow_state.dart';

/// Écran 12 — Résultat de la déclaration de plein : succès, mise en attente
/// hors ligne, ou échec avec la raison précise en français.
class FuelResultScreen extends ConsumerWidget {
  const FuelResultScreen({super.key, required this.vehicleId});

  final String vehicleId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(fuelFlowProvider(vehicleId));

    if (state.step != FuelFlowStep.result || state.result == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final result = state.result!;
    final isSuccess = result.success;
    final isQueued = result.queued;
    final message = isSuccess
        ? 'Le plein a été déclaré avec succès.'
        : isQueued
            ? "Pas de réseau : la déclaration a été enregistrée sur l'appareil "
                "et sera envoyée automatiquement dès que la connexion revient."
            : frenchMessageForFuelErrorCode(result.errorCode, result.rawMessage);

    return Scaffold(
      appBar: AppBar(title: const Text('Résultat')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                isSuccess
                    ? Icons.check_circle
                    : isQueued
                        ? Icons.cloud_off
                        : Icons.cancel,
                color: isSuccess
                    ? AppTheme.success
                    : isQueued
                        ? AppTheme.primary
                        : AppTheme.danger,
                size: 96,
              ),
              const SizedBox(height: 24),
              Text(
                isSuccess
                    ? 'Plein déclaré'
                    : isQueued
                        ? 'En attente de synchronisation'
                        : 'Échec de la déclaration',
                style: Theme.of(context).textTheme.headlineSmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                message,
                style: Theme.of(context).textTheme.bodyLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 40),
              if (isSuccess || isQueued)
                BigButton(
                  label: 'Retour aux missions',
                  onPressed: () => context.go('/missions'),
                )
              else ...[
                BigButton(
                  label: 'Réessayer',
                  onPressed: () {
                    ref.read(fuelFlowProvider(vehicleId).notifier).restart();
                    context.go('/fuel');
                  },
                ),
                const SizedBox(height: 12),
                BigButton(
                  label: 'Retour aux missions',
                  variant: BigButtonVariant.secondary,
                  onPressed: () => context.go('/missions'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/big_button.dart';
import '../application/error_code_messages.dart';
import '../application/qr_flow_notifier.dart';
import '../application/qr_flow_state.dart';

/// Écran 11 — Résultat de validation : succès ou échec avec la raison
/// précise en français (ex. "Vous êtes trop loin du point", "QR code
/// invalide", "Photo manquante").
class ValidationResultScreen extends ConsumerWidget {
  const ValidationResultScreen({
    super.key,
    required this.missionId,
    required this.stepId,
  });

  final String missionId;
  final String stepId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final args = (missionId: missionId, stepId: stepId);
    final state = ref.watch(qrFlowProvider(args));

    if (state.step != QrFlowStep.result || state.result == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final result = state.result!;
    final isSuccess = result.success;
    final isQueued = result.queued;
    final message = isSuccess
        ? 'Étape validée avec succès.'
        : isQueued
            ? "Pas de réseau : la validation a été enregistrée sur l'appareil "
                "et sera envoyée automatiquement dès que la connexion revient."
            : frenchMessageForErrorCode(result.errorCode, result.rawMessage);

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
                    ? 'Validation réussie'
                    : isQueued
                        ? 'En attente de synchronisation'
                        : 'Validation refusée',
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
                  label: 'Retour à la mission',
                  onPressed: () =>
                      context.go('/missions/$missionId/progress'),
                )
              else ...[
                BigButton(
                  label: 'Réessayer',
                  onPressed: () {
                    ref.read(qrFlowProvider(args).notifier).restart();
                    context.go(
                      '/missions/$missionId/steps/$stepId/scan',
                    );
                  },
                ),
                const SizedBox(height: 12),
                BigButton(
                  label: 'Retour à la mission',
                  variant: BigButtonVariant.secondary,
                  onPressed: () =>
                      context.go('/missions/$missionId/progress'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

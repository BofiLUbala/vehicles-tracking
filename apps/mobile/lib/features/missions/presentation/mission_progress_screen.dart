import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/big_button.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_view.dart';
import '../application/missions_providers.dart';
import '../data/models/mission.dart';
import '../data/models/mission_step.dart';

/// Écran 8 — Progression de la mission : étape courante mise en avant,
/// étapes restantes listées en dessous.
class MissionProgressScreen extends ConsumerWidget {
  const MissionProgressScreen({super.key, required this.missionId});

  final String missionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final missionAsync = ref.watch(missionDetailProvider(missionId));

    return Scaffold(
      appBar: AppBar(title: const Text('Progression de la mission')),
      body: missionAsync.when(
        loading: () => const LoadingView(),
        error: (error, _) => ErrorView(
          message: error.toString(),
          onRetry: () => ref.invalidate(missionDetailProvider(missionId)),
        ),
        data: (mission) => _ProgressBody(mission: mission),
      ),
    );
  }
}

class _ProgressBody extends StatelessWidget {
  const _ProgressBody({required this.mission});

  final Mission mission;

  @override
  Widget build(BuildContext context) {
    final current = mission.currentStep;

    if (current == null) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Toutes les étapes de cette mission sont terminées. Bravo !',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 20),
          ),
        ),
      );
    }

    final remaining = mission.steps
        .where((s) => !s.isCompleted && s.id != current.id)
        .toList();

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Étape en cours',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          _CurrentStepCard(step: current),
          const SizedBox(height: 16),
          BigButton(
            label: 'Scanner le QR code',
            icon: Icons.qr_code_scanner,
            onPressed: () =>
                context.push('/missions/${mission.id}/steps/${current.id}/scan'),
          ),
          const SizedBox(height: 24),
          if (remaining.isNotEmpty) ...[
            Text(
              'Étapes suivantes',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Expanded(
              child: ListView.separated(
                itemCount: remaining.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final step = remaining[index];
                  return Card(
                    child: ListTile(
                      leading: CircleAvatar(child: Text('${step.order}')),
                      title: Text(step.location.name),
                      subtitle: Text(step.actionType),
                    ),
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _CurrentStepCard extends StatelessWidget {
  const _CurrentStepCard({required this.step});

  final MissionStep step;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3), width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.location_on, color: AppTheme.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  step.location.name,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text('Étape n°${step.order} — ${step.actionType}'),
        ],
      ),
    );
  }
}

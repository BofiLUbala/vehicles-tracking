import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../shared/widgets/big_button.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_view.dart';
import '../../../shared/widgets/status_badge.dart';
import '../application/missions_providers.dart';
import '../data/models/mission.dart';
import '../data/models/mission_step.dart';

/// Écran 6 — Détail d'une mission : étapes ordonnées et leur statut.
/// Contient aussi l'action "Démarrer la mission" (écran 7 — confirmation).
class MissionDetailScreen extends ConsumerWidget {
  const MissionDetailScreen({super.key, required this.missionId});

  final String missionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final missionAsync = ref.watch(missionDetailProvider(missionId));

    return Scaffold(
      appBar: AppBar(title: const Text('Détail de la mission')),
      body: missionAsync.when(
        loading: () => const LoadingView(),
        error: (error, _) => ErrorView(
          message: error.toString(),
          onRetry: () => ref.invalidate(missionDetailProvider(missionId)),
        ),
        data: (mission) => _MissionDetailBody(mission: mission),
      ),
    );
  }
}

class _MissionDetailBody extends ConsumerStatefulWidget {
  const _MissionDetailBody({required this.mission});

  final Mission mission;

  @override
  ConsumerState<_MissionDetailBody> createState() =>
      _MissionDetailBodyState();
}

class _MissionDetailBodyState extends ConsumerState<_MissionDetailBody> {
  bool _starting = false;
  String? _error;

  bool get _isPending => widget.mission.status.toUpperCase() == 'PENDING' ||
      widget.mission.status.toUpperCase() == 'PLANNED';

  Future<void> _confirmAndStart() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Démarrer la mission ?'),
        content: const Text(
          'Vous confirmez être prêt à démarrer cette mission maintenant.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Démarrer'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() {
      _starting = true;
      _error = null;
    });
    try {
      await ref.read(startMissionActionProvider)(widget.mission.id);
      if (mounted) {
        context.go('/missions/${widget.mission.id}/progress');
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _starting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final mission = widget.mission;
    final timeFormat = DateFormat('HH:mm');

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Mission ${mission.id.substring(0, mission.id.length.clamp(0, 8))}',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  StatusBadge(status: mission.status),
                ],
              ),
              const SizedBox(height: 24),
              Text('Étapes', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              ...mission.steps.map(
                (step) => _StepTile(step: step, timeFormat: timeFormat),
              ),
            ],
          ),
        ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(_error!, style: const TextStyle(color: Colors.red)),
          ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: _isPending
              ? BigButton(
                  label: 'Démarrer la mission',
                  isLoading: _starting,
                  onPressed: _confirmAndStart,
                )
              : BigButton(
                  label: 'Voir la progression',
                  onPressed: () =>
                      context.go('/missions/${mission.id}/progress'),
                ),
        ),
      ],
    );
  }
}

class _StepTile extends StatelessWidget {
  const _StepTile({required this.step, required this.timeFormat});

  final MissionStep step;
  final DateFormat timeFormat;

  static String _actionLabel(String actionType) {
    switch (actionType.toUpperCase()) {
      case 'PICKUP':
      case 'COLLECTE':
        return 'Collecte';
      case 'DROPOFF':
      case 'DEPOT':
        return 'Dépôt';
      default:
        return actionType;
    }
  }

  @override
  Widget build(BuildContext context) {
    final plannedAt = step.plannedAt;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: CircleAvatar(child: Text('${step.order}')),
        title: Text('${_actionLabel(step.actionType)} — ${step.location.name}'),
        subtitle: Text(
          plannedAt != null
              ? 'Prévu à ${timeFormat.format(plannedAt.toLocal())}'
              : 'Heure non précisée',
        ),
        trailing: StatusBadge(status: step.status),
      ),
    );
  }
}

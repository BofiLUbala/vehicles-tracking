import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_view.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../missions/application/missions_providers.dart';
import '../../missions/data/models/mission.dart';

/// Écran "Historique" — missions du jour déjà terminées.
///
/// Il n'existe pas encore d'endpoint `GET /mobile/missions/history` côté
/// API (hors périmètre Phase 3, voir docs/PHASE3_NOTES.md) : en attendant,
/// cet écran filtre les missions "terminées" parmi celles du jour déjà
/// chargées (`todayMissionsProvider`), ce qui reste correct et utile sans
/// dupliquer de logique réseau. Un vrai historique multi-jours est un
/// follow-up Phase 4.
class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final missionsAsync = ref.watch(todayMissionsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Historique')),
      body: missionsAsync.when(
        loading: () => const LoadingView(message: "Chargement de l'historique…"),
        error: (error, _) => ErrorView(
          message: error.toString(),
          onRetry: () => ref.invalidate(todayMissionsProvider),
        ),
        data: (missions) {
          final completed = missions
              .where((m) =>
                  m.status.toUpperCase() == 'COMPLETED' ||
                  m.status.toUpperCase() == 'DONE')
              .toList();

          if (completed.isEmpty) {
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(todayMissionsProvider),
              child: ListView(
                children: const [
                  SizedBox(height: 120),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 32),
                    child: Text(
                      "Aucune mission terminée aujourd'hui pour le moment.\n"
                      "L'historique complet des jours précédents arrivera "
                      "dans une prochaine mise à jour.",
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(todayMissionsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: completed.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) =>
                  _HistoryCard(mission: completed[index]),
            ),
          );
        },
      ),
    );
  }
}

class _HistoryCard extends StatelessWidget {
  const _HistoryCard({required this.mission});

  final Mission mission;

  @override
  Widget build(BuildContext context) {
    final timeFormat = DateFormat('dd/MM HH:mm');
    final end = mission.plannedEnd != null
        ? timeFormat.format(mission.plannedEnd!.toLocal())
        : '--';

    return Card(
      child: ListTile(
        title: Text(
          'Mission ${mission.id.substring(0, mission.id.length.clamp(0, 8))}',
        ),
        subtitle: Text(
          '${mission.completedStepsCount}/${mission.steps.length} étapes — terminée $end',
        ),
        trailing: StatusBadge(status: mission.status),
      ),
    );
  }
}

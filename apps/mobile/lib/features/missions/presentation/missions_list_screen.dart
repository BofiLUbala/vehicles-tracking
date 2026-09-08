import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../shared/widgets/connectivity_pill.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_view.dart';
import '../../../shared/widgets/status_badge.dart';
import '../application/missions_providers.dart';
import '../data/models/mission.dart';

/// Écran 5 — Missions du jour : liste, tirer-pour-rafraîchir, badges de
/// statut.
class MissionsListScreen extends ConsumerWidget {
  const MissionsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final missionsAsync = ref.watch(todayMissionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes missions du jour'),
        actions: [
          const Padding(
            padding: EdgeInsets.only(right: 8),
            child: Center(child: ConnectivityPill()),
          ),
          IconButton(
            icon: const Icon(Icons.local_gas_station_outlined),
            tooltip: 'Déclarer un plein',
            onPressed: () => context.push('/fuel'),
          ),
          IconButton(
            icon: const Icon(Icons.history),
            tooltip: 'Historique',
            onPressed: () => context.push('/history'),
          ),
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => context.push('/profile'),
          ),
        ],
      ),
      body: missionsAsync.when(
        loading: () => const LoadingView(message: 'Chargement des missions…'),
        error: (error, _) => ErrorView(
          message: error.toString(),
          onRetry: () => ref.invalidate(todayMissionsProvider),
        ),
        data: (missions) {
          if (missions.isEmpty) {
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(todayMissionsProvider),
              child: ListView(
                children: const [
                  SizedBox(height: 120),
                  Center(child: Text("Aucune mission prévue aujourd'hui.")),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(todayMissionsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: missions.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) =>
                  _MissionCard(mission: missions[index]),
            ),
          );
        },
      ),
    );
  }
}

class _MissionCard extends StatelessWidget {
  const _MissionCard({required this.mission});

  final Mission mission;

  @override
  Widget build(BuildContext context) {
    final timeFormat = DateFormat('HH:mm');
    final start = mission.plannedStart != null
        ? timeFormat.format(mission.plannedStart!.toLocal())
        : '--:--';
    final end = mission.plannedEnd != null
        ? timeFormat.format(mission.plannedEnd!.toLocal())
        : '--:--';

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => context.push('/missions/${mission.id}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
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
              const SizedBox(height: 8),
              Text('$start — $end'),
              const SizedBox(height: 4),
              Text(
                '${mission.completedStepsCount}/${mission.steps.length} étapes terminées',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

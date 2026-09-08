import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers/core_providers.dart';
import '../data/missions_repository.dart';
import '../data/models/mission.dart';

final missionsRepositoryProvider = Provider<MissionsRepository>((ref) {
  return ApiMissionsRepository(dio: ref.watch(dioProvider));
});

/// Liste des missions du jour. `ref.invalidate(todayMissionsProvider)` sert
/// de "pull-to-refresh".
final todayMissionsProvider = FutureProvider.autoDispose<List<Mission>>((
  ref,
) {
  return ref.watch(missionsRepositoryProvider).fetchTodayMissions();
});

/// Détail d'une mission (utilisé pour l'écran de détail et de progression).
final missionDetailProvider =
    FutureProvider.autoDispose.family<Mission, String>((ref, missionId) {
  return ref.watch(missionsRepositoryProvider).fetchMissionDetail(missionId);
});

/// Démarre une mission puis invalide les caches concernés.
final startMissionActionProvider =
    Provider.autoDispose<Future<Mission> Function(String)>((ref) {
  return (String missionId) async {
    final mission =
        await ref.read(missionsRepositoryProvider).startMission(missionId);
    ref.invalidate(todayMissionsProvider);
    ref.invalidate(missionDetailProvider(missionId));
    return mission;
  };
});

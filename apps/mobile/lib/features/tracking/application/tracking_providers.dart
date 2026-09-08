import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/database_provider.dart';
import '../../missions/application/missions_providers.dart';
import '../../missions/data/models/mission.dart';
import '../data/gps_queue_repository.dart';
import '../data/location_tracking_service.dart';

final gpsQueueRepositoryProvider = Provider<GpsQueueRepository>((ref) {
  return GpsQueueRepository(database: ref.watch(appDatabaseProvider));
});

/// Instance unique du service de suivi GPS pour toute la durée de vie de
/// l'app (pas `autoDispose` : le flux doit survivre à la navigation entre
/// écrans tant qu'une mission reste active).
final locationTrackingServiceProvider = Provider<LocationTrackingService>((
  ref,
) {
  final service = LocationTrackingService(
    queueRepository: ref.watch(gpsQueueRepositoryProvider),
  );
  ref.onDispose(service.stop);
  return service;
});

/// Nombre de positions GPS en attente de synchronisation (pending/failed).
final pendingGpsCountProvider = StreamProvider<int>((ref) {
  return ref.watch(gpsQueueRepositoryProvider).watchPendingCount();
});

/// Nombre de positions GPS `failed` (essais automatiques épuisés).
final gpsFailedCountProvider = StreamProvider<int>((ref) {
  return ref.watch(gpsQueueRepositoryProvider).watchFailedCount();
});

/// À observer depuis l'écran de progression de mission : démarre le suivi
/// GPS quand la mission passe STARTED/IN_PROGRESS, l'arrête sinon (mission
/// terminée/annulée) ou quand l'écran est quitté (`autoDispose`).
final missionTrackingControllerProvider = Provider.autoDispose
    .family<void, String>((ref, missionId) {
  final service = ref.watch(locationTrackingServiceProvider);

  ref.listen<AsyncValue<Mission>>(missionDetailProvider(missionId), (
    previous,
    next,
  ) {
    final mission = next.valueOrNull;
    if (mission == null) return;
    if (mission.isTrackable && mission.vehicleId != null) {
      service.start(vehicleId: mission.vehicleId!, missionId: mission.id);
    } else {
      service.stop();
    }
  }, fireImmediately: true);

  ref.onDispose(service.stop);
});

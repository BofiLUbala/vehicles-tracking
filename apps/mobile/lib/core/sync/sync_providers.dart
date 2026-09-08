import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/qr/application/qr_flow_notifier.dart';
import '../../features/tracking/application/tracking_providers.dart';
import '../../features/tracking/data/tracking_repository.dart';
import '../database/database_provider.dart';
import '../providers/core_providers.dart';
import 'sync_service.dart';

final trackingRepositoryProvider = Provider<TrackingRepository>((ref) {
  return TrackingRepository(dio: ref.watch(dioProvider));
});

/// Instance unique pour toute la durée de vie de l'app — voir
/// `SyncBootstrap` (`main.dart`) pour l'appel à `init()` au démarrage.
final syncServiceProvider = Provider<SyncService>((ref) {
  final service = SyncService(
    database: ref.watch(appDatabaseProvider),
    gpsQueueRepository: ref.watch(gpsQueueRepositoryProvider),
    validationQueueRepository: ref.watch(validationQueueRepositoryProvider),
    trackingRepository: ref.watch(trackingRepositoryProvider),
    validationRepository: ref.watch(validationRepositoryProvider),
  );
  ref.onDispose(service.dispose);
  return service;
});

/// Nombre total de positions GPS + validations d'étape encore en attente de
/// synchronisation (`pending`/`failed`/`uploading` compte comme "en cours",
/// non compté ici — seuls pending/failed sont "en attente" au sens usager).
final totalPendingSyncCountProvider = Provider<int>((ref) {
  final gps = ref.watch(pendingGpsCountProvider).valueOrNull ?? 0;
  final validations = ref.watch(pendingValidationsCountProvider).valueOrNull ?? 0;
  return gps + validations;
});

final failedSyncCountProvider = Provider<int>((ref) {
  final gps = ref.watch(gpsFailedCountProvider).valueOrNull ?? 0;
  final validations = ref.watch(validationsFailedCountProvider).valueOrNull ?? 0;
  return gps + validations;
});

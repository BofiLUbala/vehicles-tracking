import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../../../core/database/app_database.dart';

/// Écrit les positions relevées pendant une mission active dans la file
/// d'attente locale ([PendingGpsPositions]). N'appelle jamais l'API : seule
/// la couche de synchronisation (`SyncService`) parle au réseau (section 13
/// du cahier des charges — le flux GPS ne doit jamais bloquer sur le
/// réseau).
class GpsQueueRepository {
  GpsQueueRepository({required AppDatabase database}) : _db = database;

  final AppDatabase _db;
  final _uuid = const Uuid();

  Future<void> enqueue({
    required String vehicleId,
    String? missionId,
    required double latitude,
    required double longitude,
    double? accuracy,
    double? altitude,
    double? speed,
    double? heading,
    required bool isMocked,
    required DateTime recordedAt,
  }) {
    return _db.into(_db.pendingGpsPositions).insert(
          PendingGpsPositionsCompanion.insert(
            clientEventId: _uuid.v4(),
            vehicleId: vehicleId,
            missionId: Value(missionId),
            latitude: latitude,
            longitude: longitude,
            accuracy: Value(accuracy),
            altitude: Value(altitude),
            speed: Value(speed),
            heading: Value(heading),
            isMocked: Value(isMocked),
            recordedAt: recordedAt,
          ),
        );
  }

  /// Nombre de positions encore `pending`/`failed` (non confirmées par le
  /// serveur) — utilisé par la pastille de connectivité et l'écran de
  /// synchronisation.
  Stream<int> watchPendingCount() {
    final query = _db.selectOnly(_db.pendingGpsPositions)
      ..addColumns([_db.pendingGpsPositions.id.count()])
      ..where(
        _db.pendingGpsPositions.syncStatus.equalsValue(SyncStatus.pending) |
            _db.pendingGpsPositions.syncStatus.equalsValue(SyncStatus.failed),
      );
    return query.map((row) => row.read(_db.pendingGpsPositions.id.count()) ?? 0)
        .watchSingle();
  }

  /// Nombre de positions `failed` ayant épuisé leurs essais automatiques —
  /// affiché distinctement sur l'écran de synchronisation.
  Stream<int> watchFailedCount() {
    final query = _db.selectOnly(_db.pendingGpsPositions)
      ..addColumns([_db.pendingGpsPositions.id.count()])
      ..where(_db.pendingGpsPositions.syncStatus.equalsValue(SyncStatus.failed));
    return query
        .map((row) => row.read(_db.pendingGpsPositions.id.count()) ?? 0)
        .watchSingle();
  }

  /// Lot de positions prêtes à être envoyées : `pending`/`failed`, et
  /// respectant le backoff (`nextRetryAt`) sauf en synchronisation forcée
  /// (bouton manuel). Triées par [PendingGpsPositions.recordedAt] croissant.
  Future<List<PendingGpsPosition>> nextBatch({
    required int limit,
    required bool force,
    required int maxAutoRetries,
  }) {
    final now = DateTime.now();
    final query = _db.select(_db.pendingGpsPositions)
      ..where((t) {
        var predicate = t.syncStatus.equalsValue(SyncStatus.pending) |
            t.syncStatus.equalsValue(SyncStatus.failed);
        if (!force) {
          predicate = predicate & t.retryCount.isSmallerThanValue(maxAutoRetries);
          predicate = predicate &
              (t.nextRetryAt.isNull() | t.nextRetryAt.isSmallerOrEqualValue(now));
        }
        return predicate;
      })
      ..orderBy([(t) => OrderingTerm.asc(t.recordedAt)])
      ..limit(limit);
    return query.get();
  }

  Future<void> markUploading(List<int> ids) {
    return _db.batch((batch) {
      for (final id in ids) {
        batch.update(
          _db.pendingGpsPositions,
          const PendingGpsPositionsCompanion(
            syncStatus: Value(SyncStatus.uploading),
          ),
          where: (t) => t.id.equals(id),
        );
      }
    });
  }

  Future<void> markSynced(List<int> ids) {
    return _db.batch((batch) {
      for (final id in ids) {
        batch.update(
          _db.pendingGpsPositions,
          const PendingGpsPositionsCompanion(
            syncStatus: Value(SyncStatus.synced),
            lastError: Value(null),
            nextRetryAt: Value(null),
          ),
          where: (t) => t.id.equals(id),
        );
      }
    });
  }

  /// Marque une position en échec, incrémente `retryCount` et calcule le
  /// prochain essai autorisé avec un backoff exponentiel plafonné.
  Future<void> markFailed({
    required int id,
    required int previousRetryCount,
    String? error,
  }) {
    final retryCount = previousRetryCount + 1;
    return (_db.update(_db.pendingGpsPositions)..where((t) => t.id.equals(id)))
        .write(
      PendingGpsPositionsCompanion(
        syncStatus: const Value(SyncStatus.failed),
        retryCount: Value(retryCount),
        lastError: Value(error),
        nextRetryAt: Value(_nextRetryAt(retryCount)),
      ),
    );
  }

  /// Au démarrage de l'app : toute ligne restée `uploading` (process tué en
  /// plein envoi) est remise `pending` sans perte de données ni incrément
  /// de compteur d'essais.
  Future<void> resetStaleUploading() {
    return (_db.update(_db.pendingGpsPositions)
          ..where((t) => t.syncStatus.equalsValue(SyncStatus.uploading)))
        .write(
      const PendingGpsPositionsCompanion(syncStatus: Value(SyncStatus.pending)),
    );
  }
}

/// Backoff exponentiel : 5s, 10s, 20s, 40s... plafonné à 5 minutes.
DateTime _nextRetryAt(int retryCount) {
  final seconds = (5 * (1 << retryCount.clamp(0, 10))).clamp(5, 300);
  return DateTime.now().add(Duration(seconds: seconds));
}

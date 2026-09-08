import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../../../core/database/app_database.dart';

/// File d'attente locale des déclarations de plein ([PendingFuelRecords]) —
/// alimentée par `FuelFlowNotifier` quand une tentative de soumission échoue
/// pour une raison réseau (pas de connexion), rejouée une par une par
/// `SyncService` via [FuelRepository] — même pattern que
/// `ValidationQueueRepository` (`lib/features/qr/data/validation_queue_repository.dart`).
class FuelQueueRepository {
  FuelQueueRepository({required AppDatabase database}) : _db = database;

  final AppDatabase _db;
  final _uuid = const Uuid();

  /// Met une déclaration en attente et renvoie le `clientEventId` généré,
  /// afin qu'un futur envoi (immédiat ou différé) soit reconnu comme le même
  /// événement côté serveur.
  Future<String> enqueue({
    required String vehicleId,
    required double liters,
    required double totalCost,
    required double odometer,
    required String fuelType,
    String? stationName,
    required double latitude,
    required double longitude,
    required DateTime recordedAt,
    required String receiptPhotoPath,
    required String odometerPhotoPath,
  }) async {
    final clientEventId = _uuid.v4();
    await _db.into(_db.pendingFuelRecords).insert(
          PendingFuelRecordsCompanion.insert(
            clientEventId: clientEventId,
            vehicleId: vehicleId,
            liters: liters,
            totalCost: totalCost,
            odometer: odometer,
            fuelType: fuelType,
            stationName: Value(stationName),
            latitude: latitude,
            longitude: longitude,
            recordedAt: recordedAt,
            receiptPhotoPath: receiptPhotoPath,
            odometerPhotoPath: odometerPhotoPath,
          ),
        );
    return clientEventId;
  }

  /// Nombre de déclarations encore `pending`/`failed` — utilisé par l'écran
  /// de synchronisation.
  Stream<int> watchPendingCount() {
    final query = _db.selectOnly(_db.pendingFuelRecords)
      ..addColumns([_db.pendingFuelRecords.id.count()])
      ..where(
        _db.pendingFuelRecords.syncStatus.equalsValue(SyncStatus.pending) |
            _db.pendingFuelRecords.syncStatus.equalsValue(SyncStatus.failed),
      );
    return query
        .map((row) => row.read(_db.pendingFuelRecords.id.count()) ?? 0)
        .watchSingle();
  }

  Stream<int> watchFailedCount() {
    final query = _db.selectOnly(_db.pendingFuelRecords)
      ..addColumns([_db.pendingFuelRecords.id.count()])
      ..where(_db.pendingFuelRecords.syncStatus.equalsValue(SyncStatus.failed));
    return query
        .map((row) => row.read(_db.pendingFuelRecords.id.count()) ?? 0)
        .watchSingle();
  }

  /// Déclarations prêtes à être envoyées — une par une (upload multipart),
  /// même règles de backoff/forçage que `ValidationQueueRepository.nextBatch`.
  Future<List<PendingFuelRecord>> nextBatch({
    required int limit,
    required bool force,
    required int maxAutoRetries,
  }) {
    final now = DateTime.now();
    final query = _db.select(_db.pendingFuelRecords)
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

  Future<void> markUploading(int id) {
    return (_db.update(_db.pendingFuelRecords)..where((t) => t.id.equals(id)))
        .write(
      const PendingFuelRecordsCompanion(
        syncStatus: Value(SyncStatus.uploading),
      ),
    );
  }

  Future<void> markSynced(int id) {
    return (_db.update(_db.pendingFuelRecords)..where((t) => t.id.equals(id)))
        .write(
      const PendingFuelRecordsCompanion(
        syncStatus: Value(SyncStatus.synced),
        lastError: Value(null),
        nextRetryAt: Value(null),
      ),
    );
  }

  Future<void> markFailed({
    required int id,
    required int previousRetryCount,
    String? error,
  }) {
    final retryCount = previousRetryCount + 1;
    return (_db.update(_db.pendingFuelRecords)..where((t) => t.id.equals(id)))
        .write(
      PendingFuelRecordsCompanion(
        syncStatus: const Value(SyncStatus.failed),
        retryCount: Value(retryCount),
        lastError: Value(error),
        nextRetryAt: Value(_nextRetryAt(retryCount)),
      ),
    );
  }

  Future<void> resetStaleUploading() {
    return (_db.update(_db.pendingFuelRecords)
          ..where((t) => t.syncStatus.equalsValue(SyncStatus.uploading)))
        .write(
      const PendingFuelRecordsCompanion(syncStatus: Value(SyncStatus.pending)),
    );
  }
}

/// Backoff exponentiel partagé avec les autres files : 5s, 10s, 20s, 40s...
/// plafonné à 5 minutes.
DateTime _nextRetryAt(int retryCount) {
  final seconds = (5 * (1 << retryCount.clamp(0, 10))).clamp(5, 300);
  return DateTime.now().add(Duration(seconds: seconds));
}

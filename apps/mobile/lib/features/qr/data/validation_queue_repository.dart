import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../../../core/database/app_database.dart';

/// File d'attente locale des validations d'étape ([PendingValidations]) —
/// alimentée par [QrFlowNotifier] quand une tentative de validation échoue
/// pour une raison réseau (pas de connexion), rejouée une par une par
/// `SyncService` via [ValidationRepository] (le même chemin d'upload qu'en
/// ligne — aucune duplication de logique multipart).
class ValidationQueueRepository {
  ValidationQueueRepository({required AppDatabase database}) : _db = database;

  final AppDatabase _db;
  final _uuid = const Uuid();

  /// Met une validation en attente et renvoie le `clientEventId` généré,
  /// afin qu'un futur envoi (immédiat ou différé) soit reconnu comme le
  /// même événement côté serveur.
  Future<String> enqueue({
    required String missionStepId,
    required String qrToken,
    required double latitude,
    required double longitude,
    double? accuracy,
    required bool isMocked,
    required DateTime recordedAt,
    required String photoPath,
  }) async {
    final clientEventId = _uuid.v4();
    await _db.into(_db.pendingValidations).insert(
          PendingValidationsCompanion.insert(
            clientEventId: clientEventId,
            missionStepId: missionStepId,
            qrToken: qrToken,
            latitude: latitude,
            longitude: longitude,
            accuracy: Value(accuracy),
            isMocked: Value(isMocked),
            recordedAt: recordedAt,
            photoPath: photoPath,
          ),
        );
    return clientEventId;
  }

  /// Nombre de validations encore `pending`/`failed` — utilisé par la
  /// pastille de connectivité et l'écran de synchronisation.
  Stream<int> watchPendingCount() {
    final query = _db.selectOnly(_db.pendingValidations)
      ..addColumns([_db.pendingValidations.id.count()])
      ..where(
        _db.pendingValidations.syncStatus.equalsValue(SyncStatus.pending) |
            _db.pendingValidations.syncStatus.equalsValue(SyncStatus.failed),
      );
    return query
        .map((row) => row.read(_db.pendingValidations.id.count()) ?? 0)
        .watchSingle();
  }

  Stream<int> watchFailedCount() {
    final query = _db.selectOnly(_db.pendingValidations)
      ..addColumns([_db.pendingValidations.id.count()])
      ..where(_db.pendingValidations.syncStatus.equalsValue(SyncStatus.failed));
    return query
        .map((row) => row.read(_db.pendingValidations.id.count()) ?? 0)
        .watchSingle();
  }

  /// Validations prêtes à être envoyées — une par une (upload multipart),
  /// même règles de backoff/forçage que [GpsQueueRepository.nextBatch].
  Future<List<PendingValidation>> nextBatch({
    required int limit,
    required bool force,
    required int maxAutoRetries,
  }) {
    final now = DateTime.now();
    final query = _db.select(_db.pendingValidations)
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
    return (_db.update(_db.pendingValidations)..where((t) => t.id.equals(id)))
        .write(
      const PendingValidationsCompanion(
        syncStatus: Value(SyncStatus.uploading),
      ),
    );
  }

  Future<void> markSynced(int id) {
    return (_db.update(_db.pendingValidations)..where((t) => t.id.equals(id)))
        .write(
      const PendingValidationsCompanion(
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
    return (_db.update(_db.pendingValidations)..where((t) => t.id.equals(id)))
        .write(
      PendingValidationsCompanion(
        syncStatus: const Value(SyncStatus.failed),
        retryCount: Value(retryCount),
        lastError: Value(error),
        nextRetryAt: Value(_nextRetryAt(retryCount)),
      ),
    );
  }

  Future<void> resetStaleUploading() {
    return (_db.update(_db.pendingValidations)
          ..where((t) => t.syncStatus.equalsValue(SyncStatus.uploading)))
        .write(
      const PendingValidationsCompanion(syncStatus: Value(SyncStatus.pending)),
    );
  }
}

/// Backoff exponentiel partagé avec [GpsQueueRepository] : 5s, 10s, 20s,
/// 40s... plafonné à 5 minutes.
DateTime _nextRetryAt(int retryCount) {
  final seconds = (5 * (1 << retryCount.clamp(0, 10))).clamp(5, 300);
  return DateTime.now().add(Duration(seconds: seconds));
}

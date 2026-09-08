import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:tracking_vehicles_mobile/core/database/app_database.dart';
import 'package:tracking_vehicles_mobile/core/sync/sync_service.dart';
import 'package:tracking_vehicles_mobile/features/qr/data/models/validation_result.dart';
import 'package:tracking_vehicles_mobile/features/qr/data/validation_queue_repository.dart';
import 'package:tracking_vehicles_mobile/features/qr/data/validation_repository.dart';
import 'package:tracking_vehicles_mobile/features/tracking/data/gps_queue_repository.dart';
import 'package:tracking_vehicles_mobile/features/tracking/data/tracking_repository.dart';

class MockTrackingRepository extends Mock implements TrackingRepository {}

class MockValidationRepository extends Mock implements ValidationRepository {}

class FakeStepValidationRequest extends Fake implements StepValidationRequest {}

/// Évite tout appel de plateforme réel (`connectivity_plus` utilise un
/// `EventChannel` indisponible dans les tests unitaires) : un flux vide
/// suffit puisque ces tests appellent `syncNow()`/`init()` directement.
class FakeConnectivity extends Fake implements Connectivity {
  @override
  Stream<List<ConnectivityResult>> get onConnectivityChanged =>
      const Stream.empty();
}

void main() {
  late AppDatabase db;
  late GpsQueueRepository gpsQueueRepository;
  late ValidationQueueRepository validationQueueRepository;
  late MockTrackingRepository trackingRepository;
  late MockValidationRepository validationRepository;
  late SyncService syncService;

  setUpAll(() {
    registerFallbackValue(<PendingGpsPosition>[]);
    registerFallbackValue(FakeStepValidationRequest());
  });

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    gpsQueueRepository = GpsQueueRepository(database: db);
    validationQueueRepository = ValidationQueueRepository(database: db);
    trackingRepository = MockTrackingRepository();
    validationRepository = MockValidationRepository();
    syncService = SyncService(
      database: db,
      gpsQueueRepository: gpsQueueRepository,
      validationQueueRepository: validationQueueRepository,
      trackingRepository: trackingRepository,
      validationRepository: validationRepository,
      connectivity: FakeConnectivity(),
    );
  });

  tearDown(() => db.close());

  Future<void> insertPosition(
    String clientEventId, {
    SyncStatus status = SyncStatus.pending,
    int retryCount = 0,
    DateTime? nextRetryAt,
  }) async {
    await db.into(db.pendingGpsPositions).insert(
          PendingGpsPositionsCompanion.insert(
            clientEventId: clientEventId,
            vehicleId: 'veh-1',
            latitude: 0,
            longitude: 0,
            recordedAt: DateTime.utc(2026, 9, 8),
            syncStatus: Value(status),
            retryCount: Value(retryCount),
            nextRetryAt: Value(nextRetryAt),
          ),
        );
  }

  Future<void> insertValidation(
    String clientEventId, {
    SyncStatus status = SyncStatus.pending,
    int retryCount = 0,
  }) async {
    await db.into(db.pendingValidations).insert(
          PendingValidationsCompanion.insert(
            clientEventId: clientEventId,
            missionStepId: 'step-1',
            qrToken: 'qr-1',
            latitude: 0,
            longitude: 0,
            recordedAt: DateTime.utc(2026, 9, 8),
            photoPath: '/tmp/p.jpg',
            syncStatus: Value(status),
            retryCount: Value(retryCount),
          ),
        );
  }

  group('GPS batching', () {
    test('created/duplicate results mark rows synced, rejected marks failed',
        () async {
      await insertPosition('a');
      await insertPosition('b');
      await insertPosition('c');

      when(() => trackingRepository.uploadPositionsBatch(any())).thenAnswer(
        (_) async => [
          const BatchPositionResult(clientEventId: 'a', status: 'created'),
          const BatchPositionResult(clientEventId: 'b', status: 'duplicate'),
          const BatchPositionResult(
            clientEventId: 'c',
            status: 'rejected',
            reason: 'Vitesse impossible',
          ),
        ],
      );
      when(() => validationRepository.validateStep(any()))
          .thenAnswer((_) async => ValidationResult.success());

      await syncService.syncNow();

      final rows = await db.select(db.pendingGpsPositions).get();
      final byId = {for (final r in rows) r.clientEventId: r};
      expect(byId['a']!.syncStatus, SyncStatus.synced);
      expect(byId['b']!.syncStatus, SyncStatus.synced);
      expect(byId['c']!.syncStatus, SyncStatus.failed);
      expect(byId['c']!.lastError, 'Vitesse impossible');
      expect(byId['c']!.retryCount, 1);
    });

    test('a full batch network failure marks every row failed with backoff, '
        'never dropped', () async {
      await insertPosition('a');
      await insertPosition('b');

      when(() => trackingRepository.uploadPositionsBatch(any()))
          .thenThrow(TrackingBatchException('Pas de réseau'));

      await syncService.syncNow();

      final rows = await db.select(db.pendingGpsPositions).get();
      expect(rows, hasLength(2));
      for (final row in rows) {
        expect(row.syncStatus, SyncStatus.failed);
        expect(row.retryCount, 1);
        expect(row.nextRetryAt != null, isTrue);
        expect(row.nextRetryAt!.isAfter(DateTime.now()), isTrue);
      }
    });

    test('rows past the retry cap are skipped by automatic sync but '
        'included when forced', () async {
      await insertPosition(
        'exhausted',
        status: SyncStatus.failed,
        retryCount: SyncService.maxAutoRetries,
      );

      when(() => trackingRepository.uploadPositionsBatch(any())).thenAnswer(
        (_) async =>
            [const BatchPositionResult(clientEventId: 'exhausted', status: 'created')],
      );

      await syncService.syncNow(); // automatic — should skip it
      verifyNever(() => trackingRepository.uploadPositionsBatch(any()));

      await syncService.syncNow(force: true); // manual — should retry it
      verify(() => trackingRepository.uploadPositionsBatch(any())).called(1);

      final row = await (db.select(db.pendingGpsPositions)
            ..where((t) => t.clientEventId.equals('exhausted')))
          .getSingle();
      expect(row.syncStatus, SyncStatus.synced);
    });

    test('a row whose nextRetryAt is in the future is skipped by automatic '
        'sync', () async {
      await insertPosition(
        'waiting',
        status: SyncStatus.failed,
        retryCount: 1,
        nextRetryAt: DateTime.now().add(const Duration(minutes: 5)),
      );

      await syncService.syncNow();
      verifyNever(() => trackingRepository.uploadPositionsBatch(any()));
    });
  });

  group('validations', () {
    test('successful validation marks the row synced', () async {
      await insertValidation('v1');
      when(() => validationRepository.validateStep(any()))
          .thenAnswer((_) async => ValidationResult.success());

      await syncService.syncNow();

      final row = await db.select(db.pendingValidations).getSingle();
      expect(row.syncStatus, SyncStatus.synced);
    });

    test('NETWORK_ERROR keeps retrying with backoff', () async {
      await insertValidation('v1');
      when(() => validationRepository.validateStep(any())).thenAnswer(
        (_) async => ValidationResult.failure(errorCode: 'NETWORK_ERROR'),
      );

      await syncService.syncNow();

      final row = await db.select(db.pendingValidations).getSingle();
      expect(row.syncStatus, SyncStatus.failed);
      expect(row.retryCount, 1);
      expect(row.nextRetryAt != null, isTrue);
    });

    test('a definitive server rejection is marked failed and not retried '
        'automatically again', () async {
      await insertValidation('v1');
      when(() => validationRepository.validateStep(any())).thenAnswer(
        (_) async => ValidationResult.failure(
          errorCode: 'QR_EXPIRED',
          message: 'QR code expiré',
        ),
      );

      await syncService.syncNow();

      final row = await db.select(db.pendingValidations).getSingle();
      expect(row.syncStatus, SyncStatus.failed);
      expect(row.lastError, 'QR code expiré');
      expect(row.retryCount, greaterThanOrEqualTo(SyncService.maxAutoRetries));

      // A second automatic pass must not call the API again for this row.
      await syncService.syncNow();
      verify(() => validationRepository.validateStep(any())).called(1);
    });

    test('the same clientEventId is reused across retries (idempotence)',
        () async {
      await insertValidation('v1');
      StepValidationRequest? captured;
      when(() => validationRepository.validateStep(any())).thenAnswer((inv) async {
        captured = inv.positionalArguments.first as StepValidationRequest;
        return ValidationResult.success();
      });

      await syncService.syncNow();
      expect(captured!.clientEventId, 'v1');
    });
  });

  group('init()', () {
    test('resets stale uploading rows back to pending without losing them',
        () async {
      await insertPosition('a', status: SyncStatus.uploading, retryCount: 2);
      await insertValidation('v1', status: SyncStatus.uploading, retryCount: 1);

      await syncService.init();
      addTearDown(syncService.dispose);

      final gpsRow = await db.select(db.pendingGpsPositions).getSingle();
      expect(gpsRow.syncStatus, SyncStatus.pending);
      expect(gpsRow.retryCount, 2); // untouched — not treated as a new failure

      final validationRow = await db.select(db.pendingValidations).getSingle();
      expect(validationRow.syncStatus, SyncStatus.pending);
      expect(validationRow.retryCount, 1);
    });
  });
}

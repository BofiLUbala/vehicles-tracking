import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tracking_vehicles_mobile/core/database/app_database.dart';

void main() {
  late AppDatabase db;

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
  });

  tearDown(() => db.close());

  group('PendingGpsPositions round-trip', () {
    test('insert then read back preserves all fields', () async {
      final recordedAt = DateTime.utc(2026, 9, 8, 10, 30, 15);
      await db.into(db.pendingGpsPositions).insert(
            PendingGpsPositionsCompanion.insert(
              clientEventId: 'evt-1',
              vehicleId: 'veh-1',
              missionId: const Value('mission-1'),
              latitude: -4.32512,
              longitude: 15.32245,
              accuracy: const Value(8.5),
              altitude: const Value(312),
              speed: const Value(28),
              heading: const Value(145),
              isMocked: const Value(false),
              recordedAt: recordedAt,
            ),
          );

      final rows = await db.select(db.pendingGpsPositions).get();
      expect(rows, hasLength(1));
      final row = rows.single;
      expect(row.clientEventId, 'evt-1');
      expect(row.vehicleId, 'veh-1');
      expect(row.missionId, 'mission-1');
      expect(row.latitude, -4.32512);
      expect(row.longitude, 15.32245);
      // Drift stores DateTime as a unix timestamp and reads it back as a
      // *local* DateTime — same instant, different `isUtc` flag, so we
      // compare instants explicitly rather than with `==`/`isAtSameMomentAs`
      // sensitivity to that flag (Dart's DateTime== also checks isUtc).
      expect(row.recordedAt.isAtSameMomentAs(recordedAt), isTrue);
      // Defaults applied by the schema.
      expect(row.syncStatus, SyncStatus.pending);
      expect(row.retryCount, 0);
      expect(row.isMocked, isFalse);
    });

    test('clientEventId is unique — a duplicate insert fails', () async {
      final companion = PendingGpsPositionsCompanion.insert(
        clientEventId: 'evt-dup',
        vehicleId: 'veh-1',
        latitude: 0,
        longitude: 0,
        recordedAt: DateTime.utc(2026, 1, 1),
      );
      await db.into(db.pendingGpsPositions).insert(companion);
      expect(
        () => db.into(db.pendingGpsPositions).insert(companion),
        throwsA(anything),
      );
    });
  });

  group('PendingValidations round-trip', () {
    test('insert then read back preserves all fields', () async {
      final recordedAt = DateTime.utc(2026, 9, 8, 11, 0, 0);
      await db.into(db.pendingValidations).insert(
            PendingValidationsCompanion.insert(
              clientEventId: 'evt-v1',
              missionStepId: 'step-1',
              qrToken: 'qr-token',
              latitude: -4.3,
              longitude: 15.3,
              accuracy: const Value(5.0),
              isMocked: const Value(false),
              recordedAt: recordedAt,
              photoPath: '/tmp/photo.jpg',
            ),
          );

      final rows = await db.select(db.pendingValidations).get();
      expect(rows, hasLength(1));
      expect(rows.single.missionStepId, 'step-1');
      expect(rows.single.photoPath, '/tmp/photo.jpg');
      expect(rows.single.syncStatus, SyncStatus.pending);
    });
  });

  test('SyncStatusConverter round-trips every enum value', () async {
    const converter = SyncStatusConverter();
    for (final status in SyncStatus.values) {
      final sql = converter.toSql(status);
      expect(converter.fromSql(sql), status);
    }
    // Unknown text falls back to pending rather than throwing.
    expect(converter.fromSql('not-a-status'), SyncStatus.pending);
  });
}

import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tracking_vehicles_mobile/core/database/app_database.dart';
import 'package:tracking_vehicles_mobile/features/fuel/data/fuel_queue_repository.dart';

/// Vérifie la mise en file d'attente locale d'une déclaration de plein
/// quand la soumission immédiate échoue faute de réseau (`FuelFlowNotifier`
/// délègue à `FuelQueueRepository.enqueue` dans ce cas — voir
/// `lib/features/fuel/application/fuel_flow_notifier.dart`).
void main() {
  late AppDatabase db;
  late FuelQueueRepository repository;

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    repository = FuelQueueRepository(database: db);
  });

  tearDown(() => db.close());

  test('enqueue inserts a pending row and returns a generated clientEventId',
      () async {
    final clientEventId = await repository.enqueue(
      vehicleId: 'veh-1',
      liters: 45.5,
      totalCost: 65000,
      odometer: 128900,
      fuelType: 'DIESEL',
      stationName: 'Total Boulevard',
      latitude: -4.3,
      longitude: 15.3,
      recordedAt: DateTime.utc(2026, 9, 8),
      receiptPhotoPath: '/tmp/receipt.jpg',
      odometerPhotoPath: '/tmp/odometer.jpg',
    );

    expect(clientEventId, isNotEmpty);

    final rows = await db.select(db.pendingFuelRecords).get();
    expect(rows, hasLength(1));
    final row = rows.single;
    expect(row.clientEventId, clientEventId);
    expect(row.vehicleId, 'veh-1');
    expect(row.syncStatus, SyncStatus.pending);
    expect(row.retryCount, 0);
  });

  test('watchPendingCount reflects pending and failed rows but not synced',
      () async {
    await repository.enqueue(
      vehicleId: 'veh-1',
      liters: 10,
      totalCost: 15000,
      odometer: 1000,
      fuelType: 'PETROL',
      latitude: 0,
      longitude: 0,
      recordedAt: DateTime.utc(2026, 1, 1),
      receiptPhotoPath: '/tmp/r1.jpg',
      odometerPhotoPath: '/tmp/o1.jpg',
    );
    final failedId = await repository.enqueue(
      vehicleId: 'veh-1',
      liters: 20,
      totalCost: 30000,
      odometer: 2000,
      fuelType: 'DIESEL',
      latitude: 0,
      longitude: 0,
      recordedAt: DateTime.utc(2026, 1, 2),
      receiptPhotoPath: '/tmp/r2.jpg',
      odometerPhotoPath: '/tmp/o2.jpg',
    );

    final rows = await db.select(db.pendingFuelRecords).get();
    final failedRow = rows.singleWhere((r) => r.clientEventId == failedId);
    await repository.markFailed(id: failedRow.id, previousRetryCount: 0);

    final synced = await db.select(db.pendingFuelRecords).get();
    final other = synced.firstWhere((r) => r.clientEventId != failedId);
    await repository.markSynced(other.id);

    expect(await repository.watchPendingCount().first, 1);
    expect(await repository.watchFailedCount().first, 1);
  });

  test('resetStaleUploading puts uploading rows back to pending', () async {
    final clientEventId = await repository.enqueue(
      vehicleId: 'veh-1',
      liters: 10,
      totalCost: 15000,
      odometer: 1000,
      fuelType: 'PETROL',
      latitude: 0,
      longitude: 0,
      recordedAt: DateTime.utc(2026, 1, 1),
      receiptPhotoPath: '/tmp/r.jpg',
      odometerPhotoPath: '/tmp/o.jpg',
    );
    final rows = await db.select(db.pendingFuelRecords).get();
    final row = rows.singleWhere((r) => r.clientEventId == clientEventId);
    await repository.markUploading(row.id);

    await repository.resetStaleUploading();

    final reset = await db.select(db.pendingFuelRecords).getSingle();
    expect(reset.syncStatus, SyncStatus.pending);
  });
}

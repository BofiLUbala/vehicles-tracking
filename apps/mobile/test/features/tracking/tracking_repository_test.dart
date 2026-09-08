import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tracking_vehicles_mobile/core/database/app_database.dart';
import 'package:tracking_vehicles_mobile/features/tracking/data/tracking_repository.dart';

import '../../helpers/fake_http_adapter.dart';

void main() {
  late Dio dio;
  late AppDatabase db;

  setUp(() {
    dio = Dio(BaseOptions(baseUrl: 'https://api.test'));
    db = AppDatabase.forTesting(NativeDatabase.memory());
  });

  tearDown(() => db.close());

  Future<PendingGpsPosition> insertPosition({String clientEventId = 'evt-1'}) async {
    final id = await db.into(db.pendingGpsPositions).insertReturning(
          PendingGpsPositionsCompanion.insert(
            clientEventId: clientEventId,
            vehicleId: 'veh-1',
            missionId: const Value('mission-1'),
            latitude: -4.32512,
            longitude: 15.32245,
            accuracy: const Value(8.5),
            isMocked: const Value(true),
            recordedAt: DateTime.utc(2026, 9, 8, 10, 30, 15),
          ),
        );
    return id;
  }

  test('uploadPositionsBatch sends the exact payload shape from PHASE3_NOTES',
      () async {
    late Map<String, dynamic> sentBody;
    dio.httpClientAdapter = FakeHttpClientAdapter((options) {
      expect(options.path, '/tracking/positions/batch');
      sentBody = (options.data as Map).cast<String, dynamic>();
      return FakeResponse(
        statusCode: 200,
        data: [
          {'clientEventId': 'evt-1', 'status': 'created'},
        ],
      );
    });

    final position = await insertPosition();
    final repo = TrackingRepository(dio: dio);
    final results = await repo.uploadPositionsBatch([position]);

    final positions = (sentBody['positions'] as List).cast<Map>();
    expect(positions, hasLength(1));
    final payload = positions.single;
    expect(payload['clientEventId'], 'evt-1');
    expect(payload['vehicleId'], 'veh-1');
    expect(payload['missionId'], 'mission-1');
    expect(payload['latitude'], -4.32512);
    expect(payload['longitude'], 15.32245);
    expect(payload['isMocked'], true);
    expect(payload['recordedAt'], '2026-09-08T10:30:15.000Z');

    expect(results, hasLength(1));
    expect(results.single.clientEventId, 'evt-1');
    expect(results.single.status, 'created');
    expect(results.single.isAccepted, isTrue);
  });

  test('parses duplicate/rejected statuses with reason', () async {
    dio.httpClientAdapter = FakeHttpClientAdapter((options) {
      return FakeResponse(
        statusCode: 200,
        data: [
          {'clientEventId': 'evt-1', 'status': 'duplicate'},
          {'clientEventId': 'evt-2', 'status': 'rejected', 'reason': 'Chauffeur non affecté'},
        ],
      );
    });

    final repo = TrackingRepository(dio: dio);
    final results = await repo.uploadPositionsBatch([
      await insertPosition(clientEventId: 'evt-1'),
      await insertPosition(clientEventId: 'evt-2'),
    ]);

    expect(results[0].status, 'duplicate');
    expect(results[0].isAccepted, isTrue);
    expect(results[1].status, 'rejected');
    expect(results[1].isAccepted, isFalse);
    expect(results[1].reason, 'Chauffeur non affecté');
  });

  test('a network failure throws TrackingBatchException', () async {
    dio.httpClientAdapter = FakeHttpClientAdapter((options) {
      throw DioException(
        requestOptions: options,
        type: DioExceptionType.connectionError,
        message: 'Failed host lookup',
      );
    });

    final repo = TrackingRepository(dio: dio);
    await expectLater(
      repo.uploadPositionsBatch([await insertPosition()]),
      throwsA(isA<TrackingBatchException>()),
    );
  });
}

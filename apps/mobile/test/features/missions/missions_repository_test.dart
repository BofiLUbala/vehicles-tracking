import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tracking_vehicles_mobile/features/missions/data/missions_repository.dart';

import '../../helpers/fake_http_adapter.dart';

void main() {
  late Dio dio;

  setUp(() {
    dio = Dio(BaseOptions(baseUrl: 'https://api.test'));
  });

  test('fetchTodayMissions parses the API JSON shape into Mission models',
      () async {
    dio.httpClientAdapter = FakeHttpClientAdapter((options) {
      expect(options.path, '/mobile/missions/today');
      return FakeResponse(
        statusCode: 200,
        data: [
          {
            'id': 'm1',
            'status': 'PENDING',
            'plannedStart': '2026-09-08T07:00:00.000Z',
            'plannedEnd': '2026-09-08T15:00:00.000Z',
            'steps': [
              {
                'id': 's2',
                'order': 2,
                'actionType': 'DROPOFF',
                'location': {'name': 'Dépôt central', 'lat': -4.33, 'lng': 15.31},
                'plannedAt': '2026-09-08T10:00:00.000Z',
                'toleranceMin': 10,
                'allowedRadius': 50,
                'status': 'PENDING',
              },
              {
                'id': 's1',
                'order': 1,
                'actionType': 'PICKUP',
                'location': {'name': 'Point A', 'lat': -4.32, 'lng': 15.30},
                'plannedAt': '2026-09-08T08:00:00.000Z',
                'toleranceMin': 15,
                'allowedRadius': 75,
                'status': 'COMPLETED',
              },
            ],
          },
        ],
      );
    });

    final repo = ApiMissionsRepository(dio: dio);
    final missions = await repo.fetchTodayMissions();

    expect(missions, hasLength(1));
    final mission = missions.first;
    expect(mission.id, 'm1');
    expect(mission.status, 'PENDING');
    expect(mission.plannedStart, DateTime.parse('2026-09-08T07:00:00.000Z'));

    // Steps must be sorted by `order`, regardless of API ordering.
    expect(mission.steps, hasLength(2));
    expect(mission.steps[0].id, 's1');
    expect(mission.steps[0].order, 1);
    expect(mission.steps[0].location.name, 'Point A');
    expect(mission.steps[0].isCompleted, isTrue);
    expect(mission.steps[1].id, 's2');
    expect(mission.steps[1].isCompleted, isFalse);

    expect(mission.completedStepsCount, 1);
    expect(mission.currentStep?.id, 's2');
  });

  test('fetchMissionDetail parses a single mission object', () async {
    dio.httpClientAdapter = FakeHttpClientAdapter((options) {
      expect(options.path, '/mobile/missions/m1');
      return const FakeResponse(
        statusCode: 200,
        data: {
          'id': 'm1',
          'status': 'IN_PROGRESS',
          'plannedStart': '2026-09-08T07:00:00.000Z',
          'plannedEnd': '2026-09-08T15:00:00.000Z',
          'steps': [],
        },
      );
    });

    final repo = ApiMissionsRepository(dio: dio);
    final mission = await repo.fetchMissionDetail('m1');

    expect(mission.id, 'm1');
    expect(mission.status, 'IN_PROGRESS');
    expect(mission.steps, isEmpty);
    expect(mission.currentStep, isNull);
  });
}

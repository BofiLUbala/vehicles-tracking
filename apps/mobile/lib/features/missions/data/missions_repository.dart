import 'package:dio/dio.dart';

import 'models/mission.dart';

class MissionsException implements Exception {
  MissionsException(this.message);
  final String message;

  @override
  String toString() => message;
}

/// Repository des missions. Interface volontairement minimale (pas de
/// cache local) : en Phase 2 l'application suppose une connexion active.
/// La Phase 3 pourra faire implémenter la même interface par une source
/// locale (Drift) sans changer les appelants (providers Riverpod).
abstract class MissionsRepository {
  Future<List<Mission>> fetchTodayMissions();
  Future<Mission> fetchMissionDetail(String missionId);
  Future<Mission> startMission(String missionId);
}

class ApiMissionsRepository implements MissionsRepository {
  ApiMissionsRepository({required Dio dio}) : _dio = dio;

  final Dio _dio;

  @override
  Future<List<Mission>> fetchTodayMissions() async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/mobile/missions/today',
      );
      return (response.data ?? [])
          .map((e) => Mission.fromJson((e as Map).cast<String, dynamic>()))
          .toList();
    } on DioException catch (e) {
      throw MissionsException(_mapError(e));
    }
  }

  @override
  Future<Mission> fetchMissionDetail(String missionId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/mobile/missions/$missionId',
      );
      return Mission.fromJson(response.data!);
    } on DioException catch (e) {
      throw MissionsException(_mapError(e));
    }
  }

  @override
  Future<Mission> startMission(String missionId) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/missions/$missionId/start',
      );
      return Mission.fromJson(response.data!);
    } on DioException catch (e) {
      throw MissionsException(_mapError(e));
    }
  }

  String _mapError(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.connectionError ||
        e.type == DioExceptionType.receiveTimeout) {
      return "Connexion impossible. Vérifiez votre connexion Internet.";
    }
    return "Impossible de charger les missions pour le moment.";
  }
}

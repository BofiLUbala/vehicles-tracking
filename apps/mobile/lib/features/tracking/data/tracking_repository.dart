import 'package:dio/dio.dart';

import '../../../core/database/app_database.dart';

/// Résultat d'un item de `POST /tracking/positions/batch` — un par position
/// soumise, jamais tout-ou-rien (cf. docs/PHASE3_NOTES.md).
class BatchPositionResult {
  const BatchPositionResult({
    required this.clientEventId,
    required this.status,
    this.reason,
  });

  final String clientEventId;

  /// `created` | `duplicate` | `rejected`.
  final String status;
  final String? reason;

  bool get isAccepted => status == 'created' || status == 'duplicate';

  factory BatchPositionResult.fromJson(Map<String, dynamic> json) {
    return BatchPositionResult(
      clientEventId: json['clientEventId'].toString(),
      status: json['status'].toString(),
      reason: json['reason']?.toString(),
    );
  }
}

/// Levée quand l'envoi du lot échoue entièrement (réseau, 5xx...) — dans ce
/// cas aucun résultat par item n'est disponible et l'appelant doit remettre
/// toutes les positions en attente avec un backoff.
class TrackingBatchException implements Exception {
  TrackingBatchException(this.message);
  final String message;

  @override
  String toString() => message;
}

/// Repository responsable de l'envoi du lot de positions GPS en attente vers
/// `POST /tracking/positions/batch`. N'est appelé que par [SyncService] —
/// jamais directement par le flux GPS (cf. `LocationTrackingService`).
class TrackingRepository {
  TrackingRepository({required Dio dio}) : _dio = dio;

  final Dio _dio;

  Future<List<BatchPositionResult>> uploadPositionsBatch(
    List<PendingGpsPosition> positions,
  ) async {
    try {
      final response = await _dio.post<List<dynamic>>(
        '/tracking/positions/batch',
        data: {'positions': positions.map(_toPayload).toList()},
      );
      return (response.data ?? [])
          .map((e) => BatchPositionResult.fromJson(
                (e as Map).cast<String, dynamic>(),
              ))
          .toList();
    } on DioException catch (e) {
      throw TrackingBatchException(_mapError(e));
    }
  }

  Map<String, dynamic> _toPayload(PendingGpsPosition position) {
    return {
      'clientEventId': position.clientEventId,
      'vehicleId': position.vehicleId,
      'missionId': position.missionId,
      'latitude': position.latitude,
      'longitude': position.longitude,
      'accuracy': position.accuracy,
      'altitude': position.altitude,
      'speed': position.speed,
      'heading': position.heading,
      'isMocked': position.isMocked,
      'recordedAt': position.recordedAt.toUtc().toIso8601String(),
    };
  }

  String _mapError(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    return e.message ?? 'Échec de synchronisation.';
  }
}

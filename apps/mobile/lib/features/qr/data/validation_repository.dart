import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';

import 'models/validation_result.dart';

/// Données nécessaires pour valider une étape de mission : QR scanné,
/// position GPS relevée, et photo prise (section 9/10 du cahier des
/// charges — validation GPS + QR + photo, toujours arbitrée côté serveur).
class StepValidationRequest {
  const StepValidationRequest({
    required this.stepId,
    required this.qrToken,
    required this.latitude,
    required this.longitude,
    required this.accuracy,
    required this.isMocked,
    required this.recordedAt,
    required this.photoPath,
    this.clientEventId,
  });

  final String stepId;
  final String qrToken;
  final double latitude;
  final double longitude;
  final double accuracy;
  final bool isMocked;
  final DateTime recordedAt;
  final String photoPath;

  /// Identifiant d'idempotence. Si `null`, un nouveau UUID est généré (cas
  /// "en ligne" — validation tentée immédiatement). Si fourni (cas file
  /// d'attente locale — `PendingValidations.clientEventId`), il est réutilisé
  /// tel quel afin qu'une retransmission après échec réseau soit bien
  /// reconnue comme le même événement côté serveur.
  final String? clientEventId;
}

/// Repository responsable de l'appel multipart de validation d'étape.
/// L'API est la seule autorité pour accepter/rejeter une validation
/// (cf. docs/ARCHITECTURE.md) : ce repository ne fait aucune vérification
/// métier côté mobile, il transmet simplement les données relevées.
class ValidationRepository {
  ValidationRepository({required Dio dio}) : _dio = dio;

  final Dio _dio;

  Future<ValidationResult> validateStep(StepValidationRequest request) async {
    try {
      final data = FormData.fromMap({
        'data': MultipartFile.fromString(
          jsonEncode({
            'clientEventId': request.clientEventId ?? const Uuid().v4(),
            'qrToken': request.qrToken,
            'latitude': request.latitude,
            'longitude': request.longitude,
            'accuracy': request.accuracy,
            'isMocked': request.isMocked,
            'recordedAt': request.recordedAt.toUtc().toIso8601String(),
          }),
        ),
        'photo': await MultipartFile.fromFile(
          request.photoPath,
          filename: 'step_${request.stepId}.jpg',
        ),
      });

      await _dio.post(
        '/mission-steps/${request.stepId}/validate',
        data: data,
      );
      return ValidationResult.success();
    } on DioException catch (e) {
      final responseData = e.response?.data;
      String? errorCode;
      String? message;
      if (responseData is Map) {
        errorCode = responseData['errorCode']?.toString();
        message = responseData['message']?.toString();
      }
      // Pas de réponse serveur du tout (déconnexion, timeout...) : ce n'est
      // pas un refus métier, l'appelant peut mettre la validation en file
      // d'attente locale plutôt que de l'afficher comme un échec définitif.
      if (errorCode == null && _isConnectivityError(e)) {
        errorCode = 'NETWORK_ERROR';
      }
      return ValidationResult.failure(errorCode: errorCode, message: message);
    } on FileSystemException {
      return ValidationResult.failure(
        errorCode: 'MISSING_PHOTO',
        message: "Impossible de lire la photo prise.",
      );
    }
  }

  bool _isConnectivityError(DioException e) {
    return e.type == DioExceptionType.connectionError ||
        e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.sendTimeout ||
        (e.type == DioExceptionType.unknown && e.response == null);
  }
}

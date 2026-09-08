import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';

import 'models/fuel_record_result.dart';
import 'models/fuel_type.dart';

/// Données nécessaires pour déclarer un plein de carburant (écran 12,
/// section 14 du cahier des charges) : véhicule, quantité, coût, kilométrage,
/// type de carburant, station, position GPS auto-capturée, et les deux
/// photos (reçu + compteur).
class FuelRecordRequest {
  const FuelRecordRequest({
    required this.vehicleId,
    required this.liters,
    required this.totalCost,
    required this.odometer,
    required this.fuelType,
    required this.latitude,
    required this.longitude,
    required this.recordedAt,
    required this.receiptPhotoPath,
    required this.odometerPhotoPath,
    this.stationName,
    this.clientEventId,
  });

  final String vehicleId;
  final double liters;
  final double totalCost;
  final double odometer;
  final FuelType fuelType;
  final String? stationName;
  final double latitude;
  final double longitude;

  /// Horodatage de la prise de plein — utilisé uniquement en local (tri de
  /// la file d'attente `PendingFuelRecords`) : `POST /fuel-records` n'a pas
  /// de champ dédié, le serveur utilise `FuelRecord.createdAt` (heure de
  /// réception), voir `CreateFuelRecordMetadataDto`.
  final DateTime recordedAt;
  final String receiptPhotoPath;
  final String odometerPhotoPath;

  /// Identifiant généré localement pour suivre cette déclaration dans la
  /// file d'attente (`PendingFuelRecords.clientEventId`). Contrairement à
  /// `StepValidationRequest.clientEventId`, il n'est **pas** envoyé au
  /// serveur : `CreateFuelRecordMetadataDto` n'a pas de champ d'idempotence
  /// (voir `apps/api/src/fuel/dto/create-fuel-record-metadata.dto.ts`) — une
  /// resoumission après échec réseau peut donc créer un doublon côté serveur
  /// si la première tentative avait en fait réussi. Signalé comme suivi
  /// Phase 5 (ajouter un `clientEventId` au DTO backend, sur le modèle des
  /// validations d'étape).
  final String? clientEventId;
}

/// Repository responsable de l'appel multipart de déclaration de plein.
///
/// Contrat reconcilié avec le backend réel une fois publié par l'agent
/// parallèle (`apps/api/src/fuel/fuel-records.controller.ts` +
/// `dto/create-fuel-record-metadata.dto.ts`) : champ JSON `metadata`
/// (`vehicleId` UUID, `liters`, `totalCost`, `odometer`, `fuelType`,
/// `stationName?`, `latitude?`, `longitude?`) + fichiers `receipt` et
/// `odometerPhoto`. Les deux photos sont obligatoires côté serveur (400 si
/// absentes) ; une déclaration n'est en revanche jamais rejetée pour cause
/// d'anomalie métier (consommation implausible, odomètre régressif...) — ces
/// cas créent des `Alert` mais renvoient tout de même un 201.
class FuelRepository {
  FuelRepository({required Dio dio}) : _dio = dio;

  final Dio _dio;

  Future<FuelRecordResult> submit(FuelRecordRequest request) async {
    try {
      final data = FormData.fromMap({
        'metadata': MultipartFile.fromString(
          jsonEncode({
            'vehicleId': request.vehicleId,
            'liters': request.liters,
            'totalCost': request.totalCost,
            'odometer': request.odometer,
            'fuelType': request.fuelType.apiValue,
            if (request.stationName != null) 'stationName': request.stationName,
            'latitude': request.latitude,
            'longitude': request.longitude,
          }),
        ),
        'receipt': await MultipartFile.fromFile(
          request.receiptPhotoPath,
          filename: 'receipt_${request.vehicleId}.jpg',
        ),
        'odometerPhoto': await MultipartFile.fromFile(
          request.odometerPhotoPath,
          filename: 'odometer_${request.vehicleId}.jpg',
        ),
      });

      await _dio.post('/fuel-records', data: data);
      return FuelRecordResult.success();
    } on DioException catch (e) {
      final responseData = e.response?.data;
      String? errorCode;
      String? message;
      if (responseData is Map) {
        errorCode = responseData['errorCode']?.toString();
        message = responseData['message']?.toString();
      }
      // Pas de réponse serveur du tout (déconnexion, timeout...) : ce n'est
      // pas un refus métier, l'appelant peut mettre la déclaration en file
      // d'attente locale plutôt que de l'afficher comme un échec définitif.
      if (errorCode == null && _isConnectivityError(e)) {
        errorCode = 'NETWORK_ERROR';
      }
      return FuelRecordResult.failure(errorCode: errorCode, message: message);
    } on FileSystemException {
      return FuelRecordResult.failure(
        errorCode: 'MISSING_PHOTO',
        message: 'Impossible de lire une des photos prises.',
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

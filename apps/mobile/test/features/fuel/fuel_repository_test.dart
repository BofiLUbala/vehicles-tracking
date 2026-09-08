import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tracking_vehicles_mobile/features/fuel/data/fuel_repository.dart';
import 'package:tracking_vehicles_mobile/features/fuel/data/models/fuel_type.dart';

import '../../helpers/fake_http_adapter.dart';

/// Le champ `data` du multipart est ajouté via `MultipartFile.fromString`
/// (voir `FuelRepository.submit`) : dio le range dans `FormData.files`, pas
/// dans `FormData.fields`.
Future<String> _readMultipartFileAsString(MultipartFile file) async {
  final bytes = <int>[];
  await for (final chunk in file.finalize()) {
    bytes.addAll(chunk);
  }
  return utf8.decode(bytes);
}

void main() {
  late Dio dio;
  late Directory tempDir;
  late String receiptPath;
  late String odometerPath;

  setUp(() async {
    dio = Dio(BaseOptions(baseUrl: 'https://api.test'));
    tempDir = await Directory.systemTemp.createTemp('fuel_repository_test');
    receiptPath = '${tempDir.path}/receipt.jpg';
    odometerPath = '${tempDir.path}/odometer.jpg';
    await File(receiptPath).writeAsBytes([1, 2, 3]);
    await File(odometerPath).writeAsBytes([4, 5, 6]);
  });

  tearDown(() async {
    // Sur Windows, le fichier photo peut rester momentanément verrouillé par
    // le flux multipart interne à dio/l'adaptateur factice — la suppression
    // n'est qu'un nettoyage, pas une assertion du test.
    try {
      await tempDir.delete(recursive: true);
    } catch (_) {}
  });

  FuelRecordRequest buildRequest({String? clientEventId}) {
    return FuelRecordRequest(
      vehicleId: 'veh-1',
      liters: 45.5,
      totalCost: 65000,
      odometer: 128900,
      fuelType: FuelType.diesel,
      stationName: 'Total Boulevard',
      latitude: -4.32512,
      longitude: 15.32245,
      recordedAt: DateTime.utc(2026, 9, 8, 10, 30, 15),
      receiptPhotoPath: receiptPath,
      odometerPhotoPath: odometerPath,
      clientEventId: clientEventId,
    );
  }

  // Chaque test ci-dessous court-circuite l'appel dans `onRequest`, avant
  // que dio ne finalise (donc consomme) le `FormData` interne — ce qui
  // permet d'inspecter son contenu nous-mêmes sans jamais atteindre
  // l'adaptateur HTTP réel ni tenter de le finaliser une seconde fois.

  test('submit sends a multipart payload with a data field and both photos',
      () async {
    late FormData formData;
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          expect(options.path, '/fuel-records');
          formData = options.data as FormData;
          handler.resolve(
            Response(
              requestOptions: options,
              statusCode: 201,
              data: <String, dynamic>{},
            ),
          );
        },
      ),
    );

    final repo = FuelRepository(dio: dio);
    final result = await repo.submit(buildRequest(clientEventId: 'evt-1'));

    expect(result.success, isTrue);

    final dataFile = formData.files.singleWhere((f) => f.key == 'metadata');
    final payload = await _readMultipartFileAsString(dataFile.value);
    expect(payload, contains('"vehicleId":"veh-1"'));
    expect(payload, contains('"liters":45.5'));
    expect(payload, contains('"totalCost":65000'));
    expect(payload, contains('"odometer":128900'));
    expect(payload, contains('"fuelType":"DIESEL"'));
    expect(payload, contains('"stationName":"Total Boulevard"'));
    // The clientEventId is local-only bookkeeping (no idempotency key field
    // on CreateFuelRecordMetadataDto) — never sent to the server.
    expect(payload, isNot(contains('clientEventId')));
    expect(payload, isNot(contains('recordedAt')));

    final fileKeys = formData.files.map((f) => f.key).toSet();
    expect(fileKeys, {'metadata', 'receipt', 'odometerPhoto'});
  });

  test('submit omits stationName from the metadata when not provided',
      () async {
    late FormData formData;
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          formData = options.data as FormData;
          handler.resolve(
            Response(
              requestOptions: options,
              statusCode: 201,
              data: <String, dynamic>{},
            ),
          );
        },
      ),
    );

    final repo = FuelRepository(dio: dio);
    await repo.submit(
      FuelRecordRequest(
        vehicleId: 'veh-1',
        liters: 10,
        totalCost: 15000,
        odometer: 1000,
        fuelType: FuelType.petrol,
        latitude: 0,
        longitude: 0,
        recordedAt: DateTime.utc(2026, 1, 1),
        receiptPhotoPath: receiptPath,
        odometerPhotoPath: odometerPath,
      ),
    );

    final dataFile = formData.files.singleWhere((f) => f.key == 'metadata');
    final payload = await _readMultipartFileAsString(dataFile.value);
    expect(payload, isNot(contains('stationName')));
  });

  test('a business rejection returns the server errorCode/message', () async {
    dio.httpClientAdapter = FakeHttpClientAdapter((options) {
      throw DioException(
        requestOptions: options,
        response: Response(
          requestOptions: options,
          statusCode: 400,
          data: {'errorCode': 'INVALID_VEHICLE', 'message': 'Véhicule introuvable'},
        ),
        type: DioExceptionType.badResponse,
      );
    });

    final repo = FuelRepository(dio: dio);
    final result = await repo.submit(buildRequest());

    expect(result.success, isFalse);
    expect(result.errorCode, 'INVALID_VEHICLE');
    expect(result.rawMessage, 'Véhicule introuvable');
  });

  test('a real NestJS exception body (no errorCode field) still surfaces '
      'the French message as a fallback', () async {
    // apps/api/src/fuel/fuel.service.ts throws plain NotFoundException /
    // ForbiddenException / BadRequestException — Nest's default exception
    // filter produces {statusCode, message, error}, with no custom
    // "errorCode" property (unlike mission-step validation errors).
    dio.httpClientAdapter = FakeHttpClientAdapter((options) {
      throw DioException(
        requestOptions: options,
        response: Response(
          requestOptions: options,
          statusCode: 404,
          data: {'statusCode': 404, 'message': 'Véhicule introuvable', 'error': 'Not Found'},
        ),
        type: DioExceptionType.badResponse,
      );
    });

    final repo = FuelRepository(dio: dio);
    final result = await repo.submit(buildRequest());

    expect(result.success, isFalse);
    expect(result.errorCode, isNull);
    expect(result.rawMessage, 'Véhicule introuvable');
  });

  test('a connectivity failure maps to NETWORK_ERROR', () async {
    dio.httpClientAdapter = FakeHttpClientAdapter((options) {
      throw DioException(
        requestOptions: options,
        type: DioExceptionType.connectionError,
        message: 'Failed host lookup',
      );
    });

    final repo = FuelRepository(dio: dio);
    final result = await repo.submit(buildRequest());

    expect(result.success, isFalse);
    expect(result.errorCode, 'NETWORK_ERROR');
  });

  test('a missing photo file surfaces MISSING_PHOTO instead of throwing',
      () async {
    dio.httpClientAdapter = FakeHttpClientAdapter((options) {
      return const FakeResponse(statusCode: 201, data: {});
    });

    final repo = FuelRepository(dio: dio);
    final request = buildRequest();
    await File(receiptPath).delete();

    final result = await repo.submit(request);

    expect(result.success, isFalse);
    expect(result.errorCode, 'MISSING_PHOTO');
  });
}

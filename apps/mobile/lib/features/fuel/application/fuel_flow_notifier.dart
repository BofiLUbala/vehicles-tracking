import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/database/database_provider.dart';
import '../../../core/providers/core_providers.dart';
import '../data/fuel_queue_repository.dart';
import '../data/fuel_repository.dart';
import '../data/models/fuel_record_result.dart';
import '../data/models/fuel_type.dart';
import 'fuel_flow_state.dart';

/// Pilote le flux Formulaire → Photo reçu → Photo compteur → Soumission
/// d'une déclaration de plein (écran 12, section 14 du cahier des charges).
///
/// Même principe que `QrFlowNotifier`
/// (`lib/features/qr/application/qr_flow_notifier.dart`) : la position GPS
/// est toujours auto-capturée au moment de la soumission (jamais saisie
/// manuellement), et un échec réseau met la déclaration en file d'attente
/// locale plutôt que de l'afficher comme un échec définitif.
class FuelFlowNotifier extends StateNotifier<FuelFlowState> {
  FuelFlowNotifier({
    required FuelRepository repository,
    required FuelQueueRepository queueRepository,
    required String vehicleId,
  })  : _repository = repository,
        _queueRepository = queueRepository,
        super(FuelFlowState(vehicleId: vehicleId));

  final FuelRepository _repository;
  final FuelQueueRepository _queueRepository;

  void onFormSubmitted({
    required String vehicleId,
    required double liters,
    required double totalCost,
    required double odometer,
    required FuelType fuelType,
    String? stationName,
  }) {
    state = state.copyWith(
      vehicleId: vehicleId,
      liters: liters,
      totalCost: totalCost,
      odometer: odometer,
      fuelType: fuelType,
      stationName: stationName,
      step: FuelFlowStep.receiptPhoto,
      clearError: true,
    );
  }

  void onReceiptPhotoTaken(String path) {
    state = state.copyWith(
      receiptPhotoPath: path,
      step: FuelFlowStep.odometerPhoto,
      clearError: true,
    );
  }

  void onOdometerPhotoTaken(String path) {
    state = state.copyWith(odometerPhotoPath: path, clearError: true);
  }

  Future<void> submit() async {
    final liters = state.liters;
    final totalCost = state.totalCost;
    final odometer = state.odometer;
    final receiptPhotoPath = state.receiptPhotoPath;
    final odometerPhotoPath = state.odometerPhotoPath;
    if (liters == null ||
        totalCost == null ||
        odometer == null ||
        receiptPhotoPath == null ||
        odometerPhotoPath == null) {
      return;
    }

    state = state.copyWith(step: FuelFlowStep.submitting, clearError: true);

    try {
      final position = await _readPosition();
      final recordedAt = DateTime.now();
      final request = FuelRecordRequest(
        vehicleId: state.vehicleId,
        liters: liters,
        totalCost: totalCost,
        odometer: odometer,
        fuelType: state.fuelType,
        stationName: state.stationName,
        latitude: position.latitude,
        longitude: position.longitude,
        recordedAt: recordedAt,
        receiptPhotoPath: receiptPhotoPath,
        odometerPhotoPath: odometerPhotoPath,
      );
      final result = await _repository.submit(request);

      // Échec réseau (pas de refus serveur) : on met la déclaration en file
      // d'attente locale plutôt que de la présenter comme un échec
      // définitif — `SyncService` la rejouera dès que le réseau revient.
      if (!result.success && result.errorCode == 'NETWORK_ERROR') {
        await _queueRepository.enqueue(
          vehicleId: state.vehicleId,
          liters: liters,
          totalCost: totalCost,
          odometer: odometer,
          fuelType: state.fuelType.apiValue,
          stationName: state.stationName,
          latitude: position.latitude,
          longitude: position.longitude,
          recordedAt: recordedAt,
          receiptPhotoPath: receiptPhotoPath,
          odometerPhotoPath: odometerPhotoPath,
        );
        state = state.copyWith(
          step: FuelFlowStep.result,
          result: FuelRecordResult.queuedOffline(),
        );
        return;
      }

      state = state.copyWith(step: FuelFlowStep.result, result: result);
    } catch (e) {
      state = state.copyWith(
        step: FuelFlowStep.result,
        result: FuelRecordResult.failure(
          errorCode: 'LOCATION_UNAVAILABLE',
          message: e.toString(),
        ),
      );
    }
  }

  Future<Position> _readPosition() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception('Le GPS est désactivé.');
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw Exception('Localisation refusée.');
    }
    return Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
  }

  /// Redémarre entièrement le flux (ex. "recommencer" après un échec).
  void restart() {
    state = FuelFlowState(vehicleId: state.vehicleId);
  }
}

final fuelRepositoryProvider = Provider<FuelRepository>((ref) {
  return FuelRepository(dio: ref.watch(dioProvider));
});

final fuelQueueRepositoryProvider = Provider<FuelQueueRepository>((ref) {
  return FuelQueueRepository(database: ref.watch(appDatabaseProvider));
});

/// Nombre de déclarations de plein en attente de synchronisation
/// (pending/failed).
final pendingFuelRecordsCountProvider = StreamProvider<int>((ref) {
  return ref.watch(fuelQueueRepositoryProvider).watchPendingCount();
});

final fuelRecordsFailedCountProvider = StreamProvider<int>((ref) {
  return ref.watch(fuelQueueRepositoryProvider).watchFailedCount();
});

/// Provider `family` gardant un notifier par véhicule (le flux ne survit
/// pas à la navigation en dehors de l'écran — `autoDispose`).
final fuelFlowProvider = StateNotifierProvider.autoDispose
    .family<FuelFlowNotifier, FuelFlowState, String>((ref, vehicleId) {
  return FuelFlowNotifier(
    repository: ref.watch(fuelRepositoryProvider),
    queueRepository: ref.watch(fuelQueueRepositoryProvider),
    vehicleId: vehicleId,
  );
});

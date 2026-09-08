import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/database/database_provider.dart';
import '../../../core/providers/core_providers.dart';
import '../data/models/validation_result.dart';
import '../data/validation_queue_repository.dart';
import '../data/validation_repository.dart';
import 'qr_flow_state.dart';

/// Pilote le flux Scan QR → Photo → Validation d'une étape de mission.
///
/// L'application ne décide jamais seule si une étape est valide : elle
/// relève le QR, la position GPS et la photo, puis laisse l'API arbitrer
/// (cf. docs/ARCHITECTURE.md, "l'API est la seule autorité").
class QrFlowNotifier extends StateNotifier<QrFlowState> {
  QrFlowNotifier({
    required ValidationRepository repository,
    required ValidationQueueRepository queueRepository,
    required String missionId,
    required String stepId,
  })  : _repository = repository,
        _queueRepository = queueRepository,
        super(QrFlowState(missionId: missionId, stepId: stepId));

  final ValidationRepository _repository;
  final ValidationQueueRepository _queueRepository;

  void onQrScanned(String qrToken) {
    if (state.step != QrFlowStep.scanning) return;
    state = state.copyWith(step: QrFlowStep.photo, qrToken: qrToken);
  }

  void onPhotoTaken(String photoPath) {
    state = state.copyWith(photoPath: photoPath, clearError: true);
  }

  void retakePhoto() {
    state = state.copyWith(photoPath: null, clearError: true);
  }

  Future<void> submit() async {
    final qrToken = state.qrToken;
    final photoPath = state.photoPath;
    if (qrToken == null || photoPath == null) return;

    state = state.copyWith(step: QrFlowStep.submitting, clearError: true);

    try {
      final position = await _readPosition();
      final recordedAt = DateTime.now();
      final result = await _repository.validateStep(
        StepValidationRequest(
          stepId: state.stepId,
          qrToken: qrToken,
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
          isMocked: position.isMocked,
          recordedAt: recordedAt,
          photoPath: photoPath,
        ),
      );

      // Échec réseau (pas de refus serveur) : on met la validation en file
      // d'attente locale plutôt que de la présenter comme un échec
      // définitif — `SyncService` la rejouera dès que le réseau revient.
      if (!result.success && result.errorCode == 'NETWORK_ERROR') {
        await _queueRepository.enqueue(
          missionStepId: state.stepId,
          qrToken: qrToken,
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
          isMocked: position.isMocked,
          recordedAt: recordedAt,
          photoPath: photoPath,
        );
        state = state.copyWith(
          step: QrFlowStep.result,
          result: ValidationResult.queuedOffline(),
        );
        return;
      }

      state = state.copyWith(step: QrFlowStep.result, result: result);
    } catch (e) {
      state = state.copyWith(
        step: QrFlowStep.result,
        result: ValidationResult.failure(
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
    state = QrFlowState(missionId: state.missionId, stepId: state.stepId);
  }
}

final validationRepositoryProvider = Provider<ValidationRepository>((ref) {
  return ValidationRepository(dio: ref.watch(dioProvider));
});

final validationQueueRepositoryProvider =
    Provider<ValidationQueueRepository>((ref) {
  return ValidationQueueRepository(database: ref.watch(appDatabaseProvider));
});

/// Nombre de validations d'étape en attente de synchronisation
/// (pending/failed).
final pendingValidationsCountProvider = StreamProvider<int>((ref) {
  return ref.watch(validationQueueRepositoryProvider).watchPendingCount();
});

/// Nombre de validations d'étape `failed` (essais automatiques épuisés ou
/// refus définitif du serveur).
final validationsFailedCountProvider = StreamProvider<int>((ref) {
  return ref.watch(validationQueueRepositoryProvider).watchFailedCount();
});

/// Provider `family` gardant un notifier par (missionId, stepId) — la clé
/// est une chaîne composite car Riverpod `family` exige une clé simple
/// équatable.
final qrFlowProvider = StateNotifierProvider.autoDispose
    .family<QrFlowNotifier, QrFlowState, ({String missionId, String stepId})>(
  (ref, args) {
    return QrFlowNotifier(
      repository: ref.watch(validationRepositoryProvider),
      queueRepository: ref.watch(validationQueueRepositoryProvider),
      missionId: args.missionId,
      stepId: args.stepId,
    );
  },
);

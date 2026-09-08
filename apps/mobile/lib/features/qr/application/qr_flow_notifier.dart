import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/providers/core_providers.dart';
import '../data/models/validation_result.dart';
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
    required String missionId,
    required String stepId,
  })  : _repository = repository,
        super(QrFlowState(missionId: missionId, stepId: stepId));

  final ValidationRepository _repository;

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
      final result = await _repository.validateStep(
        StepValidationRequest(
          stepId: state.stepId,
          qrToken: qrToken,
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
          isMocked: position.isMocked,
          recordedAt: DateTime.now(),
          photoPath: photoPath,
        ),
      );
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

/// Provider `family` gardant un notifier par (missionId, stepId) — la clé
/// est une chaîne composite car Riverpod `family` exige une clé simple
/// équatable.
final qrFlowProvider = StateNotifierProvider.autoDispose
    .family<QrFlowNotifier, QrFlowState, ({String missionId, String stepId})>(
  (ref, args) {
    return QrFlowNotifier(
      repository: ref.watch(validationRepositoryProvider),
      missionId: args.missionId,
      stepId: args.stepId,
    );
  },
);

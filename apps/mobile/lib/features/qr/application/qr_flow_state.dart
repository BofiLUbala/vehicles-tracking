import '../data/models/validation_result.dart';

enum QrFlowStep { scanning, photo, submitting, result }

/// État du flux Scan QR → Photo → Validation (écrans 9, 10, 11).
class QrFlowState {
  const QrFlowState({
    required this.missionId,
    required this.stepId,
    this.step = QrFlowStep.scanning,
    this.qrToken,
    this.photoPath,
    this.result,
    this.errorMessage,
  });

  final String missionId;
  final String stepId;
  final QrFlowStep step;
  final String? qrToken;
  final String? photoPath;
  final ValidationResult? result;
  final String? errorMessage;

  QrFlowState copyWith({
    QrFlowStep? step,
    String? qrToken,
    String? photoPath,
    ValidationResult? result,
    String? errorMessage,
    bool clearError = false,
  }) {
    return QrFlowState(
      missionId: missionId,
      stepId: stepId,
      step: step ?? this.step,
      qrToken: qrToken ?? this.qrToken,
      photoPath: photoPath ?? this.photoPath,
      result: result ?? this.result,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

import '../data/models/fuel_record_result.dart';
import '../data/models/fuel_type.dart';

enum FuelFlowStep { form, receiptPhoto, odometerPhoto, submitting, result }

/// État du flux de déclaration de plein (écran 12) : saisie du formulaire →
/// photo du reçu → photo du compteur → soumission → résultat.
class FuelFlowState {
  const FuelFlowState({
    required this.vehicleId,
    this.step = FuelFlowStep.form,
    this.liters,
    this.totalCost,
    this.odometer,
    this.fuelType = FuelType.diesel,
    this.stationName,
    this.receiptPhotoPath,
    this.odometerPhotoPath,
    this.result,
    this.errorMessage,
  });

  /// Véhicule pré-rempli depuis l'affectation courante du chauffeur — reste
  /// modifiable si aucune mission active n'est trouvée (voir
  /// `FuelFormScreen`).
  final String vehicleId;
  final FuelFlowStep step;
  final double? liters;
  final double? totalCost;
  final double? odometer;
  final FuelType fuelType;
  final String? stationName;
  final String? receiptPhotoPath;
  final String? odometerPhotoPath;
  final FuelRecordResult? result;
  final String? errorMessage;

  FuelFlowState copyWith({
    String? vehicleId,
    FuelFlowStep? step,
    double? liters,
    double? totalCost,
    double? odometer,
    FuelType? fuelType,
    String? stationName,
    String? receiptPhotoPath,
    String? odometerPhotoPath,
    FuelRecordResult? result,
    String? errorMessage,
    bool clearError = false,
  }) {
    return FuelFlowState(
      vehicleId: vehicleId ?? this.vehicleId,
      step: step ?? this.step,
      liters: liters ?? this.liters,
      totalCost: totalCost ?? this.totalCost,
      odometer: odometer ?? this.odometer,
      fuelType: fuelType ?? this.fuelType,
      stationName: stationName ?? this.stationName,
      receiptPhotoPath: receiptPhotoPath ?? this.receiptPhotoPath,
      odometerPhotoPath: odometerPhotoPath ?? this.odometerPhotoPath,
      result: result ?? this.result,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

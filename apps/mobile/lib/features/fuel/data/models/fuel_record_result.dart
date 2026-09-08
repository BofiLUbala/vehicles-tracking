/// Résultat renvoyé par `POST /fuel-records`, ou résultat local quand la
/// déclaration n'a pas pu être tentée en ligne et a été mise en file
/// d'attente ([queued]) pour être rejouée par `SyncService` dès que le
/// réseau revient — même convention que `ValidationResult`
/// (`lib/features/qr/data/models/validation_result.dart`).
class FuelRecordResult {
  const FuelRecordResult({
    required this.success,
    this.errorCode,
    this.rawMessage,
    this.queued = false,
  });

  final bool success;
  final String? errorCode;
  final String? rawMessage;

  /// `true` si la déclaration n'a pas pu être envoyée immédiatement (pas de
  /// réseau) et a été enregistrée dans `PendingFuelRecords` pour un envoi
  /// différé.
  final bool queued;

  factory FuelRecordResult.success() =>
      const FuelRecordResult(success: true);

  factory FuelRecordResult.failure({String? errorCode, String? message}) =>
      FuelRecordResult(success: false, errorCode: errorCode, rawMessage: message);

  factory FuelRecordResult.queuedOffline() =>
      const FuelRecordResult(success: false, queued: true);
}

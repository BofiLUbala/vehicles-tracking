/// Résultat renvoyé par `POST /mission-steps/:id/validate`, ou résultat
/// local quand la validation n'a pas pu être tentée en ligne et a été mise
/// en file d'attente ([queued]) pour être rejouée par `SyncService` dès que
/// le réseau revient.
class ValidationResult {
  const ValidationResult({
    required this.success,
    this.errorCode,
    this.rawMessage,
    this.queued = false,
  });

  final bool success;
  final String? errorCode;
  final String? rawMessage;

  /// `true` si la validation n'a pas pu être envoyée immédiatement (pas de
  /// réseau) et a été enregistrée dans [PendingValidations] pour un envoi
  /// différé — ce n'est ni un succès confirmé par le serveur, ni un échec
  /// définitif.
  final bool queued;

  factory ValidationResult.success() => const ValidationResult(success: true);

  factory ValidationResult.failure({String? errorCode, String? message}) =>
      ValidationResult(success: false, errorCode: errorCode, rawMessage: message);

  factory ValidationResult.queuedOffline() =>
      const ValidationResult(success: false, queued: true);
}

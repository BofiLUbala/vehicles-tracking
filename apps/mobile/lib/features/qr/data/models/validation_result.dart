/// Résultat renvoyé par `POST /mission-steps/:id/validate`.
class ValidationResult {
  const ValidationResult({
    required this.success,
    this.errorCode,
    this.rawMessage,
  });

  final bool success;
  final String? errorCode;
  final String? rawMessage;

  factory ValidationResult.success() => const ValidationResult(success: true);

  factory ValidationResult.failure({String? errorCode, String? message}) =>
      ValidationResult(success: false, errorCode: errorCode, rawMessage: message);
}

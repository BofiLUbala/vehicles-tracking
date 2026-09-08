/// Traduit un `errorCode` renvoyé par `POST /fuel-records` en message
/// français destiné au chauffeur (écran 12 — Résultat de déclaration de
/// plein) — même principe que `frenchMessageForErrorCode`
/// (`lib/features/qr/application/error_code_messages.dart`).
///
/// Fonction pure, testée exhaustivement — voir
/// `test/features/fuel/fuel_error_messages_test.dart`.
String frenchMessageForFuelErrorCode(String? errorCode, [String? fallback]) {
  switch (errorCode) {
    case 'MISSING_PHOTO':
      return 'Photo manquante. Le reçu et le compteur doivent tous les deux être photographiés.';
    case 'MISSING_LOCATION':
    case 'LOCATION_UNAVAILABLE':
      return "Impossible d'obtenir votre position GPS. Vérifiez que la localisation est activée.";
    case 'INVALID_VEHICLE':
      return "Ce véhicule est introuvable ou ne vous est pas affecté.";
    case 'NETWORK_ERROR':
      return 'Connexion impossible. Vérifiez votre connexion Internet et réessayez.';
    default:
      return fallback?.isNotEmpty == true
          ? fallback!
          : "Une erreur est survenue lors de l'envoi de la déclaration. Merci de réessayer.";
  }
}

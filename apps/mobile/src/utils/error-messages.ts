/**
 * Traduit un `errorCode` renvoyé par POST /mission-steps/:id/validate
 * en message français destiné au chauffeur.
 */
export function frenchMessageForErrorCode(errorCode?: string | null, fallback?: string | null): string {
  switch (errorCode) {
    case 'OUT_OF_RANGE':
      return 'Vous êtes trop loin du point attendu. Rapprochez-vous du lieu de collecte ou de dépôt puis réessayez.';
    case 'INVALID_QR':
      return 'QR code invalide. Vérifiez que vous scannez bien le code du bon point.';
    case 'WRONG_STEP_ORDER':
      return "Cette étape ne peut pas être validée maintenant : une étape précédente n'est pas terminée.";
    case 'MISSING_PHOTO':
      return 'Photo manquante. Une photo est obligatoire pour valider cette étape.';
    case 'WINDOW_EXPIRED':
      return 'Le délai pour valider cette étape est dépassé. Contactez votre superviseur.';
    case 'MISSING_LOCATION':
    case 'LOCATION_UNAVAILABLE':
      return "Impossible d'obtenir votre position GPS. Vérifiez que la localisation est activée.";
    case 'MOCKED_LOCATION':
      return 'Position GPS suspecte détectée (simulation de position). Désactivez les faux GPS et réessayez.';
    case 'MISSION_NOT_STARTED':
      return "La mission n'a pas encore été démarrée.";
    case 'WRONG_DRIVER':
      return "Vous n'êtes pas le chauffeur assigné à cette mission.";
    case 'INACTIVE_MISSION':
      return "La mission n'est plus active.";
    case 'NETWORK_ERROR':
      return 'Connexion impossible. Vérifiez votre connexion Internet et réessayez.';
    default:
      return fallback && fallback.length > 0
        ? fallback
        : 'Une erreur est survenue lors de la validation. Merci de réessayer.';
  }
}

/**
 * Traduit un `errorCode` renvoyé par POST /fuel-records
 * en message français destiné au chauffeur.
 */
export function frenchMessageForFuelErrorCode(errorCode?: string | null, fallback?: string | null): string {
  switch (errorCode) {
    case 'MISSING_PHOTO':
      return 'Photo manquante. Le reçu et le compteur doivent tous les deux être photographiés.';
    case 'MISSING_LOCATION':
    case 'LOCATION_UNAVAILABLE':
      return "Impossible d'obtenir votre position GPS. Vérifiez que la localisation est activée.";
    case 'INVALID_VEHICLE':
      return 'Ce véhicule est introuvable ou ne vous est pas affecté.';
    case 'NETWORK_ERROR':
      return 'Connexion impossible. Vérifiez votre connexion Internet et réessayez.';
    default:
      return fallback && fallback.length > 0
        ? fallback
        : "Une erreur est survenue lors de l'envoi de la déclaration. Merci de réessayer.";
  }
}

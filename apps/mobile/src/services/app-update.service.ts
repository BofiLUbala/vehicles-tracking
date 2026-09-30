import * as Updates from 'expo-updates';

/** Sous-ensemble d'expo-updates utilisé ici (injectable pour les tests). */
export interface UpdatesApi {
  isEnabled: boolean;
  checkForUpdateAsync(): Promise<{ isAvailable: boolean }>;
  fetchUpdateAsync(): Promise<{ isNew: boolean }>;
}

/** Pas plus d'une vérification toutes les 10 min (retours au premier plan fréquents en tournée). */
export const UPDATE_CHECK_MIN_INTERVAL_MS = 10 * 60 * 1000;

let lastCheckAt = 0;
let inFlight: Promise<boolean> | null = null;

/**
 * Vérifie puis télécharge une mise à jour OTA publiée pour CE runtime.
 * Renvoie true quand une nouvelle version est prête à être appliquée (reloadAsync).
 * Sans cela, expo-updates ne l'applique qu'au démarrage à froid suivant : un chauffeur qui
 * laisse l'application ouverte toute la journée resterait des jours sur l'ancienne version.
 */
export function checkAndFetchUpdate(api: UpdatesApi = Updates, now: number = Date.now()): Promise<boolean> {
  if (!api.isEnabled) return Promise.resolve(false);
  if (inFlight) return inFlight;
  if (now - lastCheckAt < UPDATE_CHECK_MIN_INTERVAL_MS && lastCheckAt !== 0) return Promise.resolve(false);
  lastCheckAt = now;

  inFlight = (async () => {
    try {
      const check = await api.checkForUpdateAsync();
      if (!check.isAvailable) return false;
      const fetched = await api.fetchUpdateAsync();
      return fetched.isNew;
    } catch {
      // hors ligne / serveur injoignable : on retentera au prochain retour au premier plan
      lastCheckAt = 0;
      return false;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Applique la mise à jour téléchargée (redémarre le JavaScript ; GPS en arrière-plan et files SQLite survivent). */
export function applyUpdate(): Promise<void> {
  return Updates.reloadAsync();
}

/** Réservé aux tests. */
export function resetUpdateCheckState(): void {
  lastCheckAt = 0;
  inFlight = null;
}

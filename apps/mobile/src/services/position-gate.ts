/**
 * Porte d'entrée unique des positions GPS dans la file locale.
 *
 * Pendant une mission, trois sources enregistrent des positions : le suivi au premier plan
 * (`watchPositionAsync`), la tâche d'arrière-plan (`startLocationUpdatesAsync`) et la capture de
 * secours toutes les 15 s. Sans filtre, une même position arrivait en double, et deux sources
 * donnaient parfois des points à quelques centièmes de seconde d'écart mais distants de 15-20 m :
 * le serveur y voyait une vitesse « impossible » (195 km/h pour un camion à 45 km/h) et marquait le
 * véhicule suspect (constaté en conditions réelles sur émulateur Android).
 *
 * Règle : une position n'est acceptée que si elle est postérieure d'au moins `MIN_INTERVAL_MS` à la
 * dernière acceptée (ce qui écarte aussi les doublons et les positions plus anciennes).
 */
export const MIN_POSITION_INTERVAL_MS = 2000;

let lastAcceptedMs: number | null = null;

export const PositionGate = {
  accept(recordedAtIso: string): boolean {
    const t = Date.parse(recordedAtIso);
    if (!Number.isFinite(t)) return false;
    if (lastAcceptedMs != null && t - lastAcceptedMs < MIN_POSITION_INTERVAL_MS) return false;
    lastAcceptedMs = t;
    return true;
  },

  /** Nouveau suivi (autre chauffeur, nouvelle mission) : repartir sans historique. */
  reset(): void {
    lastAcceptedMs = null;
  },
};

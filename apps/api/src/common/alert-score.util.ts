export interface ScoreBreakdownEntry {
  reason: string;
  points: number;
}

/**
 * Construit `{ score, breakdown }` pour une `Alert` à partir d'une liste de règles déclenchées —
 * chaque entrée porte sa propre justification (`reason`) et ses points, pour que le score de
 * suspicion reste EXPLICABLE (spec section 15 : "score de suspicion explicable"), jamais une
 * boîte noire. `score` est la somme des points ; `breakdown` est stocké tel quel dans
 * `Alert.scoreBreakdown` (JSON).
 *
 * Barème exact (section 15) :
 *   +40 fausse position détectée (MOCK_GPS)
 *   +30 chauffeur hors zone (géofencing) — PAS IMPLÉMENTÉ, aucune table de zone n'existe (Phase 5)
 *   +20 saut géographique impossible (SPEEDING)
 *   +15 heure incohérente — PAS IMPLÉMENTÉ, aucun signal propre identifié (Phase 5, voir PHASE4_NOTES.md)
 *   +10 mauvaise précision GPS (déclenché ici avec le type d'alerte générique OTHER, voir
 *       TrackingService — aucune valeur d'enum AlertType dédiée n'existe pour ce cas)
 */
export function buildAlertScore(entries: ScoreBreakdownEntry[]): { score: number; breakdown: ScoreBreakdownEntry[] } {
  const score = entries.reduce((sum, entry) => sum + entry.points, 0);
  return { score, breakdown: entries };
}

export const ALERT_SCORE_POINTS = {
  MOCK_GPS: 40,
  SPEEDING: 20,
  LOW_GPS_ACCURACY: 10,
  // Barème carburant (section 14) : la section 15 du cahier des charges ne couvre QUE les signaux
  // GPS listés ci-dessus — ces valeurs pour FUEL_ANOMALY sont une extension par analogie de sévérité
  // (choix assumé, documenté dans docs/PHASE4_NOTES.md), pas une valeur imposée par le cahier des charges.
  FUEL_ODOMETER_REGRESSION: 40, // odomètre < précédent plein : physiquement impossible, même sévérité que MOCK_GPS
  FUEL_RECEIPT_REUSED: 40, // même reçu (hash) réutilisé : fraude quasi certaine
  FUEL_EXCESSIVE_CONSUMPTION: 20,
  FUEL_OVER_TANK_CAPACITY: 20,
  FUEL_TOO_SOON: 15,
  FUEL_FAR_FROM_STATION: 10, // signal faible, purement indicatif (aucune station enregistrée = pas de signal)
} as const;

/** Point géographique normalisé : le même format partout (jamais [lng, lat] hors GeoJSON). */
export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface TimedLatLng extends LatLng {
  recordedAt?: Date | string;
  heading?: number | null;
}

export interface PlannedRoute {
  /** Géométrie planifiée (TomTom Routing) — distincte de la trace GPS réellement parcourue. */
  points: LatLng[];
  lengthInMeters: number;
  travelTimeInSeconds: number;
  trafficDelayInSeconds: number;
  /** Indices dans `points` du début de chaque tronçon (un par étape suivante). */
  legStartIndexes: number[];
}

export interface SnappedTrace {
  /** Trace nettoyée, DÉRIVÉE : ne remplace jamais les positions brutes stockées. */
  points: LatLng[];
  /** Nombre de points bruts envoyés à TomTom. */
  inputPoints: number;
  offRoadPoints: number;
}

export type TomTomErrorKind =
  | 'NOT_CONFIGURED'
  | 'INVALID_INPUT'
  | 'AUTH'
  | 'RATE_LIMITED'
  | 'UPSTREAM'
  | 'TIMEOUT'
  | 'MALFORMED';

export class TomTomError extends Error {
  constructor(
    readonly kind: TomTomErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'TomTomError';
  }
}

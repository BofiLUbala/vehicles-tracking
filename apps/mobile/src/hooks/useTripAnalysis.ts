import { useMemo } from 'react';
import { TimedPoint, TripAnalysis, analyzeTrip, formatDuration, speedColor } from '../geo/trace-analysis';
import type { MapPause, MapSegment } from '../map/tomtom-map';

export interface TripAnalysisView extends TripAnalysis {
  /** Tronçons prêts pour la carte (couleur de bande de vitesse). */
  mapSegments: MapSegment[];
  /** Arrêts détectés prêts pour la carte. */
  mapPauses: MapPause[];
}

/**
 * Analyse mémoïsée d'une trace nettoyée : recalculée seulement quand la trace change
 * (une fois par nouvelle position au plus).
 */
export function useTripAnalysis(trace: TimedPoint[]): TripAnalysisView {
  return useMemo(() => {
    const analysis = analyzeTrip(trace);
    return {
      ...analysis,
      mapSegments: analysis.segments.map((s) => ({ color: speedColor(s.band), points: s.points })),
      mapPauses: analysis.stops.map((s) => ({ latitude: s.latitude, longitude: s.longitude, label: formatDuration(s.durationSeconds) })),
    };
  }, [trace]);
}

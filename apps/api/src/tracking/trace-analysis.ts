/**
 * Analyse d'une trace GPS brute pour la carte temps réel : arrêts (lieu + durée), vitesses, et
 * échantillons pour l'affichage (survol : vitesse / heure / cap). Module pur, sans I/O.
 *
 * Même principe que l'analyse de trajet de l'application mobile (`apps/mobile/src/geo/trace-analysis.ts`) :
 * un arrêt est une suite de positions restant dans un petit rayon pendant au moins `minStopSeconds`.
 * Particularité côté serveur : un téléphone immobile envoie peu ou plus de positions ; un véhicule
 * dont la dernière position est lente et ancienne est donc « à l'arrêt depuis » cette position.
 */

export interface TracePoint {
  latitude: number;
  longitude: number;
  /** km/h (contrat de l'API). */
  speed: number | null;
  heading: number | null;
  recordedAt: Date;
}

export interface TraceStop {
  latitude: number;
  longitude: number;
  startedAt: string;
  /** Dernière position connue dans l'arrêt (arrêt en cours : la durée continue de croître). */
  endedAt: string;
  durationSeconds: number;
  /** `true` si le véhicule est toujours à cet endroit (dernière position de la trace). */
  ongoing: boolean;
}

export interface TraceSample {
  latitude: number;
  longitude: number;
  speedKmh: number | null;
  heading: number | null;
  recordedAt: string;
}

export interface TraceStats {
  maxSpeedKmh: number | null;
  /** Moyenne des vitesses mesurées en mouvement (au-dessus du seuil d'arrêt). */
  avgMovingSpeedKmh: number | null;
  stoppedSeconds: number;
}

export interface StopOptions {
  /** Rayon dans lequel les positions sont considérées au même endroit (m). */
  stopRadiusMeters: number;
  /** Durée minimale pour qu'un arrêt soit signalé (s). */
  minStopSeconds: number;
  /** En dessous, le véhicule est considéré immobile (km/h). */
  stoppedSpeedKmh: number;
}

export const DEFAULT_STOP_OPTIONS: StopOptions = {
  stopRadiusMeters: 40,
  minStopSeconds: 120,
  stoppedSpeedKmh: 3,
};

export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function centroid(points: TracePoint[]) {
  return {
    latitude: points.reduce((s, p) => s + p.latitude, 0) / points.length,
    longitude: points.reduce((s, p) => s + p.longitude, 0) / points.length,
  };
}

/** Arrêts d'une trace triée chronologiquement. `now` sert à dater un arrêt encore en cours. */
export function detectStops(points: TracePoint[], now: Date, options: Partial<StopOptions> = {}): TraceStop[] {
  const o = { ...DEFAULT_STOP_OPTIONS, ...options };
  const stops: TraceStop[] = [];
  let i = 0;
  while (i < points.length) {
    // Grappe : positions consécutives restant dans le rayon autour de la première.
    let j = i + 1;
    while (j < points.length && distanceMeters(points[i], points[j]) <= o.stopRadiusMeters) j++;
    const cluster = points.slice(i, j);
    const last = cluster[cluster.length - 1];
    const isTrailing = j === points.length;
    const lastSpeed = last.speed ?? 0;
    // Grappe finale d'un véhicule lent : l'arrêt dure jusqu'à maintenant, même sans nouvelle position.
    const ongoing = isTrailing && lastSpeed < o.stoppedSpeedKmh;
    const end = ongoing ? now : last.recordedAt;
    const duration = (end.getTime() - points[i].recordedAt.getTime()) / 1000;
    if ((cluster.length >= 2 || ongoing) && duration >= o.minStopSeconds) {
      stops.push({
        ...centroid(cluster),
        startedAt: points[i].recordedAt.toISOString(),
        endedAt: last.recordedAt.toISOString(),
        durationSeconds: Math.round(duration),
        ongoing,
      });
      i = j;
    } else {
      i++;
    }
  }
  return stops;
}

export function traceStats(points: TracePoint[], stops: TraceStop[], options: Partial<StopOptions> = {}): TraceStats {
  const o = { ...DEFAULT_STOP_OPTIONS, ...options };
  const speeds = points.map((p) => p.speed).filter((s): s is number => s != null && Number.isFinite(s) && s >= 0);
  const moving = speeds.filter((s) => s >= o.stoppedSpeedKmh);
  return {
    maxSpeedKmh: speeds.length ? Math.round(Math.max(...speeds)) : null,
    avgMovingSpeedKmh: moving.length ? Math.round(moving.reduce((a, b) => a + b, 0) / moving.length) : null,
    stoppedSeconds: stops.reduce((s, stop) => s + stop.durationSeconds, 0),
  };
}

/** Au plus `max` échantillons régulièrement espacés, le premier et le dernier toujours conservés. */
export function sampleTrace(points: TracePoint[], max: number): TraceSample[] {
  const toSample = (p: TracePoint): TraceSample => ({
    latitude: p.latitude,
    longitude: p.longitude,
    speedKmh: p.speed != null ? Math.round(p.speed) : null,
    heading: p.heading,
    recordedAt: p.recordedAt.toISOString(),
  });
  if (points.length <= max) return points.map(toSample);
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, k) => toSample(points[Math.round(k * step)]));
}

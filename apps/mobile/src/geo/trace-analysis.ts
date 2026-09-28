import { LatLng, bearingDegrees, distanceMeters, lerpLatLng } from './geo-math';

/**
 * Analyse d'un trajet à partir de la trace nettoyée (voir `gps-filter.ts`) : distance, durées,
 * vitesses, arrêts, courbe de vitesse et segments colorés par vitesse. Module pur.
 */

export interface TimedPoint extends LatLng {
  /** ISO 8601 */
  timestamp: string;
  /** m/s, telle que mesurée par le téléphone (facultative). */
  speed?: number | null;
}

export interface TripStats {
  distanceMeters: number;
  durationSeconds: number;
  movingSeconds: number;
  stoppedSeconds: number;
  /** Vitesse moyenne en mouvement (km/h). */
  avgMovingSpeedKmh: number;
  maxSpeedKmh: number;
  pointCount: number;
}

export interface DetectedStop extends LatLng {
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
}

export interface SpeedSample {
  /** Secondes depuis le début du trajet. */
  t: number;
  kmh: number;
}

export type SpeedBand = 'stopped' | 'slow' | 'urban' | 'road' | 'fast';

export interface SpeedSegment {
  band: SpeedBand;
  points: LatLng[];
}

export interface TripAnalysis {
  stats: TripStats;
  stops: DetectedStop[];
  speedSeries: SpeedSample[];
  segments: SpeedSegment[];
}

export interface AnalysisOptions {
  /** En dessous, le véhicule est considéré à l'arrêt (m/s). */
  movingThresholdMps: number;
  /** Rayon dans lequel un arrêt est reconnu (m). */
  stopRadiusMeters: number;
  /** Durée minimale d'un arrêt (s). */
  minStopSeconds: number;
  /** Un segment avec un trou plus long est ignoré pour les vitesses (perte de signal). */
  maxGapSeconds: number;
}

export const DEFAULT_ANALYSIS_OPTIONS: AnalysisOptions = {
  movingThresholdMps: 1,
  stopRadiusMeters: 40,
  minStopSeconds: 120,
  maxGapSeconds: 300,
};

/** Seuils (km/h) des bandes de vitesse, utilisés aussi pour la légende de la carte. */
export const SPEED_BANDS: { band: SpeedBand; maxKmh: number; color: string; label: string }[] = [
  { band: 'stopped', maxKmh: 5, color: '#94A3B8', label: '< 5 km/h' },
  { band: 'slow', maxKmh: 20, color: '#F97316', label: '5–20' },
  { band: 'urban', maxKmh: 50, color: '#22C55E', label: '20–50' },
  { band: 'road', maxKmh: 80, color: '#1479FF', label: '50–80' },
  { band: 'fast', maxKmh: Infinity, color: '#A21CAF', label: '> 80' },
];

export function speedBand(kmh: number): SpeedBand {
  return (SPEED_BANDS.find((b) => kmh < b.maxKmh) ?? SPEED_BANDS[SPEED_BANDS.length - 1]).band;
}

export function speedColor(band: SpeedBand): string {
  return SPEED_BANDS.find((b) => b.band === band)!.color;
}

const time = (p: TimedPoint) => Date.parse(p.timestamp);

/**
 * Vitesse d'un segment : la mesure du téléphone quand elle existe aux deux bouts (plus fiable à
 * basse vitesse), sinon distance / durée.
 */
function segmentSpeedMps(a: TimedPoint, b: TimedPoint, d: number, dt: number): number {
  if (a.speed != null && b.speed != null && a.speed >= 0 && b.speed >= 0) return (a.speed + b.speed) / 2;
  return dt > 0 ? d / dt : 0;
}

export function detectStops(points: TimedPoint[], options: Partial<AnalysisOptions> = {}): DetectedStop[] {
  const o = { ...DEFAULT_ANALYSIS_OPTIONS, ...options };
  const stops: DetectedStop[] = [];
  let i = 0;
  while (i < points.length) {
    // Grappe = points consécutifs restant dans le rayon autour du premier point.
    let j = i + 1;
    while (j < points.length && distanceMeters(points[i], points[j]) <= o.stopRadiusMeters) j++;
    const last = points[j - 1];
    const duration = (time(last) - time(points[i])) / 1000;
    if (j - i >= 2 && duration >= o.minStopSeconds) {
      const cluster = points.slice(i, j);
      stops.push({
        latitude: cluster.reduce((s, p) => s + p.latitude, 0) / cluster.length,
        longitude: cluster.reduce((s, p) => s + p.longitude, 0) / cluster.length,
        startedAt: points[i].timestamp,
        endedAt: last.timestamp,
        durationSeconds: Math.round(duration),
      });
      i = j;
    } else {
      i++;
    }
  }
  return stops;
}

export function analyzeTrip(points: TimedPoint[], options: Partial<AnalysisOptions> = {}): TripAnalysis {
  const o = { ...DEFAULT_ANALYSIS_OPTIONS, ...options };
  const stats: TripStats = {
    distanceMeters: 0,
    durationSeconds: 0,
    movingSeconds: 0,
    stoppedSeconds: 0,
    avgMovingSpeedKmh: 0,
    maxSpeedKmh: 0,
    pointCount: points.length,
  };
  const speedSeries: SpeedSample[] = [];
  const segments: SpeedSegment[] = [];
  if (points.length === 0) return { stats, stops: [], speedSeries, segments };

  const t0 = time(points[0]);
  stats.durationSeconds = Math.max(0, (time(points[points.length - 1]) - t0) / 1000);
  let movingDistance = 0;
  speedSeries.push({ t: 0, kmh: Math.max(0, (points[0].speed ?? 0) * 3.6) });

  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1];
    const b = points[k];
    const d = distanceMeters(a, b);
    const dt = (time(b) - time(a)) / 1000;
    stats.distanceMeters += d;
    if (dt <= 0) continue;
    const gap = dt > o.maxGapSeconds;
    const mps = gap ? 0 : segmentSpeedMps(a, b, d, dt);
    const kmh = mps * 3.6;
    if (!gap && mps >= o.movingThresholdMps) {
      stats.movingSeconds += dt;
      movingDistance += d;
    }
    if (!gap && kmh > stats.maxSpeedKmh) stats.maxSpeedKmh = kmh;
    speedSeries.push({ t: (time(b) - t0) / 1000, kmh });

    const band = speedBand(kmh);
    const current = segments[segments.length - 1];
    if (current && current.band === band) current.points.push(b);
    else segments.push({ band, points: [a, b] });
  }
  stats.stoppedSeconds = Math.max(0, stats.durationSeconds - stats.movingSeconds);
  stats.avgMovingSpeedKmh = stats.movingSeconds > 0 ? (movingDistance / stats.movingSeconds) * 3.6 : 0;
  stats.distanceMeters = Math.round(stats.distanceMeters);
  stats.maxSpeedKmh = Math.round(stats.maxSpeedKmh);
  stats.avgMovingSpeedKmh = Math.round(stats.avgMovingSpeedKmh);
  return { stats, stops: detectStops(points, o), speedSeries, segments };
}

export interface ReplayFrame extends LatLng {
  /** Cap interpolé (degrés). */
  bearing: number;
  /** Index du dernier point déjà dépassé (la trace « parcourue » s'arrête là + position courante). */
  index: number;
  /** ISO 8601 */
  timestamp: string;
}

/** Position interpolée au temps `tSeconds` (depuis le début du trajet) — rejeu du trajet. */
export function positionAt(points: TimedPoint[], tSeconds: number): ReplayFrame | null {
  if (points.length === 0) return null;
  const t0 = time(points[0]);
  const target = t0 + Math.max(0, tSeconds) * 1000;
  if (points.length === 1 || target <= t0) {
    const b = points.length > 1 ? bearingDegrees(points[0], points[1]) : 0;
    return { latitude: points[0].latitude, longitude: points[0].longitude, bearing: b, index: 0, timestamp: points[0].timestamp };
  }
  // Recherche dichotomique du segment [lo, lo+1] contenant `target`.
  let lo = 0;
  let hi = points.length - 1;
  if (target >= time(points[hi])) {
    const last = points[hi];
    return { latitude: last.latitude, longitude: last.longitude, bearing: bearingDegrees(points[hi - 1], last), index: hi, timestamp: last.timestamp };
  }
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (time(points[mid]) <= target) lo = mid;
    else hi = mid;
  }
  const a = points[lo];
  const b = points[hi];
  const span = time(b) - time(a);
  const f = span > 0 ? (target - time(a)) / span : 0;
  const p = lerpLatLng(a, b, f);
  return { ...p, bearing: bearingDegrees(a, b), index: lo, timestamp: new Date(target).toISOString() };
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(meters < 10_000 ? 2 : 1)} km`;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')}`;
  if (m > 0) return `${m} min`;
  return `${s} s`;
}

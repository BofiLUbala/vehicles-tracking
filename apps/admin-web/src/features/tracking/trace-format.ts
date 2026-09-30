import type { TraceSample, TraceStop } from '@/features/tracking/types';

const COMPASS = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'];

/** Cap GPS (degrés, 0 = nord, sens horaire) en direction lisible : « Ouest », « Nord-Est »… */
export function compassLabel(heading: number | null | undefined): string | null {
  if (heading == null || !Number.isFinite(heading) || heading < 0) return null;
  return COMPASS[Math.round((heading % 360) / 45) % 8];
}

/** Durée d'arrêt lisible : « 45 s », « 12 min », « 1 h 05 ». */
export function formatStopDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  const minutes = Math.floor(s / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}

/** Durée d'un arrêt ; un arrêt en cours continue de s'allonger jusqu'à `now`. */
export function stopDurationSeconds(stop: TraceStop, now = Date.now()): number {
  return stop.ongoing ? (now - new Date(stop.startedAt).getTime()) / 1000 : stop.durationSeconds;
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** Échantillon le plus proche d'un point (survol de la trace). Distance planaire : suffisant à l'échelle d'une ville. */
export function nearestSample(samples: TraceSample[], lat: number, lng: number): TraceSample | null {
  let best: TraceSample | null = null;
  let bestD = Infinity;
  const k = Math.cos((lat * Math.PI) / 180);
  for (const s of samples) {
    const d = (s.latitude - lat) ** 2 + ((s.longitude - lng) * k) ** 2;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

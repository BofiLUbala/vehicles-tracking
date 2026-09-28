import { distanceMeters, isValidLatLng } from './geo-math';

/**
 * Nettoyage des positions GPS pour l'AFFICHAGE et l'analyse sur le téléphone.
 *
 * Important : ce filtre ne touche jamais aux positions envoyées au serveur. Les points bruts
 * (y compris simulés ou imprécis) continuent d'être mis en file et synchronisés tels quels, car le
 * backend s'en sert pour l'audit et les alertes (GPS simulé, précision insuffisante…).
 *
 * Étapes :
 *  1. rejet des points inexploitables (simulés, précision trop mauvaise, horodatage en arrière) ;
 *  2. rejet des sauts physiquement impossibles (vitesse implicite > plafond, marge de précision
 *     incluse), avec resynchronisation après plusieurs rejets consécutifs (vrai déplacement après
 *     une perte de signal) ;
 *  3. lissage par filtre de Kalman (modèle à vitesse aléatoire, bruit de mesure = précision²).
 */

export interface RawFix {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  isMocked?: boolean;
  /** ISO 8601 */
  timestamp: string;
}

export interface CleanFix {
  latitude: number;
  longitude: number;
  /** Précision estimée après lissage (m). */
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: string;
}

export type RejectReason = 'invalid' | 'mocked' | 'low-accuracy' | 'out-of-order' | 'impossible-jump';

export type FilterResult = { accepted: true; fix: CleanFix } | { accepted: false; reason: RejectReason };

export interface GpsFilterOptions {
  /** Au-delà, le point est jugé trop imprécis pour la trace (m). */
  maxAccuracyM: number;
  /** Vitesse maximale plausible pour le véhicule (m/s). 45 m/s ≈ 162 km/h. */
  maxSpeedMps: number;
  /** Bruit de processus du Kalman : vitesse typique d'écart au modèle (m/s). */
  processNoiseMps: number;
  /** Nombre de sauts consécutifs rejetés avant d'accepter la nouvelle position (resynchronisation). */
  resyncAfterRejects: number;
}

export const DEFAULT_GPS_FILTER_OPTIONS: GpsFilterOptions = {
  maxAccuracyM: 50,
  maxSpeedMps: 45,
  processNoiseMps: 3,
  resyncAfterRejects: 3,
};

export interface GpsFilterStats {
  accepted: number;
  rejected: Record<RejectReason, number>;
}

const MIN_ACCURACY_M = 3;

export class GpsFilter {
  private readonly opts: GpsFilterOptions;
  private lat = 0;
  private lng = 0;
  /** Variance de l'estimation en m² ; < 0 = filtre non initialisé. */
  private variance = -1;
  private lastTime = 0;
  private last: CleanFix | null = null;
  private consecutiveJumps = 0;
  private stats: GpsFilterStats = GpsFilter.emptyStats();

  constructor(options: Partial<GpsFilterOptions> = {}) {
    this.opts = { ...DEFAULT_GPS_FILTER_OPTIONS, ...options };
  }

  static emptyStats(): GpsFilterStats {
    return { accepted: 0, rejected: { invalid: 0, mocked: 0, 'low-accuracy': 0, 'out-of-order': 0, 'impossible-jump': 0 } };
  }

  reset(): void {
    this.variance = -1;
    this.lastTime = 0;
    this.last = null;
    this.consecutiveJumps = 0;
    this.stats = GpsFilter.emptyStats();
  }

  getStats(): GpsFilterStats {
    return { accepted: this.stats.accepted, rejected: { ...this.stats.rejected } };
  }

  getLast(): CleanFix | null {
    return this.last;
  }

  push(raw: RawFix): FilterResult {
    const res = this.evaluate(raw);
    if (res.accepted) this.stats.accepted++;
    else this.stats.rejected[res.reason]++;
    return res;
  }

  private evaluate(raw: RawFix): FilterResult {
    const time = Date.parse(raw.timestamp);
    if (!isValidLatLng(raw) || !Number.isFinite(time)) return { accepted: false, reason: 'invalid' };
    if (raw.isMocked) return { accepted: false, reason: 'mocked' };
    const accuracy = Math.max(MIN_ACCURACY_M, raw.accuracy ?? this.opts.maxAccuracyM);
    if (accuracy > this.opts.maxAccuracyM) return { accepted: false, reason: 'low-accuracy' };
    if (this.variance >= 0 && time <= this.lastTime) return { accepted: false, reason: 'out-of-order' };

    if (this.variance >= 0 && this.last) {
      const dt = (time - this.lastTime) / 1000;
      const d = distanceMeters(this.last, raw);
      // Marge = précision des deux points : un écart couvert par l'incertitude n'est pas un saut.
      const explainable = this.opts.maxSpeedMps * dt + accuracy + this.last.accuracy;
      if (d > explainable) {
        this.consecutiveJumps++;
        if (this.consecutiveJumps < this.opts.resyncAfterRejects) return { accepted: false, reason: 'impossible-jump' };
        // Plusieurs points concordent sur la nouvelle position : c'est l'ancienne qui était fausse
        // (ou le signal a été perdu longtemps). On repart de zéro à cet endroit.
        this.variance = -1;
      }
    }
    this.consecutiveJumps = 0;

    const speed = raw.speed != null && raw.speed >= 0 ? raw.speed : null;
    if (this.variance < 0) {
      this.lat = raw.latitude;
      this.lng = raw.longitude;
      this.variance = accuracy * accuracy;
    } else {
      const dt = (time - this.lastTime) / 1000;
      // Plus le véhicule roule vite, plus on fait confiance à la nouvelle mesure.
      const q = Math.max(this.opts.processNoiseMps, speed ?? 0);
      this.variance += dt * q * q;
      const k = this.variance / (this.variance + accuracy * accuracy);
      this.lat += k * (raw.latitude - this.lat);
      this.lng += k * (raw.longitude - this.lng);
      this.variance *= 1 - k;
    }
    this.lastTime = time;
    this.last = {
      latitude: this.lat,
      longitude: this.lng,
      accuracy: Math.sqrt(this.variance),
      speed,
      heading: raw.heading != null && raw.heading >= 0 ? raw.heading : null,
      timestamp: raw.timestamp,
    };
    return { accepted: true, fix: this.last };
  }
}

/** Filtre une série complète (restauration d'une trace serveur / file locale). */
export function filterTrace(points: RawFix[], options?: Partial<GpsFilterOptions>): { fixes: CleanFix[]; stats: GpsFilterStats } {
  const f = new GpsFilter(options);
  const fixes: CleanFix[] = [];
  for (const p of points) {
    const r = f.push(p);
    if (r.accepted) fixes.push(r.fix);
  }
  return { fixes, stats: f.getStats() };
}

/** Part des points conservés, en % (100 si aucun point). */
export function gpsQualityPercent(stats: GpsFilterStats): number {
  const rejected = Object.values(stats.rejected).reduce((a, b) => a + b, 0);
  const total = stats.accepted + rejected;
  return total === 0 ? 100 : Math.round((stats.accepted / total) * 100);
}

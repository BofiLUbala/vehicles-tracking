import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LatLng, PlannedRoute, SnappedTrace, TimedLatLng, TomTomError } from './tomtom.types';

const BASE_URL = 'https://api.tomtom.com';
const MAX_ROUTE_WAYPOINTS = 150; // limite documentée de l'API Routing
const MAX_SNAP_POINTS = 5000; // limite documentée de Snap to Roads (plan standard)
const MAX_RETRIES = 2;
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

/**
 * Point d'entrée UNIQUE vers les API TomTom côté serveur (Routing, Snap to Roads). La clé serveur
 * ne quitte jamais ce service : elle n'est ni journalisée ni renvoyée dans une erreur.
 *
 * COÛT : chaque appel est facturé. Aucun appel ne doit être déclenché par point GPS ; les appelants
 * passent par des endpoints à la demande (mission consultée) et les résultats sont mis en cache ici.
 */
@Injectable()
export class TomTomService {
  private readonly logger = new Logger('TomTomService');
  private readonly cache = new Map<string, { expires: number; value: unknown }>();

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!this.config.get<string>('TOMTOM_API_KEY');
  }

  private timeoutMs(): number {
    const v = Number(this.config.get<string>('TOMTOM_TIMEOUT_MS'));
    return Number.isFinite(v) && v > 0 ? v : 8000;
  }

  static validate(points: LatLng[], min: number, max: number): void {
    if (points.length < min) throw new TomTomError('INVALID_INPUT', `Au moins ${min} points requis`);
    if (points.length > max) throw new TomTomError('INVALID_INPUT', `Au plus ${max} points autorisés`);
    for (const p of points) {
      if (
        !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude) ||
        Math.abs(p.latitude) > 90 || Math.abs(p.longitude) > 180
      ) {
        throw new TomTomError('INVALID_INPUT', 'Coordonnées invalides');
      }
    }
  }

  /** Itinéraire planifié via les étapes de mission, dans l'ordre. Mis en cache par géométrie d'entrée. */
  async calculateRoute(waypoints: LatLng[]): Promise<PlannedRoute> {
    TomTomService.validate(waypoints, 2, MAX_ROUTE_WAYPOINTS);
    const cacheKey = 'route:' + waypoints.map((p) => `${p.latitude.toFixed(6)},${p.longitude.toFixed(6)}`).join(':');
    const cached = this.cacheGet<PlannedRoute>(cacheKey);
    if (cached) return cached;

    const locations = waypoints.map((p) => `${p.latitude},${p.longitude}`).join(':');
    const json = await this.request('GET', `/routing/1/calculateRoute/${locations}/json`, {
      routeType: 'fastest',
      traffic: 'true',
      travelMode: 'truck',
    });
    const route = parseRoute(json);
    this.cacheSet(cacheKey, route);
    return route;
  }

  /**
   * Nettoie une trace GPS bruitée en UN SEUL appel batch. Le résultat est dérivé (affichage /
   * analytique) et ne doit jamais remplacer les positions brutes.
   */
  async snapToRoads(points: TimedLatLng[], cacheId?: string): Promise<SnappedTrace> {
    TomTomService.validate(points, 2, MAX_SNAP_POINTS);
    const cacheKey = cacheId ? `snap:${cacheId}:${points.length}` : null;
    if (cacheKey) {
      const cached = this.cacheGet<SnappedTrace>(cacheKey);
      if (cached) return cached;
    }
    const body = {
      points: points.map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
        properties: {
          ...(p.recordedAt ? { timestamp: new Date(p.recordedAt).toISOString() } : {}),
          ...(p.heading != null ? { heading: p.heading } : {}),
        },
      })),
    };
    const json = await this.request(
      'POST',
      '/snapToRoads/1',
      { fields: '{projectedPoints{geometry{coordinates},properties{snapResult}}}', vehicleType: 'Truck' },
      body,
    );
    const snapped = parseSnap(json, points.length);
    if (cacheKey) this.cacheSet(cacheKey, snapped);
    return snapped;
  }

  private async request(method: 'GET' | 'POST', path: string, query: Record<string, string>, body?: unknown): Promise<unknown> {
    const key = this.config.get<string>('TOMTOM_API_KEY');
    if (!key) throw new TomTomError('NOT_CONFIGURED', 'TomTom non configuré (TOMTOM_API_KEY)');
    const url = `${BASE_URL}${path}?${new URLSearchParams({ ...query, key }).toString()}`;

    for (let attempt = 0; ; attempt++) {
      try {
        return await this.once(method, url, body);
      } catch (err) {
        const e = err instanceof TomTomError ? err : new TomTomError('UPSTREAM', 'Erreur réseau TomTom');
        // Seules les erreurs transitoires sont rejouées : jamais 400/401/403/429 ni entrée invalide.
        const transient = e.kind === 'TIMEOUT' || (e.kind === 'UPSTREAM' && (e.status === undefined || e.status >= 500));
        if (!transient || attempt >= MAX_RETRIES) {
          // Seul le préfixe du chemin est journalisé : l'URL complète contient la clé.
          this.logger.warn(`TomTom ${method} /${path.split('/')[1]} -> ${e.kind}${e.status ? ` ${e.status}` : ''}`);
          throw e;
        }
        await new Promise((r) => setTimeout(r, 250 * 2 ** attempt));
      }
    }
  }

  private async once(method: 'GET' | 'POST', url: string, body?: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs());
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        signal: controller.signal,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') throw new TomTomError('TIMEOUT', 'Délai TomTom dépassé');
      throw new TomTomError('UPSTREAM', 'Erreur réseau TomTom');
    } finally {
      clearTimeout(timer);
    }
    if (res.status === 429) throw new TomTomError('RATE_LIMITED', 'Limite de débit TomTom atteinte', 429);
    if (res.status === 401 || res.status === 403) throw new TomTomError('AUTH', 'Clé TomTom refusée', res.status);
    if (res.status >= 400 && res.status < 500) throw new TomTomError('INVALID_INPUT', 'Requête TomTom refusée', res.status);
    if (!res.ok) throw new TomTomError('UPSTREAM', 'Erreur serveur TomTom', res.status);
    try {
      return await res.json();
    } catch {
      throw new TomTomError('MALFORMED', 'Réponse TomTom illisible');
    }
  }

  private cacheGet<T>(key: string): T | null {
    const hit = this.cache.get(key);
    if (!hit) return null;
    if (hit.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return hit.value as T;
  }

  private cacheSet(key: string, value: unknown) {
    if (this.cache.size >= CACHE_MAX_ENTRIES) this.cache.delete(this.cache.keys().next().value as string);
    this.cache.set(key, { expires: Date.now() + CACHE_TTL_MS, value });
  }
}

function isPoint(p: unknown): p is LatLng {
  const o = p as LatLng;
  return !!o && Number.isFinite(o.latitude) && Number.isFinite(o.longitude);
}

export function parseRoute(json: unknown): PlannedRoute {
  const route = (json as { routes?: { summary?: Record<string, number>; legs?: { points?: unknown[] }[] }[] })?.routes?.[0];
  if (!route?.legs?.length) throw new TomTomError('MALFORMED', 'Réponse de routage TomTom invalide');
  const points: LatLng[] = [];
  const legStartIndexes: number[] = [];
  for (const leg of route.legs) {
    legStartIndexes.push(points.length);
    for (const p of leg.points ?? []) {
      if (!isPoint(p)) throw new TomTomError('MALFORMED', 'Point de routage TomTom invalide');
      points.push({ latitude: p.latitude, longitude: p.longitude });
    }
  }
  if (points.length < 2) throw new TomTomError('MALFORMED', 'Itinéraire TomTom vide');
  return {
    points,
    legStartIndexes,
    lengthInMeters: route.summary?.lengthInMeters ?? 0,
    travelTimeInSeconds: route.summary?.travelTimeInSeconds ?? 0,
    trafficDelayInSeconds: route.summary?.trafficDelayInSeconds ?? 0,
  };
}

export function parseSnap(json: unknown, inputPoints: number): SnappedTrace {
  const projected = (json as { projectedPoints?: { geometry?: { coordinates?: number[] } | null; properties?: { snapResult?: string } }[] })
    ?.projectedPoints;
  if (!Array.isArray(projected)) throw new TomTomError('MALFORMED', 'Réponse Snap to Roads invalide');
  const points: LatLng[] = [];
  let offRoadPoints = 0;
  for (const f of projected) {
    // Cas NORMAL vérifié en conditions réelles : un point non recalé (`OffRoad`,
    // `MaxDistanceExceeded`) est renvoyé avec `geometry: null`. C'est précisément ce que produit
    // une trace GPS bruitée — on le compte comme non recalé au lieu de rejeter toute la réponse.
    const snapResult = f.properties?.snapResult;
    if (f.geometry === null || f.geometry === undefined) {
      offRoadPoints++;
      continue;
    }
    const c = f.geometry.coordinates;
    if (!c || c.length < 2 || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) {
      throw new TomTomError('MALFORMED', 'Point projeté invalide');
    }
    if (snapResult && snapResult !== 'Matched') offRoadPoints++;
    points.push({ latitude: c[1], longitude: c[0] }); // GeoJSON = [lng, lat]
  }
  return { points, inputPoints, offRoadPoints };
}

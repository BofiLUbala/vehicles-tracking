import type { Map as MapLibreMap } from 'maplibre-gl';

/**
 * Fond de carte partagé par toutes les cartes de l'admin.
 *
 * Fournisseur : TomTom Map Display (style vectoriel MapLibre) dès que `NEXT_PUBLIC_TOMTOM_API_KEY`
 * est défini. Cette clé est une clé CLIENT : elle finit dans le bundle navigateur, elle doit donc
 * être distincte de la clé serveur (`TOMTOM_API_KEY`) et restreinte côté portail TomTom.
 *
 * Sans clé TomTom, repli sur `NEXT_PUBLIC_MAP_STYLE_URL` (défaut : OpenFreeMap « liberty »), de sorte
 * que le dev local et la CI restent fonctionnels sans identifiants.
 *
 * Seul le fond de carte vient de TomTom : trace GPS, marqueurs et positions restent nos données.
 */
const TOMTOM_KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY?.trim() || '';
const TOMTOM_STYLE_VERSION = process.env.NEXT_PUBLIC_TOMTOM_STYLE_VERSION?.trim() || '24.*';
const FALLBACK_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty';

export const MAP_PROVIDER: 'tomtom' | 'fallback' = TOMTOM_KEY ? 'tomtom' : 'fallback';

/**
 * Styles TomTom exposés à l'admin. Chaque combinaison `map`/`poi` a été vérifiée en appel réel
 * (HTTP 200) contre l'API Map Display : voir la doc « Map Styles » (variante 2).
 */
export type MapBaseStyle = 'street' | 'dark' | 'driving' | 'driving-dark' | 'satellite';

const TOMTOM_BASE_STYLES: Record<MapBaseStyle, { map: string; poi: string }> = {
  street: { map: '2/basic_street-light', poi: '2/poi_light' },
  dark: { map: '2/basic_street-dark', poi: '2/poi_dark' },
  driving: { map: '2/basic_street-light-driving', poi: '2/poi_light' },
  'driving-dark': { map: '2/basic_street-dark-driving', poi: '2/poi_dark' },
  // Hybride = imagerie satellite + routes/labels. Le style déclare la source raster `satellite`
  // mais AUCUNE couche ne l'utilise : `ensureSatelliteBaseLayer` ajoute la couche manquante.
  satellite: { map: '2/hybrid_street-satellite', poi: '2/poi_satellite' },
};

export const MAP_BASE_STYLE_OPTIONS: { value: MapBaseStyle; label: string }[] = [
  { value: 'street', label: 'Standard' },
  { value: 'dark', label: 'Sombre' },
  { value: 'driving', label: 'Conduite' },
  { value: 'driving-dark', label: 'Conduite (nuit)' },
  { value: 'satellite', label: 'Satellite' },
];

export function tomtomStyleUrl(key: string, base: MapBaseStyle = 'street', version = TOMTOM_STYLE_VERSION): string {
  const s = TOMTOM_BASE_STYLES[base];
  const qs = new URLSearchParams({ key, map: s.map, poi: s.poi });
  return `https://api.tomtom.com/style/1/style/${version}?${qs.toString()}`;
}

/** URL de style pour un mode donné — repli OpenFreeMap si aucune clé TomTom n'est configurée. */
export function styleUrlFor(base: MapBaseStyle): string {
  return TOMTOM_KEY ? tomtomStyleUrl(TOMTOM_KEY, base) : FALLBACK_STYLE_URL;
}

/** Le sélecteur de style n'a de sens que si TomTom est le fournisseur actif. */
export const STYLE_SWITCHER_AVAILABLE = MAP_PROVIDER === 'tomtom';

export const MAP_STYLE_URL: string = styleUrlFor('street');

// --- Satellite ---------------------------------------------------------------------------------
export const SATELLITE_SOURCE_ID = 'satellite';
export const SATELLITE_LAYER_ID = 'tomtom-satellite-base';

/**
 * Le style hybride TomTom fournit la source raster `satellite` sans couche qui l'affiche (vérifié
 * sur le style 24.*). Sans cet ajout, le mode satellite n'afficherait que les routes sur un fond
 * vide. La couche est insérée SOUS toutes les autres pour rester un fond de carte.
 */
export function ensureSatelliteBaseLayer(map: MapLibreMap): void {
  try {
    if (!map.getSource(SATELLITE_SOURCE_ID)) return;
    if (map.getLayer(SATELLITE_LAYER_ID)) return;
    const firstLayerId = map.getStyle()?.layers?.[0]?.id;
    map.addLayer({ id: SATELLITE_LAYER_ID, type: 'raster', source: SATELLITE_SOURCE_ID }, firstLayerId);
  } catch {
    // Style pas encore prêt : réessayé au prochain chargement de style.
  }
}

// --- Trafic (optionnel, désactivé par défaut) --------------------------------------------------
const TRAFFIC_LAYERS = [
  // Styles documentés (Traffic API v4) : flux `relative`, incidents `s3`.
  { id: 'tomtom-traffic-flow', path: 'flow/relative' },
  { id: 'tomtom-traffic-incidents', path: 'incidents/s3' },
] as const;

/** Le trafic n'est disponible que si TomTom est le fournisseur actif. */
export const TRAFFIC_AVAILABLE = MAP_PROVIDER === 'tomtom';

/**
 * Ajoute/retire la surcouche de trafic (tuiles raster de flux + incidents). Les tuiles ne sont
 * demandées que tant que la couche est visible ; aucun appel backend n'est impliqué.
 */
export function setTrafficOverlay(map: MapLibreMap, enabled: boolean, key: string = TOMTOM_KEY): void {
  if (!key) return;
  try {
    if (!enabled) {
      for (const l of TRAFFIC_LAYERS) {
        if (map.getLayer(l.id)) map.removeLayer(l.id);
        if (map.getSource(l.id)) map.removeSource(l.id);
      }
      return;
    }
    for (const l of TRAFFIC_LAYERS) {
      if (map.getSource(l.id)) continue;
      map.addSource(l.id, {
        type: 'raster',
        tiles: [`https://api.tomtom.com/traffic/map/4/tile/${l.path}/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`],
        tileSize: 256,
        maxzoom: 22,
      });
      map.addLayer({ id: l.id, type: 'raster', source: l.id, paint: { 'raster-opacity': 0.85 } });
    }
  } catch {
    // Style pas encore prêt : l'appelant réessaie au prochain `styledata`.
  }
}

// --- Erreurs de fond de carte ------------------------------------------------------------------
/**
 * Convertit une erreur MapLibre (tuile/style refusé, réseau) en message lisible, ou `null` si elle
 * n'est pas bloquante. Le message ne contient jamais l'URL (donc jamais la clé).
 */
export function describeMapError(error: unknown): string | null {
  const e = error as { status?: number; message?: string } | undefined;
  if (!e) return null;
  if (e.status === 401 || e.status === 403) return 'Clé de carte refusée par le fournisseur (TomTom).';
  if (e.status === 429) return 'Limite de requêtes du fournisseur de carte atteinte.';
  if (typeof e.status === 'number' && e.status >= 500) return 'Le fournisseur de carte est momentanément indisponible.';
  if (e.status === undefined && /failed to fetch|networkerror|load failed/i.test(e.message ?? '')) {
    return 'Fond de carte inaccessible (réseau).';
  }
  return null;
}

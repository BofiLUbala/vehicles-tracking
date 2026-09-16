import type { Map as MapLibreMap } from 'maplibre-gl';
import type { CameraPreset } from '@/features/geo/view-mode';
import type { CameraTarget } from '@/features/geo/selection';

/** Source de relief ajoutée à la volée (le style de fond n'en fournit pas). */
export const TERRAIN_SOURCE_ID = 'geo-terrain-dem';

/**
 * Tuiles d'élévation « terrarium » (jeu public AWS Open Data, sans clé d'API). Surchargeable pour
 * pointer vers un fournisseur interne en production.
 */
export const TERRAIN_TILES_URL =
  process.env.NEXT_PUBLIC_MAP_TERRAIN_URL ??
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

/** Couche d'extrusion des bâtiments fournie par le style OpenFreeMap/OpenMapTiles (visible dès z14). */
export const BUILDINGS_3D_LAYER_ID = 'building-3d';

/**
 * Zoom minimal pour une vue 3D utile : la couche `building-3d` du style n'apparaît qu'à partir du
 * niveau 14. Ouvrir une ville en relief à un zoom plus large ne montrerait aucun bâtiment.
 */
export const MIN_BUILDINGS_ZOOM = 14.2;

/** Facteur d'accentuation du relief. */
const TERRAIN_EXAGGERATION = 1.2;

/**
 * Le style est-il exploitable (couches et sources manipulables) ?
 *
 * `map.isStyleLoaded()` ne convient pas : il reste `false` tant qu'un sprite ou des tuiles
 * manquent — ce qui arrive durablement avec certains fonds de carte publics — et bloquerait alors
 * définitivement la projection, le relief et les recadrages. Le style sérialisé, lui, est
 * disponible dès que la feuille de style est appliquée.
 */
export function isStyleUsable(map: MapLibreMap): boolean {
  try {
    const style = map.getStyle();
    return !!style && Array.isArray(style.layers) && style.layers.length > 0;
  } catch {
    return false;
  }
}

interface DesiredState {
  preset: CameraPreset;
  target: CameraTarget | null;
  /** Dernier lieu réellement survolé, pour ne pas rejouer le vol de caméra à chaque rendu. */
  flownTo: string | null;
  /** Une application est déjà en attente du prochain `styledata`. */
  pending: boolean;
}

// État souhaité par carte. Une WeakMap (plutôt qu'une capture dans la closure du report) garantit
// qu'un report déclenché avec un ancien preset applique bien l'état courant à son réveil.
const desired = new WeakMap<MapLibreMap, DesiredState>();

function targetKey(target: CameraTarget | null): string | null {
  return target ? `${target.center[0]},${target.center[1]},${target.zoom}` : null;
}

function ensureTerrainSource(map: MapLibreMap) {
  if (map.getSource(TERRAIN_SOURCE_ID)) return;
  map.addSource(TERRAIN_SOURCE_ID, {
    type: 'raster-dem',
    tiles: [TERRAIN_TILES_URL],
    encoding: 'terrarium',
    tileSize: 256,
    maxzoom: 13,
  });
}

function applyNow(map: MapLibreMap, state: DesiredState) {
  const { preset, target } = state;

  // Chaque réglage n'est écrit que s'il change réellement : ré-appliquer projection ou relief
  // pendant un vol de caméra interrompt l'animation (elle se termine alors immédiatement, au point
  // de départ). Cette fonction doit donc rester sans effet quand rien n'a changé.
  if (map.getProjection()?.type !== preset.projection) {
    map.setProjection({ type: preset.projection });
  }

  if (preset.terrain) {
    if (!map.getTerrain()) {
      ensureTerrainSource(map);
      map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: TERRAIN_EXAGGERATION });
    }
  } else if (map.getTerrain()) {
    map.setTerrain(null);
  }

  if (map.getLayer(BUILDINGS_3D_LAYER_ID)) {
    const visibility = preset.buildings3d ? 'visible' : 'none';
    if (map.getLayoutProperty(BUILDINGS_3D_LAYER_ID, 'visibility') !== visibility) {
      map.setLayoutProperty(BUILDINGS_3D_LAYER_ID, 'visibility', visibility);
    }
  }

  const key = targetKey(target);
  if (target && key !== state.flownTo) {
    state.flownTo = key;
    map.flyTo({
      center: target.center,
      // Un zoom trop large en relief ne montrerait aucun bâtiment (couche visible à partir de z14).
      zoom: preset.buildings3d ? Math.max(target.zoom, MIN_BUILDINGS_ZOOM) : target.zoom,
      pitch: preset.pitch,
      duration: 2000,
      // Pas de `essential: true` : quand le système demande des animations réduites, MapLibre
      // effectue le déplacement instantanément plutôt que de forcer le survol animé.
    });
    return;
  }

  // Pas de déplacement : on ajuste seulement l'inclinaison, pour que basculer « Plan 2D » ↔
  // « Relief 3D » redresse ou incline la vue sans changer de lieu.
  if (Math.round(map.getPitch()) !== preset.pitch) {
    map.easeTo({ pitch: preset.pitch, duration: 700 });
  }
}

/**
 * Point d'entrée unique : aligne la carte sur le mode d'affichage (projection, relief, bâtiments,
 * inclinaison) et sur le lieu sélectionné. Idempotent — appelable à chaque rendu : le vol de caméra
 * n'est rejoué que si le lieu a changé.
 *
 * Tant que le style n'est pas exploitable, l'application est reportée au prochain `styledata` (un
 * seul report en attente à la fois, qui relit l'état courant plutôt qu'un preset périmé).
 */
export function syncCamera(map: MapLibreMap, preset: CameraPreset, target: CameraTarget | null) {
  const state = desired.get(map) ?? { preset, target, flownTo: null, pending: false };
  state.preset = preset;
  state.target = target;
  desired.set(map, state);

  if (!isStyleUsable(map)) {
    if (state.pending) return;
    state.pending = true;
    map.once('styledata', () => {
      state.pending = false;
      syncCamera(map, state.preset, state.target);
    });
    return;
  }

  applyNow(map, state);
}

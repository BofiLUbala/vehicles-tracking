import { describe, expect, it, vi } from 'vitest';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { BUILDINGS_3D_LAYER_ID, MIN_BUILDINGS_ZOOM, syncCamera } from '@/features/geo/map-camera';
import { presetFor } from '@/features/geo/view-mode';
import type { CameraTarget } from '@/features/geo/selection';

/**
 * Carte MapLibre minimale : seules les méthodes utilisées par `syncCamera` sont simulées, avec un
 * état interne (projection, relief, visibilité des bâtiments) pour vérifier l'idempotence.
 */
function fakeMap(options: { styleUsable?: boolean } = {}) {
  let styleUsable = options.styleUsable ?? true;
  const state = {
    projection: 'mercator' as 'mercator' | 'globe',
    terrain: null as unknown,
    buildings: 'visible',
    pitch: 0,
    sources: new Set<string>(),
    styledataHandlers: [] as (() => void)[],
  };
  const map = {
    getStyle: () => (styleUsable ? { layers: [{ id: BUILDINGS_3D_LAYER_ID }] } : undefined),
    getProjection: vi.fn(() => ({ type: state.projection })),
    setProjection: vi.fn(({ type }: { type: 'mercator' | 'globe' }) => {
      state.projection = type;
    }),
    getTerrain: vi.fn(() => state.terrain),
    setTerrain: vi.fn((terrain: unknown) => {
      state.terrain = terrain;
    }),
    getSource: (id: string) => (state.sources.has(id) ? {} : undefined),
    addSource: vi.fn((id: string) => {
      state.sources.add(id);
    }),
    getLayer: (id: string) => (id === BUILDINGS_3D_LAYER_ID ? {} : undefined),
    getLayoutProperty: vi.fn(() => state.buildings),
    setLayoutProperty: vi.fn((_id: string, _prop: string, value: string) => {
      state.buildings = value;
    }),
    getPitch: () => state.pitch,
    easeTo: vi.fn(({ pitch }: { pitch?: number }) => {
      if (pitch !== undefined) state.pitch = pitch;
    }),
    flyTo: vi.fn(({ pitch }: { pitch?: number }) => {
      if (pitch !== undefined) state.pitch = pitch;
    }),
    once: (event: string, handler: () => void) => {
      if (event === 'styledata') state.styledataHandlers.push(handler);
    },
  };
  return {
    map: map as unknown as MapLibreMap,
    state,
    /** Simule la fin du chargement du style, puis rejoue les gestionnaires en attente. */
    loadStyle() {
      styleUsable = true;
      const handlers = state.styledataHandlers.splice(0);
      handlers.forEach((h) => h());
    },
  };
}

const GOMA: CameraTarget = { center: [29.2257, -1.6666], zoom: 12.4, level: 'city', name: 'Goma' };
const KINSHASA: CameraTarget = { center: [15.3123, -4.3217], zoom: 11.2, level: 'city', name: 'Kinshasa' };
const PROVINCE: CameraTarget = { center: [29.2257, -1.6666], zoom: 6.6, level: 'province', name: 'Nord-Kivu' };

describe('syncCamera', () => {
  it('passe la ville en relief 3D : projection plane, relief, bâtiments et caméra inclinée', () => {
    const { map, state } = fakeMap();
    syncCamera(map, presetFor('auto', 'city'), GOMA);

    expect(state.projection).toBe('mercator');
    expect(state.terrain).not.toBeNull();
    expect(state.buildings).toBe('visible');
    expect(map.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: GOMA.center, pitch: 60 }));
  });

  it('ouvre la ville assez près pour que les bâtiments 3D soient visibles', () => {
    const { map } = fakeMap();
    syncCamera(map, presetFor('auto', 'city'), GOMA);
    const { zoom } = (map.flyTo as unknown as { mock: { calls: [{ zoom: number }][] } }).mock.calls[0][0];
    expect(zoom).toBeGreaterThanOrEqual(MIN_BUILDINGS_ZOOM);
  });

  it('garde le zoom du lieu hors relief', () => {
    const { map } = fakeMap();
    syncCamera(map, presetFor('auto', 'province'), PROVINCE);
    expect(map.flyTo).toHaveBeenCalledWith(expect.objectContaining({ zoom: PROVINCE.zoom, pitch: 0 }));
  });

  it('ne réécrit rien quand rien ne change — ré-appliquer projection ou relief interromprait le vol de caméra', () => {
    const { map } = fakeMap();
    const preset = presetFor('auto', 'city');
    syncCamera(map, preset, GOMA);
    const projectionCalls = (map.setProjection as unknown as { mock: { calls: unknown[] } }).mock.calls.length;
    const terrainCalls = (map.setTerrain as unknown as { mock: { calls: unknown[] } }).mock.calls.length;

    syncCamera(map, preset, GOMA);
    syncCamera(map, preset, GOMA);

    expect((map.setProjection as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(projectionCalls);
    expect((map.setTerrain as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(terrainCalls);
    expect(map.flyTo).toHaveBeenCalledTimes(1);
  });

  it('rejoue le vol de caméra uniquement quand le lieu change', () => {
    const { map } = fakeMap();
    const preset = presetFor('auto', 'city');
    syncCamera(map, preset, GOMA);
    syncCamera(map, preset, GOMA);
    syncCamera(map, preset, KINSHASA);

    expect(map.flyTo).toHaveBeenCalledTimes(2);
    expect(map.flyTo).toHaveBeenLastCalledWith(expect.objectContaining({ center: KINSHASA.center }));
  });

  it('redresse ou incline la vue sans déplacement quand seul le mode change', () => {
    const { map, state } = fakeMap();
    syncCamera(map, presetFor('auto', 'city'), GOMA);
    expect(state.pitch).toBe(60);

    syncCamera(map, presetFor('plan', 'city'), GOMA);

    expect(map.easeTo).toHaveBeenCalledWith(expect.objectContaining({ pitch: 0 }));
    expect(map.flyTo).toHaveBeenCalledTimes(1); // pas de nouveau vol : le lieu n'a pas changé
    expect(state.terrain).toBeNull();
    expect(state.buildings).toBe('none');
  });

  it('applique l’état courant, et non un preset périmé, quand le style finit de charger', () => {
    const { map, state, loadStyle } = fakeMap({ styleUsable: false });

    syncCamera(map, presetFor('globe', 'world'), null);
    syncCamera(map, presetFor('auto', 'city'), GOMA);
    expect(map.flyTo).not.toHaveBeenCalled();

    loadStyle();

    expect(state.projection).toBe('mercator');
    expect(state.terrain).not.toBeNull();
    expect(map.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: GOMA.center, pitch: 60 }));
  });
});

import { describe, expect, it } from 'vitest';
import { MAP_BASE_STYLE_OPTIONS, describeMapError, ensureSatelliteBaseLayer, setTrafficOverlay, tomtomStyleUrl } from '@/features/geo/map-style';

describe('map-style (TomTom)', () => {
  it('builds a TomTom style URL with the requested base map', () => {
    const url = new URL(tomtomStyleUrl('K', 'street', '24.4.0-*'));
    expect(url.origin + url.pathname).toBe('https://api.tomtom.com/style/1/style/24.4.0-*');
    expect(url.searchParams.get('key')).toBe('K');
    expect(url.searchParams.get('map')).toBe('2/basic_street-light');
    expect(new URL(tomtomStyleUrl('K', 'dark')).searchParams.get('map')).toBe('2/basic_street-dark');
  });

  // Noms verifies en appel reel contre l'API Map Display (HTTP 200).
  it('maps every switcher option to a documented TomTom style name', () => {
    const expected: Record<string, string> = {
      street: '2/basic_street-light',
      dark: '2/basic_street-dark',
      driving: '2/basic_street-light-driving',
      'driving-dark': '2/basic_street-dark-driving',
      satellite: '2/hybrid_street-satellite',
    };
    for (const opt of MAP_BASE_STYLE_OPTIONS) {
      expect(new URL(tomtomStyleUrl('K', opt.value)).searchParams.get('map')).toBe(expected[opt.value]);
    }
  });

  it('adds the satellite raster layer the hybrid style declares but never uses', () => {
    const layers: { id: string; source?: string; beforeId?: string }[] = [{ id: 'roads' }];
    const map = {
      getSource: (id: string) => (id === 'satellite' ? {} : undefined),
      getLayer: (id: string) => layers.find((l) => l.id === id),
      getStyle: () => ({ layers }),
      addLayer: (l: { id: string; source?: string }, beforeId?: string) => layers.unshift({ ...l, beforeId }),
    };
    ensureSatelliteBaseLayer(map as never);
    ensureSatelliteBaseLayer(map as never); // idempotent
    const added = layers.filter((l) => l.id === 'tomtom-satellite-base');
    expect(added).toHaveLength(1);
    expect(added[0].beforeId).toBe('roads'); // inseree SOUS les autres couches
  });

  it('does nothing when the style has no satellite source', () => {
    const map = { getSource: () => undefined, getLayer: () => undefined, getStyle: () => ({ layers: [] }), addLayer: () => { throw new Error('must not add'); } };
    expect(() => ensureSatelliteBaseLayer(map as never)).not.toThrow();
  });

  it('describes blocking map errors without leaking the URL/key', () => {
    expect(describeMapError({ status: 403, message: 'https://api.tomtom.com/x?key=SECRET' })).not.toContain('SECRET');
    expect(describeMapError({ status: 403 })).toMatch(/refusée/);
    expect(describeMapError({ status: 429 })).toMatch(/Limite/);
    expect(describeMapError({ status: 503 })).toMatch(/indisponible/);
    expect(describeMapError({ message: 'Failed to fetch' })).toMatch(/réseau/);
    expect(describeMapError({ status: 404 })).toBeNull();
  });

  it('adds and removes the traffic overlay idempotently', () => {
    const sources = new Set<string>();
    const layers = new Set<string>();
    const map = {
      getSource: (id: string) => (sources.has(id) ? {} : undefined),
      getLayer: (id: string) => (layers.has(id) ? {} : undefined),
      addSource: (id: string) => sources.add(id),
      addLayer: (l: { id: string }) => layers.add(l.id),
      removeSource: (id: string) => sources.delete(id),
      removeLayer: (id: string) => layers.delete(id),
    };
    setTrafficOverlay(map as never, true, 'K');
    setTrafficOverlay(map as never, true, 'K');
    expect(sources.size).toBe(2); // flux + incidents
    expect([...layers].sort()).toEqual(['tomtom-traffic-flow', 'tomtom-traffic-incidents']);
    setTrafficOverlay(map as never, false, 'K');
    expect(sources.size + layers.size).toBe(0);
  });
});

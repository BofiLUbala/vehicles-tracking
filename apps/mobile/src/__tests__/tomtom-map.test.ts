import { describe, expect, it } from 'vitest';
import {
  buildMapHtml,
  buildUpdateScript,
  decimateTrace,
  describeMapFailure,
  parseMapMessage,
  replayScript,
  resolveStyleUrl,
  setStyleScript,
  toLngLat,
  MapState,
} from '../map/tomtom-map';

const baseState: MapState = {
  gps: { latitude: -4.32, longitude: 15.31, accuracy: 5 },
  trace: [{ latitude: -4.32, longitude: 15.31 }, { latitude: -4.33, longitude: 15.32 }],
  plannedRoute: [],
  stops: [{ id: 's1', name: 'Site <b>A</b>', order: 1, latitude: -4.3, longitude: 15.3, color: '#18A957' }],
  follow: true,
  recenterNonce: 0,
};

describe('tomtom-map', () => {
  it('uses the TomTom style when a key is set, OpenFreeMap otherwise', () => {
    const url = new URL(resolveStyleUrl('CLIENTKEY'));
    expect(url.hostname).toBe('api.tomtom.com');
    expect(url.searchParams.get('key')).toBe('CLIENTKEY');
    expect(resolveStyleUrl('')).toContain('openfreemap');
    expect(resolveStyleUrl(undefined)).toContain('openfreemap');
  });

  // Noms verifies en appel reel contre l'API Map Display (HTTP 200).
  it('maps mobile styles to documented TomTom style names', () => {
    expect(new URL(resolveStyleUrl('K', 'driving')).searchParams.get('map')).toBe('2/basic_street-light-driving');
    const sat = new URL(resolveStyleUrl('K', 'satellite'));
    expect(sat.searchParams.get('map')).toBe('2/hybrid_street-satellite');
    expect(sat.searchParams.get('poi')).toBe('2/poi_satellite');
    // Defaut = conduite (lisibilite au volant).
    expect(resolveStyleUrl('K')).toBe(resolveStyleUrl('K', 'driving'));
  });

  it('switches style via setStyle, never by reloading the document', () => {
    const script = setStyleScript(resolveStyleUrl('K', 'satellite'));
    expect(script).toContain('__setStyle');
    expect(script).not.toMatch(/location|reload/i);
  });

  it('re-installs trace/route layers on every style load (state survives a style switch)', () => {
    const html = buildMapHtml('https://api.tomtom.com/style/1/style/24.*?key=K', { lat: 1, lng: 2, zoom: 10 });
    expect(html).toContain("map.on('style.load',installLayers)");
    // La couche satellite manquante du style hybride est ajoutee par la WebView.
    expect(html).toContain('sat-base');
  });

  it('never swaps lat/lng: GeoJSON is [lng, lat]', () => {
    expect(toLngLat([{ latitude: -4.32, longitude: 15.31 }])).toEqual([[15.31, -4.32]]);
  });

  it('drops non-finite points instead of poisoning the trace', () => {
    expect(toLngLat([{ latitude: NaN, longitude: 1 }, { latitude: 1, longitude: 2 }])).toEqual([[2, 1]]);
  });

  it('decimates long traces for display only, keeping first and last', () => {
    const pts = Array.from({ length: 10000 }, (_, i) => ({ latitude: i, longitude: i }));
    const out = decimateTrace(pts, 500);
    expect(out).toHaveLength(500);
    expect(out[0]).toBe(pts[0]);
    expect(out[out.length - 1]).toBe(pts[pts.length - 1]);
    expect(pts).toHaveLength(10000);
  });

  it('keeps trace and planned route in separate payload fields', () => {
    const script = buildUpdateScript({ ...baseState, plannedRoute: [{ latitude: 1, longitude: 2 }, { latitude: 3, longitude: 4 }] });
    const payload = JSON.parse(script.slice(script.indexOf('(') + 1, script.lastIndexOf(');')).replace(/^.*?__update\(/, ''));
    expect(payload.trace).toEqual([[15.31, -4.32], [15.32, -4.33]]);
    expect(payload.route).toEqual([[2, 1], [4, 3]]);
  });

  it('escapes markup in injected data so it cannot break out of the script', () => {
    const script = buildUpdateScript(baseState);
    expect(script).not.toContain('<b>');
  });

  it('builds HTML that reports ready/error and never embeds a server key', () => {
    const html = buildMapHtml('https://api.tomtom.com/style/1/style/x?key=CLIENT', { lat: 1, lng: 2, zoom: 10 });
    expect(html).toContain('maplibre-gl');
    expect(html).toContain("type:'ready'");
    expect(html).not.toContain('TOMTOM_API_KEY');
  });

  it('parses only known WebView messages', () => {
    expect(parseMapMessage('{"type":"ready"}')).toEqual({ type: 'ready' });
    expect(parseMapMessage('{"type":"userMoved"}')).toEqual({ type: 'userMoved' });
    expect(parseMapMessage('{"type":"error","message":"x"}')).toEqual({ type: 'error', message: 'x' });
    expect(parseMapMessage('{"type":"evil"}')).toBeNull();
    expect(parseMapMessage('not json')).toBeNull();
  });

  it('describes failures without URLs', () => {
    expect(describeMapFailure(403)).toMatch(/refusée/);
    expect(describeMapFailure(429)).toMatch(/Limite/);
    expect(describeMapFailure()).toMatch(/indisponible/);
  });

  it('injects a WebView script that is valid JavaScript', () => {
    const html = buildMapHtml('https://x/style', { lat: 1, lng: 2, zoom: 10 }, { vehicleModelUrl: 'https://cdn.example/truck.glb' });
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(scripts).toHaveLength(1);
    // Syntaxe seulement (le code n'est pas exécuté) ; `import()` est remplacé car interdit hors module ici.
    expect(() => new Function(scripts[0].replace(/import\(/g, 'Promise.resolve('))).not.toThrow();
    expect(html).toContain('"three":"https://cdn.jsdelivr.net/npm/three@');
    expect(html).toContain('truck.glb');
  });

  it('only accepts https vehicle models', () => {
    const html = buildMapHtml('https://x/style', { lat: 1, lng: 2, zoom: 10 }, { vehicleModelUrl: 'http://evil/x.glb' });
    expect(html).not.toContain('evil');
  });

  it('sends heading, speed, time and 3D/replay flags for smooth vehicle rendering', () => {
    const script = buildUpdateScript({
      ...baseState,
      gps: { latitude: 1, longitude: 2, accuracy: 8, heading: 90, speed: 12, timestamp: '2026-09-28T08:00:10.000Z' },
      trace: [
        { latitude: 1, longitude: 2, timestamp: '2026-09-28T08:00:00.000Z' },
        { latitude: 1.1, longitude: 2.1, timestamp: '2026-09-28T08:00:10.000Z' },
      ],
      traceSegments: [{ color: '#22C55E', points: [{ latitude: 1, longitude: 2 }, { latitude: 1.1, longitude: 2.1 }] }],
      pauses: [{ latitude: 1, longitude: 2, label: '5 min' }],
      view3d: true,
      replay: true,
    });
    const payload = JSON.parse(script.replace(/^window\.__update && window\.__update\(/, '').replace(/\); true;$/, ''));
    expect(payload.gps).toEqual({ lng: 2, lat: 1, acc: 8, heading: 90, speed: 12, time: Date.parse('2026-09-28T08:00:10.000Z') });
    expect(payload.traceT).toEqual([0, 10000]);
    expect(payload.segments).toEqual([{ color: '#22C55E', coords: [[2, 1], [2.1, 1.1]] }]);
    expect(payload.pauses).toEqual([{ label: '5 min', lng: 2, lat: 1 }]);
    expect(payload.view3d).toBe(true);
    expect(payload.replay).toBe(true);
  });

  it('omits trace times when the trace is not timestamped', () => {
    const script = buildUpdateScript(baseState);
    expect(script).toContain('"traceT":[]');
  });

  it('builds a tiny replay script', () => {
    expect(replayScript({ latitude: 1, longitude: 2, bearing: NaN, elapsedMs: -5 })).toBe(
      'window.__replay && window.__replay({"lng":2,"lat":1,"bearing":0,"t":0}); true;',
    );
  });
});

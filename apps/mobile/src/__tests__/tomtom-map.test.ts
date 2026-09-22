import { describe, expect, it } from 'vitest';
import {
  buildMapHtml,
  buildUpdateScript,
  decimateTrace,
  describeMapFailure,
  parseMapMessage,
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
});

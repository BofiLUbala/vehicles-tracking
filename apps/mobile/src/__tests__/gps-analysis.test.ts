import { describe, expect, it } from 'vitest';
import { bearingDegrees, distanceMeters, lerpAngle } from '../geo/geo-math';
import { GpsFilter, RawFix, filterTrace, gpsQualityPercent } from '../geo/gps-filter';
import { analyzeTrip, detectStops, formatDistance, formatDuration, positionAt, speedBand, TimedPoint } from '../geo/trace-analysis';

const T0 = Date.parse('2026-09-28T08:00:00.000Z');
const at = (s: number) => new Date(T0 + s * 1000).toISOString();
// ~111 m par millième de degré de latitude.
const fix = (s: number, dLatMilli: number, extra: Partial<RawFix> = {}): RawFix => ({
  latitude: -4.3 + dLatMilli / 1000,
  longitude: 15.3,
  accuracy: 5,
  timestamp: at(s),
  ...extra,
});

describe('geo-math', () => {
  it('computes haversine distance and bearing', () => {
    const a = { latitude: 0, longitude: 0 };
    expect(distanceMeters(a, { latitude: 0.001, longitude: 0 })).toBeCloseTo(111.2, 0);
    expect(bearingDegrees(a, { latitude: 0.001, longitude: 0 })).toBeCloseTo(0, 5);
    expect(bearingDegrees(a, { latitude: 0, longitude: 0.001 })).toBeCloseTo(90, 5);
  });

  it('interpolates angles through north', () => {
    expect(lerpAngle(350, 10, 0.5)).toBeCloseTo(0, 5);
    expect(lerpAngle(10, 350, 0.25)).toBeCloseTo(5, 5);
  });
});

describe('GpsFilter', () => {
  it('rejects mocked, imprecise and out-of-order points', () => {
    const f = new GpsFilter();
    expect(f.push(fix(0, 0, { isMocked: true }))).toEqual({ accepted: false, reason: 'mocked' });
    expect(f.push(fix(0, 0, { accuracy: 120 }))).toEqual({ accepted: false, reason: 'low-accuracy' });
    expect(f.push(fix(10, 0)).accepted).toBe(true);
    expect(f.push(fix(5, 0.1))).toEqual({ accepted: false, reason: 'out-of-order' });
    expect(f.push({ ...fix(20, 0), latitude: NaN })).toEqual({ accepted: false, reason: 'invalid' });
    expect(gpsQualityPercent(f.getStats())).toBe(20);
  });

  it('rejects a physically impossible jump, then resyncs if the new position persists', () => {
    const f = new GpsFilter({ resyncAfterRejects: 3 });
    f.push(fix(0, 0));
    // 10 km en 10 s = 3600 km/h.
    expect(f.push(fix(10, 90))).toEqual({ accepted: false, reason: 'impossible-jump' });
    expect(f.push(fix(20, 90.1))).toEqual({ accepted: false, reason: 'impossible-jump' });
    const r = f.push(fix(30, 90.2));
    expect(r.accepted).toBe(true);
    if (r.accepted) expect(r.fix.latitude).toBeCloseTo(-4.3 + 0.0902, 6);
  });

  it('smooths jitter: a noisy stationary series stays close to the true position', () => {
    const noise = [0.2, -0.25, 0.15, -0.1, 0.3, -0.2, 0.1, -0.3]; // ± ~30 m
    const { fixes } = filterTrace(noise.map((n, i) => fix(i * 5, n, { accuracy: 30 })));
    const last = fixes[fixes.length - 1];
    expect(Math.abs(last.latitude - -4.3) * 111_000).toBeLessThan(12);
    expect(last.accuracy).toBeLessThan(30);
  });

  it('follows a moving vehicle without lagging far behind', () => {
    // 12 m/s vers le nord, un point toutes les 10 s.
    const pts = Array.from({ length: 10 }, (_, i) => fix(i * 10, (i * 120) / 111, { speed: 12 }));
    const { fixes } = filterTrace(pts);
    expect(fixes).toHaveLength(10);
    const lagM = distanceMeters(fixes[9], pts[9]);
    expect(lagM).toBeLessThan(5);
  });
});

describe('trace-analysis', () => {
  const tp = (s: number, dLatMilli: number, speed?: number): TimedPoint => ({
    latitude: -4.3 + dLatMilli / 1000,
    longitude: 15.3,
    timestamp: at(s),
    speed,
  });

  it('computes distance, durations and speeds', () => {
    // 0-60 s : roule à ~11 m/s ; 60-300 s : arrêt ; 300-360 s : roule.
    const pts = [tp(0, 0), tp(30, 3), tp(60, 6), tp(180, 6.01), tp(300, 6.02), tp(330, 9), tp(360, 12)];
    const { stats, stops, speedSeries, segments } = analyzeTrip(pts);
    expect(stats.distanceMeters).toBeGreaterThan(1300);
    expect(stats.distanceMeters).toBeLessThan(1360);
    expect(stats.durationSeconds).toBe(360);
    expect(stats.movingSeconds).toBe(120);
    expect(stats.stoppedSeconds).toBe(240);
    expect(stats.maxSpeedKmh).toBeGreaterThanOrEqual(39);
    expect(stats.avgMovingSpeedKmh).toBeGreaterThan(35);
    expect(stops).toHaveLength(1);
    expect(stops[0].durationSeconds).toBe(240);
    expect(speedSeries).toHaveLength(pts.length);
    expect(segments.map((s) => s.band)).toEqual(['urban', 'stopped', 'urban']);
  });

  it('prefers the device speed when both ends have it', () => {
    const { stats } = analyzeTrip([tp(0, 0, 20), tp(10, 1, 20)]);
    expect(stats.maxSpeedKmh).toBe(72);
  });

  it('ignores speeds across long signal gaps', () => {
    const { stats } = analyzeTrip([tp(0, 0), tp(3600, 100)]);
    expect(stats.maxSpeedKmh).toBe(0);
  });

  it('does not report short pauses as stops', () => {
    expect(detectStops([tp(0, 0), tp(60, 0.01), tp(90, 3)])).toHaveLength(0);
  });

  it('maps speeds to bands', () => {
    expect(speedBand(0)).toBe('stopped');
    expect(speedBand(12)).toBe('slow');
    expect(speedBand(45)).toBe('urban');
    expect(speedBand(70)).toBe('road');
    expect(speedBand(95)).toBe('fast');
  });

  it('interpolates the replay position', () => {
    const pts = [tp(0, 0), tp(10, 1), tp(20, 2)];
    const mid = positionAt(pts, 15)!;
    expect(mid.latitude).toBeCloseTo(-4.3 + 0.0015, 8);
    expect(mid.index).toBe(1);
    expect(mid.bearing).toBeCloseTo(0, 3);
    expect(positionAt(pts, -5)!.index).toBe(0);
    expect(positionAt(pts, 99)!.index).toBe(2);
    expect(positionAt([], 3)).toBeNull();
  });

  it('formats distances and durations', () => {
    expect(formatDistance(850)).toBe('850 m');
    expect(formatDistance(1234)).toBe('1.23 km');
    expect(formatDistance(25_400)).toBe('25.4 km');
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(600)).toBe('10 min');
    expect(formatDuration(3900)).toBe('1 h 05');
  });
});

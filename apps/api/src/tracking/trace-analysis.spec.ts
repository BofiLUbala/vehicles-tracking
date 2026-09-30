import { detectStops, sampleTrace, traceStats, TracePoint } from './trace-analysis';

const T0 = new Date('2026-09-29T10:00:00Z').getTime();
const at = (s: number) => new Date(T0 + s * 1000);
// ~25 m par pas vers l'ouest à Kinshasa.
const moving = (s: number, k: number, speed = 45): TracePoint => ({
  latitude: -4.3036,
  longitude: 15.3142 - k * 0.000225,
  speed,
  heading: 270,
  recordedAt: at(s),
});
const parked = (s: number, jitter = 0): TracePoint => ({
  latitude: -4.3036 + jitter * 0.00001,
  longitude: 15.3,
  speed: 0,
  heading: null,
  recordedAt: at(s),
});

describe('analyse de trace : arrêts et vitesses', () => {
  it("détecte un arrêt terminé avec sa durée et l'endroit", () => {
    const points = [moving(0, 0), moving(2, 1), parked(10), parked(200, 1), parked(610, 2), moving(620, 70), moving(622, 71)];
    const stops = detectStops(points, at(700));
    expect(stops).toHaveLength(1);
    expect(stops[0]).toMatchObject({ durationSeconds: 600, ongoing: false, startedAt: at(10).toISOString() });
    expect(stops[0].longitude).toBeCloseTo(15.3, 4);
  });

  it('ignore un ralentissement trop court (feu rouge)', () => {
    const points = [moving(0, 0), parked(10), parked(40, 1), moving(50, 70)];
    expect(detectStops(points, at(60))).toEqual([]);
  });

  it("un véhicule immobile qui n'envoie plus de positions est « à l'arrêt depuis » sa dernière position", () => {
    const points = [moving(0, 0), moving(2, 1), parked(10)];
    const stops = detectStops(points, at(10 + 15 * 60));
    expect(stops).toEqual([expect.objectContaining({ ongoing: true, durationSeconds: 900, startedAt: at(10).toISOString() })]);
  });

  it("un véhicule en mouvement n'est jamais en arrêt en cours", () => {
    const points = [moving(0, 0), moving(2, 1)];
    expect(detectStops(points, at(3600))).toEqual([]);
  });

  it('calcule vitesse max, vitesse moyenne en mouvement et temps arrêté', () => {
    const points = [moving(0, 0, 30), moving(2, 1, 60), parked(10), parked(310, 1), moving(320, 70, 45)];
    const stops = detectStops(points, at(330));
    expect(traceStats(points, stops)).toEqual({ maxSpeedKmh: 60, avgMovingSpeedKmh: 45, stoppedSeconds: 300 });
  });

  it('échantillonne en conservant le premier et le dernier point', () => {
    const points = Array.from({ length: 1000 }, (_, k) => moving(k * 2, k));
    const samples = sampleTrace(points, 100);
    expect(samples).toHaveLength(100);
    expect(samples[0].recordedAt).toBe(points[0].recordedAt.toISOString());
    expect(samples[99].recordedAt).toBe(points[999].recordedAt.toISOString());
    expect(samples[0]).toMatchObject({ speedKmh: 45, heading: 270 });
  });
});

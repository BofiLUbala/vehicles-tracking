import { describe, expect, it } from 'vitest';
import { compassLabel, formatStopDuration, nearestSample, stopDurationSeconds } from '@/features/tracking/trace-format';

describe('trace-format', () => {
  it('traduit le cap GPS en direction', () => {
    expect(compassLabel(0)).toBe('Nord');
    expect(compassLabel(250)).toBe('Ouest');
    expect(compassLabel(315)).toBe('Nord-Ouest');
    expect(compassLabel(359)).toBe('Nord');
    expect(compassLabel(null)).toBeNull();
    expect(compassLabel(-1)).toBeNull();
  });

  it("formate la durée d'un arrêt", () => {
    expect(formatStopDuration(42)).toBe('42 s');
    expect(formatStopDuration(12 * 60 + 30)).toBe('12 min');
    expect(formatStopDuration(65 * 60)).toBe('1 h 05');
  });

  it("un arrêt en cours s'allonge jusqu'à maintenant", () => {
    const startedAt = '2026-09-29T10:00:00.000Z';
    const stop = { latitude: 0, longitude: 0, startedAt, endedAt: startedAt, durationSeconds: 120, ongoing: true };
    expect(stopDurationSeconds(stop, Date.parse('2026-09-29T10:15:00.000Z'))).toBe(900);
    expect(stopDurationSeconds({ ...stop, ongoing: false })).toBe(120);
  });

  it('trouve le point de trace le plus proche du curseur', () => {
    const samples = [
      { latitude: -4.30, longitude: 15.31, speedKmh: 30, heading: 270, recordedAt: 'a' },
      { latitude: -4.31, longitude: 15.30, speedKmh: 50, heading: 180, recordedAt: 'b' },
    ];
    expect(nearestSample(samples, -4.309, 15.301)?.speedKmh).toBe(50);
    expect(nearestSample([], 0, 0)).toBeNull();
  });
});

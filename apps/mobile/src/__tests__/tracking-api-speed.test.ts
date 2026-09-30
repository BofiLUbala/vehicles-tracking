import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrackingApi, toApiPosition } from '../api/tracking.api';
import { apiClient } from '../api/client';

vi.mock('../api/client', () => ({
  apiClient: { post: vi.fn() },
}));

const base = {
  clientEventId: 'e1',
  vehicleId: 'v1',
  latitude: -4.3,
  longitude: 15.3,
  isMocked: false,
  recordedAt: '2026-09-29T12:00:00.000Z',
};

describe('vitesse GPS : m/s côté app, km/h côté API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('convertit la vitesse expo-location (m/s) en km/h', () => {
    expect(toApiPosition({ ...base, speed: 12.5 }).speed).toBe(45);
    expect(toApiPosition({ ...base, speed: 0 }).speed).toBe(0);
  });

  it('envoie une vitesse indisponible (négative ou absente) comme null', () => {
    expect(toApiPosition({ ...base, speed: -1 }).speed).toBeNull();
    expect(toApiPosition({ ...base, speed: null }).speed).toBeNull();
    expect(toApiPosition({ ...base }).speed).toBeNull();
  });

  it('convertit chaque position du lot envoyé', async () => {
    (apiClient.post as any).mockResolvedValueOnce({ data: [] });
    await TrackingApi.sendPositionsBatch([{ ...base, speed: 10 }, { ...base, clientEventId: 'e2', speed: 2.5 }]);
    const body = (apiClient.post as any).mock.calls[0][1];
    expect(body.positions.map((p: { speed: number }) => p.speed)).toEqual([36, 9]);
  });
});

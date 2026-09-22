import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MissionsApi } from '../api/missions.api';
import { apiClient } from '../api/client';

vi.mock('../api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
  setForceLogoutHandler: vi.fn(),
}));

describe('MissionsApi (driver assignment visibility)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches today missions from the driver-scoped endpoint (no driverId param needed)', async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      data: [
        { id: 'm-1', status: 'PLANNED', driverId: 'd-1', steps: [] },
        { id: 'm-2', status: 'ASSIGNED', driverId: 'd-1', steps: [] },
      ],
    });

    const missions = await MissionsApi.getTodayMissions();

    expect(apiClient.get).toHaveBeenCalledWith('/mobile/missions/today');
    // Les missions nouvellement affectées (PLANNED ou ASSIGNED) remontent sans filtre côté client.
    expect(missions.map((m: any) => m.id)).toEqual(['m-1', 'm-2']);
  });

  it('refetch returns the newly assigned mission on the next call (fallback polling)', async () => {
    (apiClient.get as any)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [{ id: 'm-new', status: 'PLANNED', driverId: 'd-1', steps: [] }] });

    expect(await MissionsApi.getTodayMissions()).toHaveLength(0);
    // Après l'événement mission.assigned (ou focus/refresh), le réappel expose la mission.
    const refetched = await MissionsApi.getTodayMissions();
    expect(refetched.map((m: any) => m.id)).toEqual(['m-new']);
  });

  it('loads completed mission history from the dedicated driver endpoint', async () => {
    (apiClient.get as any).mockResolvedValueOnce({ data: [{ id: 'm-old', status: 'COMPLETED', steps: [] }] });
    const history = await MissionsApi.getMissionHistory();
    expect(apiClient.get).toHaveBeenCalledWith('/mobile/missions/history');
    expect(history[0].id).toBe('m-old');
  });

  it('starts and completes a mission through backend state transitions', async () => {
    (apiClient.post as any)
      .mockResolvedValueOnce({ data: { id: 'm-1', status: 'STARTED' } })
      .mockResolvedValueOnce({ data: { id: 'm-1', status: 'COMPLETED' } });
    expect((await MissionsApi.startMission('m-1')).status).toBe('STARTED');
    expect((await MissionsApi.completeMission('m-1')).status).toBe('COMPLETED');
    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/missions/m-1/start');
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/missions/m-1/complete');
  });
});

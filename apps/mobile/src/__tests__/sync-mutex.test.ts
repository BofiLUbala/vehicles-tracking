import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncService } from '../services/sync.service';
import { TrackingApi } from '../api/tracking.api';
import { GpsQueueRepository } from '../database/gps-queue.repository';
import { ValidationQueueRepository } from '../database/validation-queue.repository';
import { FuelQueueRepository } from '../database/fuel-queue.repository';

describe('Synchronization Mutex & Concurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows only ONE active synchronization cycle when triggered simultaneously', async () => {
    // Mock database queue items
    const sampleGps = {
      id: 1,
      client_event_id: 'gps-test-1',
      vehicle_id: 'veh-1',
      latitude: -4.3,
      longitude: 15.3,
      recorded_at: new Date().toISOString(),
      created_at_device: new Date().toISOString(),
      sync_status: 'pending' as const,
      retry_count: 0,
      is_mocked: 0,
    };

    vi.spyOn(GpsQueueRepository, 'getNextBatch').mockReturnValue([sampleGps]);
    vi.spyOn(GpsQueueRepository, 'markUploading').mockImplementation(() => {});
    vi.spyOn(GpsQueueRepository, 'markSynced').mockImplementation(() => {});
    vi.spyOn(ValidationQueueRepository, 'getNextBatch').mockReturnValue([]);
    vi.spyOn(FuelQueueRepository, 'getNextBatch').mockReturnValue([]);

    let apiCalls = 0;
    vi.spyOn(TrackingApi, 'sendPositionsBatch').mockImplementation(async (payloads) => {
      apiCalls++;
      // Simulate network duration
      await new Promise((resolve) => setTimeout(resolve, 50));
      return payloads.map((p) => ({
        clientEventId: p.clientEventId,
        status: 'created' as const,
      }));
    });

    // Fire 4 simultaneous sync triggers (NetInfo reconnect, foreground timer, AppState, user button)
    const trigger1 = SyncService.syncNow(false);
    const trigger2 = SyncService.syncNow(false);
    const trigger3 = SyncService.syncNow(false);
    const trigger4 = SyncService.syncNow(false);

    expect(SyncService.getIsSyncing()).toBe(true);

    await Promise.all([trigger1, trigger2, trigger3, trigger4]);

    expect(SyncService.getIsSyncing()).toBe(false);
    // Even though 4 callers initiated syncNow(), only 1 network execution happened!
    expect(apiCalls).toBe(1);
    expect(GpsQueueRepository.markSynced).toHaveBeenCalledWith([1]);
  });
});

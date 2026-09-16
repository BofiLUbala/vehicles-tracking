import { getDatabase } from './db';
import { PendingGpsPositionRow } from '../types/sync.types';
import { GpsPositionPayload } from '../types/tracking.types';

export interface EnqueueGpsParams {
  clientEventId?: string;
  vehicleId: string;
  missionId?: string | null;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  isMocked?: boolean;
  recordedAt?: string;
}

export const GpsQueueRepository = {
  enqueue(params: EnqueueGpsParams): void {
    const db = getDatabase();
    const clientEventId = params.clientEventId || `gps_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const recordedAt = params.recordedAt || new Date().toISOString();
    const createdAtDevice = new Date().toISOString();

    db.runSync(
      `INSERT OR IGNORE INTO pending_gps_positions (
        client_event_id, vehicle_id, mission_id, latitude, longitude,
        accuracy, altitude, speed, heading, is_mocked,
        recorded_at, created_at_device, sync_status, retry_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
      [
        clientEventId,
        params.vehicleId,
        params.missionId || null,
        params.latitude,
        params.longitude,
        params.accuracy ?? null,
        params.altitude ?? null,
        params.speed ?? null,
        params.heading ?? null,
        params.isMocked ? 1 : 0,
        recordedAt,
        createdAtDevice,
      ]
    );
  },

  getNextBatch(limit = 100, force = false, maxAutoRetries = 8): PendingGpsPositionRow[] {
    const db = getDatabase();
    const nowIso = new Date().toISOString();

    if (force) {
      return db.getAllSync<PendingGpsPositionRow>(
        `SELECT * FROM pending_gps_positions 
         WHERE sync_status != 'synced' AND sync_status != 'uploading'
         ORDER BY recorded_at ASC LIMIT ?`,
        [limit]
      );
    }

    return db.getAllSync<PendingGpsPositionRow>(
      `SELECT * FROM pending_gps_positions 
       WHERE sync_status IN ('pending', 'failed')
         AND retry_count < ?
         AND (next_retry_at IS NULL OR next_retry_at <= ?)
       ORDER BY recorded_at ASC LIMIT ?`,
      [maxAutoRetries, nowIso, limit]
    );
  },

  markUploading(ids: number[]): void {
    if (ids.length === 0) return;
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    db.runSync(
      `UPDATE pending_gps_positions SET sync_status = 'uploading' WHERE id IN (${placeholders})`,
      ids
    );
  },

  markSynced(ids: number[]): void {
    if (ids.length === 0) return;
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    db.runSync(
      `DELETE FROM pending_gps_positions WHERE id IN (${placeholders})`,
      ids
    );
  },

  markFailed(id: number, previousRetryCount: number, error: string): void {
    const db = getDatabase();
    const nextRetryCount = previousRetryCount + 1;
    // Exponential backoff: 5s * 2^(retryCount - 1), capped at 5 minutes
    const delaySeconds = Math.min(300, 5 * Math.pow(2, Math.max(0, nextRetryCount - 1)));
    const nextRetryAt = new Date(Date.now() + delaySeconds * 1000).toISOString();

    db.runSync(
      `UPDATE pending_gps_positions 
       SET sync_status = 'failed', retry_count = ?, last_error = ?, next_retry_at = ?
       WHERE id = ?`,
      [nextRetryCount, error, nextRetryAt, id]
    );
  },

  resetStaleUploading(): void {
    const db = getDatabase();
    db.runSync(`UPDATE pending_gps_positions SET sync_status = 'pending' WHERE sync_status = 'uploading'`);
  },

  getPendingCount(): number {
    const db = getDatabase();
    const row = db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pending_gps_positions WHERE sync_status != 'synced'`
    );
    return row?.count || 0;
  },

  getFailedCount(): number {
    const db = getDatabase();
    const row = db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pending_gps_positions WHERE sync_status = 'failed'`
    );
    return row?.count || 0;
  },

  toPayload(row: PendingGpsPositionRow): GpsPositionPayload {
    return {
      clientEventId: row.client_event_id,
      vehicleId: row.vehicle_id,
      missionId: row.mission_id || null,
      latitude: row.latitude,
      longitude: row.longitude,
      accuracy: row.accuracy,
      altitude: row.altitude,
      speed: row.speed,
      heading: row.heading,
      isMocked: row.is_mocked === 1,
      recordedAt: row.recorded_at,
    };
  },
};

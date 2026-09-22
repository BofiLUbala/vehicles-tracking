import { getDatabase } from './db';
import { ActiveOwner } from './active-owner';
import { PendingValidationRow } from '../types/sync.types';
import { StepValidationPayload } from '../types/tracking.types';
import { createClientEventId } from '../utils/client-event-id';

export interface EnqueueValidationParams {
  clientEventId?: string;
  missionStepId: string;
  qrToken: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  isMocked?: boolean;
  recordedAt?: string;
  photoPath: string;
}

export const ValidationQueueRepository = {
  enqueue(params: EnqueueValidationParams): string {
    const owner = ActiveOwner.get();
    if (!owner) throw new Error('Aucun chauffeur connecté : impossible de mettre cet élément en file.');
    const db = getDatabase();
    const clientEventId = params.clientEventId || createClientEventId();
    const recordedAt = params.recordedAt || new Date().toISOString();
    const createdAtDevice = new Date().toISOString();

    db.runSync(
      `INSERT OR IGNORE INTO pending_validations (
        driver_id, client_event_id, mission_step_id, qr_token, latitude, longitude,
        accuracy, is_mocked, recorded_at, photo_path, created_at_device,
        sync_status, retry_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
      [
        owner,
        clientEventId,
        params.missionStepId,
        params.qrToken,
        params.latitude,
        params.longitude,
        params.accuracy ?? null,
        params.isMocked ? 1 : 0,
        recordedAt,
        params.photoPath,
        createdAtDevice,
      ]
    );

    return clientEventId;
  },

  getNextBatch(limit = 5, force = false, maxAutoRetries = 8): PendingValidationRow[] {
    const owner = ActiveOwner.get();
    if (!owner) return [];
    const db = getDatabase();
    const nowIso = new Date().toISOString();

    if (force) {
      return db.getAllSync<PendingValidationRow>(
        `SELECT * FROM pending_validations 
         WHERE driver_id = ? AND sync_status != 'synced' AND sync_status != 'uploading'
         ORDER BY recorded_at ASC LIMIT ?`,
        [owner, limit]
      );
    }

    return db.getAllSync<PendingValidationRow>(
      `SELECT * FROM pending_validations 
       WHERE sync_status IN ('pending', 'failed')
         AND retry_count < ?
         AND (next_retry_at IS NULL OR next_retry_at <= ?)
         AND driver_id = ?
       ORDER BY recorded_at ASC LIMIT ?`,
      [maxAutoRetries, nowIso, owner, limit]
    );
  },

  markUploading(id: number): void {
    const db = getDatabase();
    db.runSync(`UPDATE pending_validations SET sync_status = 'uploading' WHERE id = ?`, [id]);
  },

  markSynced(id: number): void {
    const db = getDatabase();
    db.runSync(`DELETE FROM pending_validations WHERE id = ?`, [id]);
  },

  markFailed(id: number, previousRetryCount: number, error: string): void {
    const db = getDatabase();
    const nextRetryCount = previousRetryCount + 1;
    const delaySeconds = Math.min(300, 5 * Math.pow(2, Math.max(0, nextRetryCount - 1)));
    const nextRetryAt = new Date(Date.now() + delaySeconds * 1000).toISOString();

    db.runSync(
      `UPDATE pending_validations 
       SET sync_status = 'failed', retry_count = ?, last_error = ?, next_retry_at = ?
       WHERE id = ?`,
      [nextRetryCount, error, nextRetryAt, id]
    );
  },

  resetStaleUploading(): void {
    const db = getDatabase();
    db.runSync(`UPDATE pending_validations SET sync_status = 'pending' WHERE sync_status = 'uploading'`);
  },

  getPendingCount(): number {
    const owner = ActiveOwner.get();
    if (!owner) return 0;
    const db = getDatabase();
    const row = db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pending_validations WHERE driver_id = ? AND sync_status != 'synced'`,
      [owner]
    );
    return row?.count || 0;
  },

  getFailedCount(): number {
    const owner = ActiveOwner.get();
    if (!owner) return 0;
    const db = getDatabase();
    const row = db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pending_validations WHERE driver_id = ? AND sync_status = 'failed'`,
      [owner]
    );
    return row?.count || 0;
  },

  toPayload(row: PendingValidationRow): StepValidationPayload {
    return {
      clientEventId: row.client_event_id,
      qrToken: row.qr_token,
      latitude: row.latitude,
      longitude: row.longitude,
      accuracy: row.accuracy ?? 0,
      isMocked: row.is_mocked === 1,
      recordedAt: row.recorded_at,
    };
  },
};

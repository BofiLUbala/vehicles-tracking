import { getDatabase } from './db';
import { PendingFuelRecordRow } from '../types/sync.types';
import { CreateFuelRecordMetadataDto, FuelType } from '../types/fuel.types';

export interface EnqueueFuelParams {
  clientEventId?: string;
  vehicleId: string;
  liters: number;
  totalCost: number;
  odometer: number;
  fuelType: FuelType;
  stationName?: string | null;
  latitude: number;
  longitude: number;
  recordedAt?: string;
  receiptPhotoPath: string;
  odometerPhotoPath: string;
}

export const FuelQueueRepository = {
  enqueue(params: EnqueueFuelParams): string {
    const db = getDatabase();
    const clientEventId = params.clientEventId || `fuel_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const recordedAt = params.recordedAt || new Date().toISOString();
    const createdAtDevice = new Date().toISOString();

    db.runSync(
      `INSERT OR IGNORE INTO pending_fuel_records (
        client_event_id, vehicle_id, liters, total_cost, odometer,
        fuel_type, station_name, latitude, longitude, recorded_at,
        receipt_photo_path, odometer_photo_path, created_at_device,
        sync_status, retry_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
      [
        clientEventId,
        params.vehicleId,
        params.liters,
        params.totalCost,
        params.odometer,
        params.fuelType,
        params.stationName || null,
        params.latitude,
        params.longitude,
        recordedAt,
        params.receiptPhotoPath,
        params.odometerPhotoPath,
        createdAtDevice,
      ]
    );

    return clientEventId;
  },

  getNextBatch(limit = 5, force = false, maxAutoRetries = 8): PendingFuelRecordRow[] {
    const db = getDatabase();
    const nowIso = new Date().toISOString();

    if (force) {
      return db.getAllSync<PendingFuelRecordRow>(
        `SELECT * FROM pending_fuel_records 
         WHERE sync_status != 'synced' AND sync_status != 'uploading'
         ORDER BY recorded_at ASC LIMIT ?`,
        [limit]
      );
    }

    return db.getAllSync<PendingFuelRecordRow>(
      `SELECT * FROM pending_fuel_records 
       WHERE sync_status IN ('pending', 'failed')
         AND retry_count < ?
         AND (next_retry_at IS NULL OR next_retry_at <= ?)
       ORDER BY recorded_at ASC LIMIT ?`,
      [maxAutoRetries, nowIso, limit]
    );
  },

  markUploading(id: number): void {
    const db = getDatabase();
    db.runSync(`UPDATE pending_fuel_records SET sync_status = 'uploading' WHERE id = ?`, [id]);
  },

  markSynced(id: number): void {
    const db = getDatabase();
    db.runSync(`DELETE FROM pending_fuel_records WHERE id = ?`, [id]);
  },

  markFailed(id: number, previousRetryCount: number, error: string): void {
    const db = getDatabase();
    const nextRetryCount = previousRetryCount + 1;
    const delaySeconds = Math.min(300, 5 * Math.pow(2, Math.max(0, nextRetryCount - 1)));
    const nextRetryAt = new Date(Date.now() + delaySeconds * 1000).toISOString();

    db.runSync(
      `UPDATE pending_fuel_records 
       SET sync_status = 'failed', retry_count = ?, last_error = ?, next_retry_at = ?
       WHERE id = ?`,
      [nextRetryCount, error, nextRetryAt, id]
    );
  },

  resetStaleUploading(): void {
    const db = getDatabase();
    db.runSync(`UPDATE pending_fuel_records SET sync_status = 'pending' WHERE sync_status = 'uploading'`);
  },

  getPendingCount(): number {
    const db = getDatabase();
    const row = db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pending_fuel_records WHERE sync_status != 'synced'`
    );
    return row?.count || 0;
  },

  getFailedCount(): number {
    const db = getDatabase();
    const row = db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pending_fuel_records WHERE sync_status = 'failed'`
    );
    return row?.count || 0;
  },

  toMetadata(row: PendingFuelRecordRow): CreateFuelRecordMetadataDto {
    return {
      clientEventId: row.client_event_id,
      vehicleId: row.vehicle_id,
      liters: row.liters,
      totalCost: row.total_cost,
      odometer: row.odometer,
      fuelType: row.fuel_type as FuelType,
      stationName: row.station_name || undefined,
      latitude: row.latitude,
      longitude: row.longitude,
    };
  },
};

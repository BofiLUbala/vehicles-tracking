import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GpsQueueRepository } from '../database/gps-queue.repository';
import { ValidationQueueRepository } from '../database/validation-queue.repository';
import { FuelQueueRepository } from '../database/fuel-queue.repository';
import { initDatabase, setDatabaseInstanceForTest } from '../database/db';

describe('Offline Persistence & Database Operations', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      execSync: vi.fn(),
      runSync: vi.fn(),
      getAllSync: vi.fn(() => []),
      getFirstSync: vi.fn(() => ({ count: 0 })),
    };

    setDatabaseInstanceForTest(mockDb);
  });

  describe('Database Initialization & Schema', () => {
    it('initializes WAL mode and creates all queue tables', () => {
      initDatabase(mockDb);
      expect(mockDb.execSync).toHaveBeenCalledWith(expect.stringContaining('PRAGMA journal_mode = WAL'));
      expect(mockDb.execSync).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS pending_gps_positions'));
      expect(mockDb.execSync).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS pending_validations'));
      expect(mockDb.execSync).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS pending_fuel_records'));
      expect(mockDb.execSync).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS today_missions_cache'));
    });
  });

  describe('GPS Queue Persistence', () => {
    it('enqueues GPS position using INSERT OR IGNORE for duplicate clientEventId protection', () => {
      GpsQueueRepository.enqueue({
        clientEventId: 'custom-client-id-1',
        vehicleId: 'veh-1',
        missionId: 'mis-1',
        latitude: -4.32,
        longitude: 15.31,
        accuracy: 8,
        speed: 12.5,
        heading: 180,
        isMocked: false,
      });

      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE INTO pending_gps_positions'),
        expect.arrayContaining(['custom-client-id-1', 'veh-1', 'mis-1', -4.32, 15.31])
      );
    });

    it('calculates exponential backoff and sets next_retry_at on markFailed', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      GpsQueueRepository.markFailed(42, 2, 'Connection timed out');

      // nextRetryCount = 3 -> delay = 5 * 2^(3-1) = 20s
      const expectedNextRetryAt = new Date(now + 20 * 1000).toISOString();

      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE pending_gps_positions'),
        [3, 'Connection timed out', expectedNextRetryAt, 42]
      );
    });

    it('resets stale uploading rows to pending after process restart', () => {
      GpsQueueRepository.resetStaleUploading();
      expect(mockDb.runSync).toHaveBeenCalledWith(
        "UPDATE pending_gps_positions SET sync_status = 'pending' WHERE sync_status = 'uploading'"
      );
    });

    it('deletes rows from database upon markSynced', () => {
      GpsQueueRepository.markSynced([1, 2, 3]);
      expect(mockDb.runSync).toHaveBeenCalledWith(
        'DELETE FROM pending_gps_positions WHERE id IN (?,?,?)',
        [1, 2, 3]
      );
    });
  });

  describe('Validation Queue Persistence', () => {
    it('enqueues validation step and returns generated clientEventId', () => {
      const clientEventId = ValidationQueueRepository.enqueue({
        missionStepId: 'step-10',
        qrToken: 'signed-qr-token-abc',
        latitude: -4.33,
        longitude: 15.32,
        accuracy: 5,
        photoPath: 'file:///path/photo.jpg',
      });

      expect(clientEventId).toMatch(/^val_\d+_/);
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE INTO pending_validations'),
        expect.arrayContaining(['step-10', 'signed-qr-token-abc', 'file:///path/photo.jpg'])
      );
    });

    it('resets stale uploading validations on restart', () => {
      ValidationQueueRepository.resetStaleUploading();
      expect(mockDb.runSync).toHaveBeenCalledWith(
        "UPDATE pending_validations SET sync_status = 'pending' WHERE sync_status = 'uploading'"
      );
    });
  });

  describe('Fuel Queue Persistence', () => {
    it('enqueues fuel record with receipt and odometer photo paths', () => {
      const clientEventId = FuelQueueRepository.enqueue({
        vehicleId: 'veh-5',
        liters: 60,
        totalCost: 150000,
        odometer: 85000,
        fuelType: 'DIESEL',
        latitude: -4.3,
        longitude: 15.3,
        receiptPhotoPath: 'file:///receipt.jpg',
        odometerPhotoPath: 'file:///odometer.jpg',
      });

      expect(clientEventId).toMatch(/^fuel_\d+_/);
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE INTO pending_fuel_records'),
        expect.arrayContaining(['veh-5', 60, 150000, 85000, 'DIESEL', 'file:///receipt.jpg', 'file:///odometer.jpg'])
      );
    });

    it('resets stale uploading fuel records on restart', () => {
      FuelQueueRepository.resetStaleUploading();
      expect(mockDb.runSync).toHaveBeenCalledWith(
        "UPDATE pending_fuel_records SET sync_status = 'pending' WHERE sync_status = 'uploading'"
      );
    });
  });
});

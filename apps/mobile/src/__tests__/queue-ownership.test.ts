import { beforeEach, describe, expect, it } from 'vitest';
import { initDatabase, setDatabaseInstanceForTest } from '../database/db';
import { ActiveOwner } from '../database/active-owner';
import { GpsQueueRepository } from '../database/gps-queue.repository';
import { ValidationQueueRepository } from '../database/validation-queue.repository';
import { FuelQueueRepository } from '../database/fuel-queue.repository';
import { MissionsCacheRepository } from '../database/missions-cache.repository';
import { createRealSqlite } from './helpers/real-sqlite';

/**
 * RÉGRESSION D'INTÉGRITÉ (constatée en conditions réelles) : 5 points GPS du chauffeur A sont restés en
 * file après sa déconnexion. Ils auraient été envoyés sous le jeton du chauffeur B qui se connectait
 * ensuite. Ces tests exécutent le SQL RÉEL (node:sqlite) : la file appartient à son chauffeur.
 */
describe('Offline queue ownership (real SQLite)', () => {
  let db: ReturnType<typeof createRealSqlite>;

  const gps = (over: Record<string, unknown> = {}) => ({
    vehicleId: 'veh-A',
    missionId: 'mis-A',
    latitude: -4.32,
    longitude: 15.31,
    ...over,
  });
  const count = (table: string, where = '1=1') =>
    (db.getFirstSync<{ c: number }>(`SELECT COUNT(*) AS c FROM ${table} WHERE ${where}`)?.c ?? -1) as number;

  beforeEach(() => {
    db = createRealSqlite();
    setDatabaseInstanceForTest(db as never);
    initDatabase(db as never);
  });

  describe('GPS queue', () => {
    it("Driver A's queued points are invisible and never syncable for Driver B", () => {
      ActiveOwner.set('driver-A');
      for (let i = 0; i < 3; i++) GpsQueueRepository.enqueue(gps({ latitude: -4.3 - i / 100 }));
      expect(GpsQueueRepository.getPendingCount()).toBe(3);

      // Logout puis connexion de B sur le même appareil.
      ActiveOwner.clear();
      ActiveOwner.set('driver-B');

      expect(GpsQueueRepository.getNextBatch()).toEqual([]);
      expect(GpsQueueRepository.getNextBatch(100, true)).toEqual([]); // même en « forcer la synchro »
      expect(GpsQueueRepository.getPendingCount()).toBe(0);
      expect(GpsQueueRepository.getFailedCount()).toBe(0);
      expect(GpsQueueRepository.getMissionPositions('mis-A')).toEqual([]);

      // Rien n'a été supprimé : les points d'A sont toujours là, attachés à A.
      expect(count('pending_gps_positions', "driver_id = 'driver-A'")).toBe(3);
      expect(count('pending_gps_positions', "driver_id = 'driver-B'")).toBe(0);
    });

    it("keeps Driver A's points intact and syncable when A logs back in", () => {
      ActiveOwner.set('driver-A');
      GpsQueueRepository.enqueue(gps());
      ActiveOwner.clear();
      ActiveOwner.set('driver-B');
      ActiveOwner.set('driver-A');

      const batch = GpsQueueRepository.getNextBatch();
      expect(batch).toHaveLength(1);
      expect(batch[0].driver_id).toBe('driver-A');
      expect(GpsQueueRepository.getMissionPositions('mis-A')).toHaveLength(1);
    });

    it('binds every point to its original driver in the upload payload', () => {
      ActiveOwner.set('driver-A');
      GpsQueueRepository.enqueue(gps({ clientEventId: 'evt-1' }));
      const [row] = GpsQueueRepository.getNextBatch();
      const payload = GpsQueueRepository.toPayload(row);
      expect(payload.driverId).toBe('driver-A');
      expect(payload.vehicleId).toBe('veh-A');
      expect(payload.missionId).toBe('mis-A');
      expect(payload.recordedAt).toBeTruthy();
    });

    it('never records a point when nobody is logged in', () => {
      ActiveOwner.clear();
      GpsQueueRepository.enqueue(gps());
      expect(count('pending_gps_positions')).toBe(0);
    });

    it("ignores a tracker started by another driver (tracking that outlives a logout)", () => {
      ActiveOwner.set('driver-B');
      GpsQueueRepository.enqueue(gps({ driverId: 'driver-A' })); // tracker de A encore actif
      expect(count('pending_gps_positions')).toBe(0);

      GpsQueueRepository.enqueue(gps({ driverId: 'driver-B' }));
      expect(count('pending_gps_positions', "driver_id = 'driver-B'")).toBe(1);
    });

    it('does not sync anything while logged out', () => {
      ActiveOwner.set('driver-A');
      GpsQueueRepository.enqueue(gps());
      ActiveOwner.clear();
      expect(GpsQueueRepository.getNextBatch()).toEqual([]);
      expect(GpsQueueRepository.getPendingCount()).toBe(0);
    });
  });

  describe('legacy rows (queued before ownership existed)', () => {
    it('are quarantined: owned by nobody, so never uploaded or shown to any driver', () => {
      db.runSync(
        `INSERT INTO pending_gps_positions (client_event_id, vehicle_id, latitude, longitude, recorded_at, created_at_device)
         VALUES ('legacy-1', 'veh-old', -4.3, 15.3, '2026-09-21T10:00:00Z', '2026-09-21T10:00:00Z')`,
      );
      expect(count('pending_gps_positions', "driver_id = ''")).toBe(1);

      for (const who of ['driver-A', 'driver-B']) {
        ActiveOwner.set(who);
        expect(GpsQueueRepository.getNextBatch(100, true)).toEqual([]);
        expect(GpsQueueRepository.getPendingCount()).toBe(0);
      }
    });

    it('migration adds driver_id to an old-schema database and quarantines its rows', () => {
      const old = createRealSqlite();
      old.execSync(`
        CREATE TABLE pending_gps_positions (
          id INTEGER PRIMARY KEY AUTOINCREMENT, client_event_id TEXT UNIQUE NOT NULL, vehicle_id TEXT NOT NULL,
          mission_id TEXT, latitude REAL NOT NULL, longitude REAL NOT NULL, accuracy REAL, altitude REAL, speed REAL,
          heading REAL, is_mocked INTEGER NOT NULL DEFAULT 0, recorded_at TEXT NOT NULL, created_at_device TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'pending', retry_count INTEGER NOT NULL DEFAULT 0, last_error TEXT, next_retry_at TEXT
        );
        CREATE TABLE today_missions_cache (id INTEGER PRIMARY KEY DEFAULT 0, response_json TEXT NOT NULL, fetched_at TEXT NOT NULL);
        INSERT INTO pending_gps_positions (client_event_id, vehicle_id, latitude, longitude, recorded_at, created_at_device)
          VALUES ('old-1', 'veh-old', -4.3, 15.3, '2026-09-21T10:00:00Z', '2026-09-21T10:00:00Z');
      `);
      initDatabase(old as never); // met à jour le schéma sans perdre la ligne
      setDatabaseInstanceForTest(old as never);

      const cols = old.getAllSync<{ name: string }>('PRAGMA table_info(pending_gps_positions)').map((c) => c.name);
      expect(cols).toContain('driver_id');
      expect(old.getFirstSync<{ driver_id: string }>('SELECT driver_id FROM pending_gps_positions')?.driver_id).toBe('');

      ActiveOwner.set('driver-A');
      expect(GpsQueueRepository.getNextBatch(100, true)).toEqual([]);
      expect(old.getFirstSync<{ c: number }>('SELECT COUNT(*) AS c FROM pending_gps_positions')?.c).toBe(1); // conservée
    });

    it('running the migration twice is harmless', () => {
      expect(() => initDatabase(db as never)).not.toThrow();
      expect(() => initDatabase(db as never)).not.toThrow();
    });
  });

  describe('step validations and fuel records', () => {
    it("Driver A's pending validation is invisible to Driver B", () => {
      ActiveOwner.set('driver-A');
      ValidationQueueRepository.enqueue({
        missionStepId: 'step-1', qrToken: 'qr', latitude: -4.3, longitude: 15.3, photoPath: 'file:///a.jpg',
      } as never);
      expect(ValidationQueueRepository.getPendingCount()).toBe(1);

      ActiveOwner.set('driver-B');
      expect(ValidationQueueRepository.getPendingCount()).toBe(0);
      expect(ValidationQueueRepository.getNextBatch(5, true)).toEqual([]);
    });

    it("Driver A's pending fuel record is invisible to Driver B", () => {
      ActiveOwner.set('driver-A');
      FuelQueueRepository.enqueue({
        vehicleId: 'veh-A', liters: 30, totalCost: 45000, odometer: 1000, fuelType: 'DIESEL',
        latitude: -4.3, longitude: 15.3, receiptPhotoPath: 'file:///r.jpg', odometerPhotoPath: 'file:///o.jpg',
      } as never);
      expect(FuelQueueRepository.getPendingCount()).toBe(1);

      ActiveOwner.set('driver-B');
      expect(FuelQueueRepository.getPendingCount()).toBe(0);
      expect(FuelQueueRepository.getNextBatch(5, true)).toEqual([]);
    });

    it('a user-initiated enqueue with nobody logged in fails loudly instead of being dropped silently', () => {
      ActiveOwner.clear();
      expect(() =>
        ValidationQueueRepository.enqueue({ missionStepId: 's', qrToken: 'q', latitude: 0, longitude: 0, photoPath: 'p' } as never),
      ).toThrow(/Aucun chauffeur connecté/);
    });
  });

  describe("missions cache", () => {
    it("Driver B never sees Driver A's cached missions, even offline", () => {
      ActiveOwner.set('driver-A');
      MissionsCacheRepository.save([{ id: 'mis-A' } as never]);
      expect(MissionsCacheRepository.get()).toHaveLength(1);

      ActiveOwner.set('driver-B');
      expect(MissionsCacheRepository.get()).toBeNull();

      ActiveOwner.clear();
      expect(MissionsCacheRepository.get()).toBeNull();
    });
  });
});

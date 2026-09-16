import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function setDatabaseInstanceForTest(db: SQLite.SQLiteDatabase | null): void {
  dbInstance = db;
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('tracking_vehicles.db');
    initDatabase(dbInstance);
  }
  return dbInstance;
}

export function initDatabase(db: SQLite.SQLiteDatabase): void {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS pending_gps_positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_event_id TEXT UNIQUE NOT NULL,
      vehicle_id TEXT NOT NULL,
      mission_id TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL,
      altitude REAL,
      speed REAL,
      heading REAL,
      is_mocked INTEGER NOT NULL DEFAULT 0,
      recorded_at TEXT NOT NULL,
      created_at_device TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      next_retry_at TEXT
    );

    CREATE TABLE IF NOT EXISTS pending_validations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_event_id TEXT UNIQUE NOT NULL,
      mission_step_id TEXT NOT NULL,
      qr_token TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL,
      is_mocked INTEGER NOT NULL DEFAULT 0,
      recorded_at TEXT NOT NULL,
      photo_path TEXT NOT NULL,
      created_at_device TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      next_retry_at TEXT
    );

    CREATE TABLE IF NOT EXISTS pending_fuel_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_event_id TEXT UNIQUE NOT NULL,
      vehicle_id TEXT NOT NULL,
      liters REAL NOT NULL,
      total_cost REAL NOT NULL,
      odometer REAL NOT NULL,
      fuel_type TEXT NOT NULL,
      station_name TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      recorded_at TEXT NOT NULL,
      receipt_photo_path TEXT NOT NULL,
      odometer_photo_path TEXT NOT NULL,
      created_at_device TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      next_retry_at TEXT
    );

    CREATE TABLE IF NOT EXISTS today_missions_cache (
      id INTEGER PRIMARY KEY DEFAULT 0,
      response_json TEXT NOT NULL,
      fetched_at TEXT NOT NULL
    );
  `);
}

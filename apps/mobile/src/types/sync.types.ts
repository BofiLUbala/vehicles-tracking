export type SyncStatus = 'pending' | 'uploading' | 'synced' | 'failed' | 'conflict';

export interface PendingGpsPositionRow {
  id: number;
  client_event_id: string;
  vehicle_id: string;
  mission_id?: string | null;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  is_mocked: number; // 0 or 1
  recorded_at: string;
  created_at_device: string;
  sync_status: SyncStatus;
  retry_count: number;
  last_error?: string | null;
  next_retry_at?: string | null;
}

export interface PendingValidationRow {
  id: number;
  client_event_id: string;
  mission_step_id: string;
  qr_token: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  is_mocked: number; // 0 or 1
  recorded_at: string;
  photo_path: string;
  created_at_device: string;
  sync_status: SyncStatus;
  retry_count: number;
  last_error?: string | null;
  next_retry_at?: string | null;
}

export interface PendingFuelRecordRow {
  id: number;
  client_event_id: string;
  vehicle_id: string;
  liters: number;
  total_cost: number;
  odometer: number;
  fuel_type: string;
  station_name?: string | null;
  latitude: number;
  longitude: number;
  recorded_at: string;
  receipt_photo_path: string;
  odometer_photo_path: string;
  created_at_device: string;
  sync_status: SyncStatus;
  retry_count: number;
  last_error?: string | null;
  next_retry_at?: string | null;
}

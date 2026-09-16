import { describe, it, expect } from 'vitest';
import { GpsQueueRepository } from '../database/gps-queue.repository';
import { ValidationQueueRepository } from '../database/validation-queue.repository';
import { FuelQueueRepository } from '../database/fuel-queue.repository';
import {
  PendingGpsPositionRow,
  PendingValidationRow,
  PendingFuelRecordRow,
} from '../types/sync.types';

describe('Offline Queue Payload Converters', () => {
  it('converts PendingGpsPositionRow to GpsPositionPayload', () => {
    const row: PendingGpsPositionRow = {
      id: 1,
      client_event_id: 'gps-uuid-123',
      vehicle_id: 'veh-1',
      mission_id: 'mis-1',
      latitude: -4.325,
      longitude: 15.322,
      accuracy: 10,
      altitude: 300,
      speed: 25,
      heading: 90,
      is_mocked: 0,
      recorded_at: '2026-09-16T10:00:00Z',
      created_at_device: '2026-09-16T10:00:01Z',
      sync_status: 'pending',
      retry_count: 0,
    };

    const payload = GpsQueueRepository.toPayload(row);
    expect(payload.clientEventId).toBe('gps-uuid-123');
    expect(payload.vehicleId).toBe('veh-1');
    expect(payload.missionId).toBe('mis-1');
    expect(payload.latitude).toBe(-4.325);
    expect(payload.longitude).toBe(15.322);
    expect(payload.isMocked).toBe(false);
  });

  it('converts PendingValidationRow to StepValidationPayload', () => {
    const row: PendingValidationRow = {
      id: 2,
      client_event_id: 'val-uuid-456',
      mission_step_id: 'step-1',
      qr_token: 'hmac-token-xyz',
      latitude: -4.33,
      longitude: 15.33,
      accuracy: 5,
      is_mocked: 1,
      recorded_at: '2026-09-16T11:00:00Z',
      photo_path: '/path/to/photo.jpg',
      created_at_device: '2026-09-16T11:00:02Z',
      sync_status: 'pending',
      retry_count: 0,
    };

    const payload = ValidationQueueRepository.toPayload(row);
    expect(payload.clientEventId).toBe('val-uuid-456');
    expect(payload.qrToken).toBe('hmac-token-xyz');
    expect(payload.isMocked).toBe(true);
  });

  it('converts PendingFuelRecordRow to CreateFuelRecordMetadataDto', () => {
    const row: PendingFuelRecordRow = {
      id: 3,
      client_event_id: 'fuel-uuid-789',
      vehicle_id: 'veh-2',
      liters: 75.5,
      total_cost: 200000,
      odometer: 145000,
      fuel_type: 'DIESEL',
      station_name: 'TotalEnergies Gombe',
      latitude: -4.31,
      longitude: 15.30,
      recorded_at: '2026-09-16T12:00:00Z',
      receipt_photo_path: '/path/to/receipt.jpg',
      odometer_photo_path: '/path/to/odo.jpg',
      created_at_device: '2026-09-16T12:00:03Z',
      sync_status: 'pending',
      retry_count: 0,
    };

    const metadata = FuelQueueRepository.toMetadata(row);
    expect(metadata.clientEventId).toBe('fuel-uuid-789');
    expect(metadata.vehicleId).toBe('veh-2');
    expect(metadata.liters).toBe(75.5);
    expect(metadata.totalCost).toBe(200000);
    expect(metadata.fuelType).toBe('DIESEL');
    expect(metadata.stationName).toBe('TotalEnergies Gombe');
  });
});

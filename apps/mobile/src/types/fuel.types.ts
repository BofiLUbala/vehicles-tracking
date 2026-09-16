export type FuelType = 'DIESEL' | 'PETROL' | 'ELECTRIC' | 'OTHER';

export interface CreateFuelRecordMetadataDto {
  clientEventId?: string;
  vehicleId: string;
  liters: number;
  totalCost: number;
  odometer: number;
  fuelType: FuelType;
  stationName?: string;
  latitude?: number;
  longitude?: number;
}

export interface FuelAnomalyAlert {
  alertId: string;
  type: string;
  level: string;
  message?: string;
  score: number;
  scoreBreakdown?: { reason: string; points: number }[];
}

export interface FuelRecordResponse {
  record: {
    id: string;
    vehicleId: string;
    driverId: string;
    liters: number;
    totalCost: number;
    odometer: number;
    fuelType: FuelType;
    stationName?: string | null;
    createdAt: string;
  };
  distanceKm?: number | null;
  consumptionL100km?: number | null;
  anomalies: FuelAnomalyAlert[];
  idempotentReplay?: boolean;
}

export interface FuelSubmissionResult {
  success: boolean;
  errorCode?: string;
  message?: string;
  anomalies?: FuelAnomalyAlert[];
  queued?: boolean;
}

export interface GpsPositionPayload {
  clientEventId: string;
  vehicleId: string;
  missionId?: string | null;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  isMocked: boolean;
  recordedAt: string; // ISO 8601
}

export interface BatchPositionItemResult {
  clientEventId: string;
  status: 'created' | 'duplicate' | 'rejected';
  reason?: string | null;
}

export type BatchPositionResponse = BatchPositionItemResult[];

export interface StepValidationPayload {
  clientEventId: string;
  qrToken: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  isMocked: boolean;
  recordedAt: string;
}

export interface ValidationResponse {
  success: boolean;
  errorCode?: string;
  message?: string;
  rawMessage?: string;
  queued?: boolean;
}

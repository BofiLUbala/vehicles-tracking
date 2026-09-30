export interface GpsPositionPayload {
  clientEventId: string;
  /** Chauffeur qui a enregistré la position (le backend refuse si différent du chauffeur authentifié). */
  driverId?: string;
  vehicleId: string;
  missionId?: string | null;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  /** Vitesse en m/s (expo-location) ; convertie en km/h à l'envoi vers l'API (tracking.api.ts). */
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

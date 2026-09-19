/**
 * Contrat REST/WebSocket du module tracking (`apps/api/src/tracking`), reconcilié avec
 * `docs/PHASE3_NOTES.md` (contrat backend autoritaire, livré par un agent séparé).
 */

export type VehicleTrackingStatus = 'MOVING' | 'ON_MISSION' | 'STOPPED' | 'OFFLINE' | 'SUSPICIOUS';

/** Forme brute renvoyée par `GET /tracking/vehicles/live` (voir PHASE3_NOTES.md). */
export interface LiveVehicleDto {
  vehicleId: string;
  plateNumber: string;
  status: VehicleTrackingStatus;
  activeMissionId: string | null;
  latestPosition: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    speed: number | null;
    heading: number | null;
    updatedAt: string;
  } | null;
}

export interface LiveVehiclePosition {
  lat: number;
  lng: number;
}

/** Forme normalisée utilisée côté UI (mappée depuis `LiveVehicleDto` dans `api.ts`). */
export interface LiveVehicle {
  id: string;
  plate: string;
  status: VehicleTrackingStatus;
  activeMissionId: string | null;
  speedKmh: number | null;
  heading: number | null;
  /** Précision GPS déclarée par le chauffeur (mètres) — `null` si le mobile ne l'a pas fournie. */
  accuracy: number | null;
  lastUpdateAt: string | null;
  /** `null` si le véhicule n'a encore jamais rapporté de position (pas encore de marqueur). */
  position: LiveVehiclePosition | null;
}

/**
 * Payload brut de l'événement Socket.IO `vehicle.position.updated` (namespace `/tracking`) —
 * voir PHASE3_NOTES.md. Ne contient PAS le statut (dérivé côté backend séparément, diffusé via
 * `vehicle.status.updated`).
 */
export interface VehiclePositionUpdatedEvent {
  vehicleId: string;
  missionId: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
}

/** Payload de `vehicle.status.updated` — statut dérivé émis par le backend à chaque ingestion. */
export interface VehicleStatusUpdatedEvent {
  vehicleId: string;
  status: VehicleTrackingStatus;
}

/** Payload de `vehicle.offline` — émis par le balayage périodique des véhicules silencieux. */
export interface VehicleOfflineEvent {
  vehicleId: string;
  lastSeenAt: string | null;
}

export interface TraceGeoJSON {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  properties: Record<string, unknown>;
}

export interface MissionTracePosition {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
}

export interface MissionTraceResponse {
  missionId: string;
  vehicleId: string;
  driverId: string;
  status: string;
  startedAt: string | null;
  lastPositionAt: string | null;
  totalPoints: number;
  totalDistanceMeters: number;
  geojson: TraceGeoJSON;
  positions: MissionTracePosition[];
}

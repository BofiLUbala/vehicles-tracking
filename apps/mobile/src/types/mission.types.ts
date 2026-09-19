export type MissionStatus =
  | 'PLANNED'
  | 'ASSIGNED'
  | 'STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'LATE'
  | 'SUSPICIOUS'
  | 'NOT_COMPLETED';

export type MissionStepStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'VALIDATED'
  | 'SKIPPED'
  | 'FAILED';

export type MissionStepActionType =
  | 'COLLECT'
  | 'DROPOFF'
  | 'WEIGH'
  | 'REFUEL'
  | 'CHECKPOINT';

export interface Location {
  id: string;
  name: string;
  type: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  allowedRadius: number;
}

export interface MissionStep {
  id: string;
  missionId: string;
  locationId: string;
  order: number;
  actionType: MissionStepActionType;
  status: MissionStepStatus;
  plannedAt?: string | null;
  toleranceMin: number;
  location: Location;
}

export interface Mission {
  id: string;
  organizationId: string;
  driverId: string;
  vehicleId: string;
  vehiclePlateNumber?: string | null;
  status: MissionStatus;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  actualStart?: string | null;
  actualEnd?: string | null;
  steps: MissionStep[];
  completedStepsCount?: number;
}

export interface MissionTracePosition {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
}

export interface MissionTrace {
  missionId: string;
  vehicleId: string;
  driverId: string;
  status: MissionStatus;
  startedAt: string | null;
  lastPositionAt: string | null;
  totalPoints: number;
  totalDistanceMeters: number;
  positions: MissionTracePosition[];
}

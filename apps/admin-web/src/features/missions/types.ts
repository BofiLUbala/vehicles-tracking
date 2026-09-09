/**
 * Contrat REST du module missions (`apps/api/src/missions`). Les noms de champs correspondent au
 * modèle Prisma `Mission`/`MissionStep`/`MissionEvent` et aux DTOs `CreateMissionDto`,
 * `UpdateMissionDto`, `AssignMissionDto`, `CancelMissionDto`, `QueryMissionsDto`.
 */

export type { MissionStatus, MissionStepActionType, MissionStepStatus } from '@/features/missions/status-labels';
import type { MissionStatus, MissionStepActionType, MissionStepStatus } from '@/features/missions/status-labels';

export interface MissionStepDto {
  id: string;
  missionId: string;
  locationId: string;
  order: number;
  actionType: MissionStepActionType;
  status: MissionStepStatus;
  plannedAt: string | null;
  toleranceMin: number;
  createdAt: string;
  updatedAt: string;
}

export interface MissionEventDto {
  id: string;
  missionId: string;
  type: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

/** Forme brute renvoyée par `GET /missions` / `GET /missions/:id` (inclut `steps` + `events`). */
export interface MissionDto {
  id: string;
  organizationId: string;
  driverId: string;
  vehicleId: string;
  status: MissionStatus;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  createdAt: string;
  updatedAt: string;
  steps: MissionStepDto[];
  events: MissionEventDto[];
}

export interface MissionFilters {
  status?: MissionStatus;
  driverId?: string;
  vehicleId?: string;
  from?: string;
  to?: string;
}

export interface MissionStepInput {
  locationId: string;
  order: number;
  actionType: MissionStepActionType;
  plannedAt?: string;
  toleranceMin?: number;
}

export interface CreateMissionInput {
  driverId: string;
  vehicleId: string;
  plannedStart?: string;
  plannedEnd?: string;
  steps: MissionStepInput[];
}

export interface UpdateMissionInput {
  plannedStart?: string;
  plannedEnd?: string;
  driverId?: string;
  vehicleId?: string;
}

export interface AssignMissionInput {
  driverId: string;
  vehicleId: string;
}

export interface CancelMissionInput {
  reason: string;
}

/** Référentiels utilisés pour les listes déroulantes chauffeur/véhicule (`GET /drivers`, `GET /vehicles`). */
export interface DriverRef {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
}

export interface VehicleRef {
  id: string;
  plateNumber: string;
  brand: string | null;
  model: string | null;
  status: string;
}

/**
 * Contrat REST du module véhicules (`apps/api/src/vehicles`, Phase 1 — déjà livré et versionné).
 * Champs dérivés de `CreateVehicleDto`/`UpdateVehicleDto` et du modèle Prisma `Vehicle`
 * (`apps/api/prisma/schema.prisma`).
 */

export type VehicleStatus = 'AVAILABLE' | 'ON_MISSION' | 'BROKEN_DOWN' | 'IN_MAINTENANCE' | 'DISABLED';

export interface VehicleDriverRef {
  id: string;
  firstName: string;
  lastName: string;
}

/** Forme brute renvoyée par `GET /vehicles` et `GET /vehicles/:id`. */
export interface VehicleDto {
  id: string;
  organizationId: string;
  plateNumber: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  status: VehicleStatus;
  tankCapacity: number | null;
  createdAt: string;
  updatedAt: string;
  /** Optionnel : le backend peut inclure le chauffeur actuellement affecté. */
  currentDriver?: VehicleDriverRef | null;
}

export interface VehicleFilters {
  status?: VehicleStatus | '';
  search?: string;
}

export interface CreateVehicleInput {
  plateNumber: string;
  brand?: string;
  model?: string;
  year?: number;
  status?: VehicleStatus;
  tankCapacity?: number;
}

export type UpdateVehicleInput = Partial<CreateVehicleInput>;

/** Un item de l'historique d'affectation chauffeur renvoyé par `GET /vehicles/:id/history`
 * (dérivé du modèle Prisma `DriverVehicleAssignment`). */
export interface VehicleAssignmentHistoryItem {
  id: string;
  driverId: string;
  vehicleId: string;
  startedAt: string;
  endedAt: string | null;
  driver?: VehicleDriverRef | null;
}

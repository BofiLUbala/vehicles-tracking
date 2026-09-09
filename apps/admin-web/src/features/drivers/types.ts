/**
 * Contrat REST du module chauffeurs (`apps/api/src/drivers`, Phase 1 — déjà livré et versionné).
 * Champs dérivés de `CreateDriverDto`/`UpdateDriverDto` et du modèle Prisma `Driver`
 * (`apps/api/prisma/schema.prisma`).
 */

export type DriverStatus = 'ACTIVE' | 'SUSPENDED' | 'UNAVAILABLE' | 'DISABLED';

export interface DriverVehicleRef {
  id: string;
  plateNumber: string;
}

/** Forme brute renvoyée par `GET /drivers` et `GET /drivers/:id`. */
export interface DriverDto {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  phone: string;
  licenseNumber: string | null;
  status: DriverStatus;
  createdAt: string;
  updatedAt: string;
  /** Optionnel : le backend peut inclure le véhicule actuellement affecté. */
  currentVehicle?: DriverVehicleRef | null;
}

export interface DriverFilters {
  status?: DriverStatus | '';
  search?: string;
}

export interface CreateDriverInput {
  firstName: string;
  lastName: string;
  phone: string;
  licenseNumber?: string;
  status?: DriverStatus;
}

export type UpdateDriverInput = Partial<CreateDriverInput>;

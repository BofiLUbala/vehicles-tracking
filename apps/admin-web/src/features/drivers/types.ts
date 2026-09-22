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

export interface DriverMissionRef {
  id: string;
  status: string;
}

export interface DeviceRef {
  id: string;
  deviceId: string;
  platform: string | null;
  lastSeenAt: Date | null;
}

export interface ProfileCompleteness {
  complete: boolean;
  missing: Array<'phone' | 'email' | 'licenseNumber' | 'password'>;
}

/** Forme brute renvoyée par `GET /drivers` et `GET /drivers/:id`. */
export interface DriverDto {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  licenseNumber: string | null;
  status: DriverStatus;
  createdAt: string;
  updatedAt: string;
  /** Optionnel : le backend peut inclure le véhicule actuellement affecté. */
  currentVehicle?: DriverVehicleRef | null;
  /** Optionnel : mission active. */
  activeMission?: DriverMissionRef | null;
  /** Indique si le chauffeur a un compte mobile (passwordHash défini). */
  hasMobileAccount: boolean;
  /** Appareil le plus récent non révoqué. */
  device?: DeviceRef | null;
  /** Dernière activité connue (via appareil). */
  lastSeenAt: string | null;
  /** Complétude du profil (champs métier + mot de passe mobile). */
  profile: ProfileCompleteness;
}

export interface LinkableDriverDto extends DriverDto {}

export interface DriverFilters {
  status?: DriverStatus | '';
  search?: string;
}

export interface CreateDriverInput {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  licenseNumber?: string;
  status?: DriverStatus;
}

export type UpdateDriverInput = Partial<CreateDriverInput>;

export interface LinkDriverInput {
  driverId: string;
  licenseNumber?: string;
  status?: DriverStatus;
}

export interface InviteDriverInput {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  licenseNumber?: string;
  status?: DriverStatus;
}
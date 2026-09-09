/**
 * Contrat REST du module points géographiques (`apps/api/src/locations`). Les noms de champs
 * correspondent au modèle Prisma `Location` (`apps/api/prisma/schema.prisma`) et aux DTOs
 * `CreateLocationDto`/`UpdateLocationDto`.
 */

export const LOCATION_TYPES = [
  'COLLECTION',
  'DROPOFF',
  'LANDFILL',
  'TRANSFER_CENTER',
  'AUTHORIZED_GAS_STATION',
] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  COLLECTION: 'Collecte',
  DROPOFF: 'Dépôt',
  LANDFILL: 'Décharge',
  TRANSFER_CENTER: 'Centre de transfert',
  AUTHORIZED_GAS_STATION: 'Station-service agréée',
};

export const LOCATION_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type LocationStatus = (typeof LOCATION_STATUSES)[number];

export const LOCATION_STATUS_LABELS: Record<LocationStatus, string> = {
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif',
};

/** Forme brute renvoyée par `GET /locations` / `GET /locations/:id`. */
export interface LocationDto {
  id: string;
  organizationId: string;
  name: string;
  type: LocationType;
  address: string | null;
  latitude: number;
  longitude: number;
  allowedRadius: number;
  status: LocationStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Corps envoyé à `POST /locations` / `PATCH /locations/:id`. */
export interface LocationInput {
  name: string;
  type: LocationType;
  address?: string;
  latitude: number;
  longitude: number;
  allowedRadius?: number;
}

/** Réponse de `POST /locations/:id/generate-qr` — jeton opaque signé (HMAC), jamais l'id brut. */
export interface LocationQrCodeDto {
  id: string;
  locationId: string;
  token: string;
  revokedAt: string | null;
  createdAt: string;
}

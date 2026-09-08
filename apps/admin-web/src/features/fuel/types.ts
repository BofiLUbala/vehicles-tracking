/**
 * Contrat REST du module carburant (`apps/api/src/fuel`, en cours de construction par un agent
 * séparé — voir `docs/PHASES.md`). Aucun `docs/PHASE4_NOTES.md` n'existait au moment d'écrire ce
 * code : les noms de champs sont dérivés du modèle Prisma `FuelRecord` (`apps/api/prisma/schema.prisma`,
 * seule source déjà livrée et versionnée), les formes d'endpoints suivent la convention du module
 * tracking (Phase 3). À réconcilier avec `docs/PHASE4_NOTES.md` dès sa publication.
 */

export type FuelType = 'DIESEL' | 'PETROL' | 'ELECTRIC' | 'OTHER';

/** Sous-forme optionnelle : le backend peut inclure les relations vehicle/driver ou seulement les ids. */
export interface FuelRecordVehicleRef {
  id: string;
  plateNumber: string;
}

export interface FuelRecordDriverRef {
  id: string;
  firstName: string;
  lastName: string;
}

/** Forme brute renvoyée par `GET /fuel-records` (un item). */
export interface FuelRecordDto {
  id: string;
  vehicleId: string;
  driverId: string;
  liters: number;
  totalCost: number;
  odometer: number;
  fuelType: FuelType;
  stationName: string | null;
  latitude: number | null;
  longitude: number | null;
  receiptFileId: string | null;
  createdAt: string;
  vehicle?: FuelRecordVehicleRef | null;
  driver?: FuelRecordDriverRef | null;
  /** Optionnel : présent si le backend calcule la consommation depuis l'enregistrement précédent du véhicule. */
  consumptionL100km?: number | null;
  /** Optionnel : true si ce plein a déclenché une alerte FUEL_ANOMALY liée. */
  hasAnomaly?: boolean;
}

export interface FuelRecordFilters {
  vehicleId?: string;
  driverId?: string;
  from?: string;
  to?: string;
}

export interface FuelSummaryDto {
  vehicleId: string;
  totalLiters: number;
  totalCost: number;
  /** Consommation moyenne en L/100km, null si pas assez de données (moins de 2 pleins avec odomètre). */
  averageConsumption: number | null;
  recordCount: number;
}

export type { FuelAnomalyDto } from '@/features/alerts/types';

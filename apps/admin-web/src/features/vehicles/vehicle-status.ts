import type { VehicleStatus } from '@/features/vehicles/types';

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  AVAILABLE: 'Disponible',
  ON_MISSION: 'En mission',
  BROKEN_DOWN: 'En panne',
  IN_MAINTENANCE: 'En maintenance',
  DISABLED: 'Désactivé',
};

export function vehicleStatusToLabel(status: VehicleStatus): string {
  return VEHICLE_STATUS_LABELS[status] ?? status;
}

export function vehicleStatusToBadgeVariant(status: VehicleStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'AVAILABLE':
      return 'default';
    case 'ON_MISSION':
      return 'secondary';
    case 'BROKEN_DOWN':
      return 'destructive';
    case 'IN_MAINTENANCE':
      return 'outline';
    case 'DISABLED':
      return 'outline';
    default:
      return 'outline';
  }
}

/** Teinte unifiée pour les pillules statut véhicule (voir `StatusBadge`). */
export function vehicleStatusTone(status: VehicleStatus): 'success' | 'info' | 'navy' | 'warning' | 'neutral' | 'danger' {
  switch (status) {
    case 'AVAILABLE':
      return 'success';
    case 'ON_MISSION':
      return 'info';
    case 'BROKEN_DOWN':
      return 'danger';
    case 'IN_MAINTENANCE':
      return 'warning';
    case 'DISABLED':
      return 'neutral';
    default:
      return 'neutral';
  }
}

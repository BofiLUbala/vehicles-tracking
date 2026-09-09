import type { DriverStatus } from '@/features/drivers/types';

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
  UNAVAILABLE: 'Indisponible',
  DISABLED: 'Désactivé',
};

export function driverStatusToLabel(status: DriverStatus): string {
  return DRIVER_STATUS_LABELS[status] ?? status;
}

export function driverStatusToBadgeVariant(status: DriverStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'ACTIVE':
      return 'default';
    case 'SUSPENDED':
      return 'destructive';
    case 'UNAVAILABLE':
      return 'secondary';
    case 'DISABLED':
      return 'outline';
    default:
      return 'outline';
  }
}

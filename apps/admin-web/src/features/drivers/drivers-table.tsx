'use client';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge, type StatusTone } from '@/components/status-badge';
import { driverStatusToLabel } from '@/features/drivers/driver-status';
import type { DriverDto, DriverStatus } from '@/features/drivers/types';

function driverStatusTone(status: DriverStatus): StatusTone {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'SUSPENDED':
      return 'warning';
    case 'UNAVAILABLE':
      return 'neutral';
    case 'DISABLED':
      return 'danger';
    default:
      return 'neutral';
  }
}

export interface DriversTableProps {
  drivers: DriverDto[];
  onEdit: (driver: DriverDto) => void;
  onDelete: (driver: DriverDto) => void;
  onAssignVehicle: (driver: DriverDto) => void;
  onRevokeDevice: (driver: DriverDto) => void;
}

export function DriversTable({ drivers, onEdit, onDelete, onAssignVehicle, onRevokeDevice }: DriversTableProps) {
  if (drivers.length === 0) {
    return <EmptyState title="Aucun chauffeur" description="Aucun chauffeur pour ces filtres." className="py-14" />;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-2xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Nom</th>
            <th className="px-4 py-3">Téléphone</th>
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3">Véhicule affecté</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((driver) => (
            <tr key={driver.id} className="border-b border-border transition-colors last:border-0 hover:bg-muted/40">
              <td className="px-4 py-3 font-medium text-foreground">
                {driver.firstName} {driver.lastName}
              </td>
              <td className="px-4 py-3 tabular-nums">{driver.phone}</td>
              <td className="px-4 py-3">
                <StatusBadge tone={driverStatusTone(driver.status)} dot>
                  {driverStatusToLabel(driver.status)}
                </StatusBadge>
              </td>
              <td className="px-4 py-3 tabular-nums">{driver.currentVehicle?.plateNumber ?? '—'}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  <Button type="button" size="sm" variant="outline" onClick={() => onEdit(driver)}>
                    Modifier
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => onAssignVehicle(driver)}>
                    Affecter véhicule
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => onRevokeDevice(driver)}>
                    Révoquer appareil
                  </Button>
                  <Button type="button" size="sm" variant="destructive" onClick={() => onDelete(driver)}>
                    Désactiver
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
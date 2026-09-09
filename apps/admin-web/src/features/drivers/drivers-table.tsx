'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { driverStatusToBadgeVariant, driverStatusToLabel } from '@/features/drivers/driver-status';
import type { DriverDto } from '@/features/drivers/types';

export interface DriversTableProps {
  drivers: DriverDto[];
  onEdit: (driver: DriverDto) => void;
  onDelete: (driver: DriverDto) => void;
  onAssignVehicle: (driver: DriverDto) => void;
  onRevokeDevice: (driver: DriverDto) => void;
}

export function DriversTable({ drivers, onEdit, onDelete, onAssignVehicle, onRevokeDevice }: DriversTableProps) {
  if (drivers.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Aucun chauffeur pour ces filtres.</p>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="px-3 py-2">Nom</th>
            <th className="px-3 py-2">Téléphone</th>
            <th className="px-3 py-2">Statut</th>
            <th className="px-3 py-2">Véhicule affecté</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((driver) => (
            <tr key={driver.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2 font-medium">
                {driver.firstName} {driver.lastName}
              </td>
              <td className="px-3 py-2">{driver.phone}</td>
              <td className="px-3 py-2">
                <Badge variant={driverStatusToBadgeVariant(driver.status)}>{driverStatusToLabel(driver.status)}</Badge>
              </td>
              <td className="px-3 py-2">{driver.currentVehicle?.plateNumber ?? '—'}</td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
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

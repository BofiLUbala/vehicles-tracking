'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { vehicleStatusToBadgeVariant, vehicleStatusToLabel } from '@/features/vehicles/vehicle-status';
import type { VehicleDto } from '@/features/vehicles/types';

export interface VehiclesTableProps {
  vehicles: VehicleDto[];
  selectedVehicleId?: string | null;
  onEdit: (vehicle: VehicleDto) => void;
  onAssignDriver: (vehicle: VehicleDto) => void;
  onSelectHistory: (vehicle: VehicleDto) => void;
}

export function VehiclesTable({ vehicles, selectedVehicleId, onEdit, onAssignDriver, onSelectHistory }: VehiclesTableProps) {
  if (vehicles.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Aucun véhicule pour ces filtres.</p>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="px-3 py-2">Immatriculation</th>
            <th className="px-3 py-2">Marque / Modèle</th>
            <th className="px-3 py-2">Statut</th>
            <th className="px-3 py-2">Chauffeur affecté</th>
            <th className="px-3 py-2">Capacité réservoir</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((vehicle) => (
            <tr key={vehicle.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2 font-medium">
                <button
                  type="button"
                  className={
                    'underline decoration-dotted ' +
                    (selectedVehicleId === vehicle.id ? 'font-semibold text-primary' : '')
                  }
                  onClick={() => onSelectHistory(vehicle)}
                >
                  {vehicle.plateNumber}
                </button>
              </td>
              <td className="px-3 py-2">{[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || '—'}</td>
              <td className="px-3 py-2">
                <Badge variant={vehicleStatusToBadgeVariant(vehicle.status)}>{vehicleStatusToLabel(vehicle.status)}</Badge>
              </td>
              <td className="px-3 py-2">
                {vehicle.currentDriver ? `${vehicle.currentDriver.firstName} ${vehicle.currentDriver.lastName}` : '—'}
              </td>
              <td className="px-3 py-2">{vehicle.tankCapacity != null ? `${vehicle.tankCapacity} L` : '—'}</td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  <Button type="button" size="sm" variant="outline" onClick={() => onEdit(vehicle)}>
                    Modifier
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => onAssignDriver(vehicle)}>
                    Affecter chauffeur
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

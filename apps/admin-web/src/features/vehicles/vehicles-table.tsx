'use client';

import { CarFront, Truck, Wrench, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { vehicleStatusToLabel, vehicleStatusTone } from '@/features/vehicles/vehicle-status';
import type { VehicleDto } from '@/features/vehicles/types';

export interface VehiclesTableProps {
  vehicles: VehicleDto[];
  selectedVehicleId?: string | null;
  onEdit: (vehicle: VehicleDto) => void;
  onAssignDriver: (vehicle: VehicleDto) => void;
  onSelectHistory: (vehicle: VehicleDto) => void;
}

export function VehiclesTable({ vehicles, selectedVehicleId, onEdit, onAssignDriver, onSelectHistory }: VehiclesTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-2xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Immatriculation</th>
            <th className="px-4 py-3">Marque / Modèle</th>
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3">Chauffeur affecté</th>
            <th className="px-4 py-3 text-right">Capacité réservoir</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((vehicle) => (
            <tr key={vehicle.id} className="border-b border-border transition-colors last:border-0 hover:bg-muted/40">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy/10 text-navy">
                    {vehicle.status === 'BROKEN_DOWN' || vehicle.status === 'IN_MAINTENANCE' ? (
                      <Wrench className="h-4 w-4" />
                    ) : (
                      <Truck className="h-4 w-4" />
                    )}
                  </span>
                  <button
                    type="button"
                    className={
                      'font-semibold underline decoration-dotted underline-offset-2 min-h-[24px] inline-flex items-center ' +
                      (selectedVehicleId === vehicle.id ? 'text-primary' : 'text-foreground hover:text-primary')
                    }
                    onClick={() => onSelectHistory(vehicle)}
                  >
                    {vehicle.plateNumber}
                  </button>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || '—'}
              </td>
              <td className="px-4 py-3">
                <StatusBadge tone={vehicleStatusTone(vehicle.status)} dot>
                  {vehicleStatusToLabel(vehicle.status)}
                </StatusBadge>
              </td>
              <td className="px-4 py-3">
                {vehicle.currentDriver ? (
                  <span className="inline-flex items-center gap-1.5 text-foreground">
                    <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                    {vehicle.currentDriver.firstName} {vehicle.currentDriver.lastName}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-bold tabular-nums text-foreground">
                {vehicle.tankCapacity != null ? `${vehicle.tankCapacity} L` : '—'}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap justify-end gap-1">
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
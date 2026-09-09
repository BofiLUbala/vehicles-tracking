'use client';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { VEHICLE_STATUSES } from '@/features/vehicles/schemas';
import { vehicleStatusToLabel } from '@/features/vehicles/vehicle-status';
import type { VehicleFilters } from '@/features/vehicles/types';

export interface VehiclesFiltersProps {
  filters: VehicleFilters;
  onChange: (filters: VehicleFilters) => void;
}

/** `GET /vehicles` ne prend aucun paramètre de requête (voir `vehicles.controller.ts`) : le
 * filtrage se fait donc côté client sur la liste complète renvoyée par l'API. */
export function VehiclesFiltersBar({ filters, onChange }: VehiclesFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="vehicle-search" className="text-xs text-muted-foreground">
          Recherche
        </label>
        <Input
          id="vehicle-search"
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          placeholder="Immatriculation, marque, modèle"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="vehicle-status" className="text-xs text-muted-foreground">
          Statut
        </label>
        <Select
          id="vehicle-status"
          value={filters.status ?? ''}
          onChange={(e) => onChange({ ...filters, status: (e.target.value || undefined) as VehicleFilters['status'] })}
        >
          <option value="">Tous</option>
          {VEHICLE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {vehicleStatusToLabel(status)}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

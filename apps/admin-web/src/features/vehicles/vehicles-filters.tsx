'use client';

import { FilterBar, FilterField } from '@/components/filter-bar';
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
 *  filtrage se fait donc côté client sur la liste complète renvoyée par l'API. */
export function VehiclesFiltersBar({ filters, onChange }: VehiclesFiltersProps) {
  return (
    <FilterBar>
      <FilterField label="Recherche">
        <Input
          id="vehicle-search"
          aria-label="Recherche"
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          placeholder="Immatriculation, marque, modèle"
          className="min-w-[16rem]"
        />
      </FilterField>
      <FilterField label="Statut">
        <Select
          id="vehicle-status"
          aria-label="Statut"
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
      </FilterField>
    </FilterBar>
  );
}
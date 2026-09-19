'use client';

import { FilterBar, FilterField } from '@/components/filter-bar';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DRIVER_STATUSES } from '@/features/drivers/schemas';
import { driverStatusToLabel } from '@/features/drivers/driver-status';
import type { DriverFilters } from '@/features/drivers/types';

export interface DriversFiltersProps {
  filters: DriverFilters;
  onChange: (filters: DriverFilters) => void;
}

/** `GET /drivers` ne prend aucun paramètre de requête (voir `drivers.controller.ts`) : le filtrage
 * se fait donc côté client sur la liste complète renvoyée par l'API. */
export function DriversFiltersBar({ filters, onChange }: DriversFiltersProps) {
  return (
    <FilterBar>
      <FilterField label="Recherche">
        <Input
          id="driver-search"
          aria-label="Recherche"
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          placeholder="Nom ou téléphone"
        />
      </FilterField>
      <FilterField label="Statut">
        <Select
          id="driver-status"
          aria-label="Statut"
          value={filters.status ?? ''}
          onChange={(e) => onChange({ ...filters, status: (e.target.value || undefined) as DriverFilters['status'] })}
        >
          <option value="">Tous</option>
          {DRIVER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {driverStatusToLabel(status)}
            </option>
          ))}
        </Select>
      </FilterField>
    </FilterBar>
  );
}
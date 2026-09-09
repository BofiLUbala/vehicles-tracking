'use client';

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
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="driver-search" className="text-xs text-muted-foreground">
          Recherche
        </label>
        <Input
          id="driver-search"
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          placeholder="Nom ou téléphone"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="driver-status" className="text-xs text-muted-foreground">
          Statut
        </label>
        <Select
          id="driver-status"
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
      </div>
    </div>
  );
}

'use client';

import { FilterBar, FilterField } from '@/components/filter-bar';
import { Input } from '@/components/ui/input';
import type { FuelRecordFilters } from '@/features/fuel/types';

export interface FuelFiltersProps {
  filters: FuelRecordFilters;
  onChange: (filters: FuelRecordFilters) => void;
}

/** Filtres texte simples (id véhicule/chauffeur) — pas d'endpoint de listage véhicules/chauffeurs
 * disponible côté ce module pour construire des menus déroulants ; à améliorer en Phase 5 si
 * `GET /vehicles` et `GET /drivers` sont exposés avec des permissions admin adaptées. */
export function FuelFiltersBar({ filters, onChange }: FuelFiltersProps) {
  function set<K extends keyof FuelRecordFilters>(key: K, value: string) {
    onChange({ ...filters, [key]: value || undefined });
  }

  return (
    <FilterBar>
      <FilterField label="Véhicule (id)">
        <Input
          id="fuel-vehicle"
          aria-label="Véhicule (id)"
          value={filters.vehicleId ?? ''}
          onChange={(e) => set('vehicleId', e.target.value)}
          placeholder="uuid"
        />
      </FilterField>
      <FilterField label="Chauffeur (id)">
        <Input
          id="fuel-driver"
          aria-label="Chauffeur (id)"
          value={filters.driverId ?? ''}
          onChange={(e) => set('driverId', e.target.value)}
          placeholder="uuid"
        />
      </FilterField>
      <FilterField label="Du">
        <Input id="fuel-from" aria-label="Du" type="date" value={filters.from ?? ''} onChange={(e) => set('from', e.target.value)} />
      </FilterField>
      <FilterField label="Au">
        <Input id="fuel-to" aria-label="Au" type="date" value={filters.to ?? ''} onChange={(e) => set('to', e.target.value)} />
      </FilterField>
    </FilterBar>
  );
}
'use client';

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
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="fuel-vehicle" className="text-xs text-muted-foreground">Véhicule (id)</label>
        <Input id="fuel-vehicle" value={filters.vehicleId ?? ''} onChange={(e) => set('vehicleId', e.target.value)} placeholder="uuid" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="fuel-driver" className="text-xs text-muted-foreground">Chauffeur (id)</label>
        <Input id="fuel-driver" value={filters.driverId ?? ''} onChange={(e) => set('driverId', e.target.value)} placeholder="uuid" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="fuel-from" className="text-xs text-muted-foreground">Du</label>
        <Input id="fuel-from" type="date" value={filters.from ?? ''} onChange={(e) => set('from', e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="fuel-to" className="text-xs text-muted-foreground">Au</label>
        <Input id="fuel-to" type="date" value={filters.to ?? ''} onChange={(e) => set('to', e.target.value)} />
      </div>
    </div>
  );
}

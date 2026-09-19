'use client';

import { useState } from 'react';
import { FilterBar, FilterField } from '@/components/filter-bar';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { MISSION_STATUS_LABELS, MISSION_STATUSES } from '@/features/missions/status-labels';
import type { MissionFilters } from '@/features/missions/types';

export interface MissionsFiltersBarProps {
  filters: MissionFilters;
  onChange: (filters: MissionFilters) => void;
}

export function MissionsFiltersBar({ filters, onChange }: MissionsFiltersBarProps) {
  const [open, setOpen] = useState(true);

  function set<K extends keyof MissionFilters>(key: K, value: string) {
    onChange({ ...filters, [key]: value || undefined });
  }

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <FilterBar>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80"
        aria-expanded={open}
      >
        Filtres
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-2xs font-bold text-white">
          {activeCount}
        </span>
        <span aria-hidden>{open ? '−' : '+'}</span>
      </button>

      {open && (
        <>
          <FilterField label="Statut">
            <Select id="mission-status" aria-label="Statut" value={filters.status ?? ''} onChange={(e) => set('status', e.target.value)}>
              <option value="">Tous</option>
              {MISSION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {MISSION_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="Chauffeur (id)">
            <Input id="mission-driver" aria-label="Chauffeur (id)" value={filters.driverId ?? ''} onChange={(e) => set('driverId', e.target.value)} placeholder="uuid" />
          </FilterField>
          <FilterField label="Véhicule (id)">
            <Input id="mission-vehicle" aria-label="Véhicule (id)" value={filters.vehicleId ?? ''} onChange={(e) => set('vehicleId', e.target.value)} placeholder="uuid" />
          </FilterField>
          <FilterField label="Du">
            <Input id="mission-from" type="date" value={filters.from ?? ''} onChange={(e) => set('from', e.target.value)} />
          </FilterField>
          <FilterField label="Au">
            <Input id="mission-to" type="date" value={filters.to ?? ''} onChange={(e) => set('to', e.target.value)} />
          </FilterField>
        </>
      )}

      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => onChange({})}
          className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Réinitialiser
        </button>
      )}
    </FilterBar>
  );
}
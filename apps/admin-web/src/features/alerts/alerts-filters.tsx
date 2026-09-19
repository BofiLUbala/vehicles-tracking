'use client';

import { useState } from 'react';
import { FilterBar, FilterField } from '@/components/filter-bar';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { AlertFilters, AlertLevel, AlertStatus, AlertType } from '@/features/alerts/types';
import { alertLevelToLabel, alertStatusToLabel, alertTypeToLabel } from '@/features/alerts/alert-level';

const ALERT_TYPES: AlertType[] = [
  'SPEEDING',
  'ROUTE_DEVIATION',
  'UNAUTHORIZED_STOP',
  'MOCK_GPS',
  'MISSED_STEP',
  'LATE_ARRIVAL',
  'FUEL_ANOMALY',
  'DEVICE_OFFLINE',
  'OTHER',
];
const ALERT_LEVELS: AlertLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const ALERT_STATUSES: AlertStatus[] = ['NEW', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'];

export interface AlertsFiltersProps {
  filters: AlertFilters;
  onChange: (filters: AlertFilters) => void;
}

export function AlertsFiltersBar({ filters, onChange }: AlertsFiltersProps) {
  const [open, setOpen] = useState(false);

  function set<K extends keyof AlertFilters>(key: K, value: string) {
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
          <FilterField label="Type">
            <Select id="alert-type" value={filters.type ?? ''} onChange={(e) => set('type', e.target.value)}>
              <option value="">Tous</option>
              {ALERT_TYPES.map((t) => (
                <option key={t} value={t}>{alertTypeToLabel(t)}</option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="Niveau">
            <Select id="alert-level" value={filters.level ?? ''} onChange={(e) => set('level', e.target.value)}>
              <option value="">Tous</option>
              {ALERT_LEVELS.map((l) => (
                <option key={l} value={l}>{alertLevelToLabel(l)}</option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="Statut">
            <Select id="alert-status" value={filters.status ?? ''} onChange={(e) => set('status', e.target.value)}>
              <option value="">Tous</option>
              {ALERT_STATUSES.map((s) => (
                <option key={s} value={s}>{alertStatusToLabel(s)}</option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="Véhicule (id)">
            <Input id="alert-vehicle" value={filters.vehicleId ?? ''} onChange={(e) => set('vehicleId', e.target.value)} placeholder="uuid" />
          </FilterField>
          <FilterField label="Chauffeur (id)">
            <Input id="alert-driver" value={filters.driverId ?? ''} onChange={(e) => set('driverId', e.target.value)} placeholder="uuid" />
          </FilterField>
          <FilterField label="Du">
            <Input id="alert-from" type="date" value={filters.from ?? ''} onChange={(e) => set('from', e.target.value)} />
          </FilterField>
          <FilterField label="Au">
            <Input id="alert-to" type="date" value={filters.to ?? ''} onChange={(e) => set('to', e.target.value)} />
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
'use client';

import { FilterBar, FilterField } from '@/components/filter-bar';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { FuelReportFilters, MissionReportFilters, MissionReportStatus } from '@/features/reports/types';

const MISSION_STATUSES: MissionReportStatus[] = [
  'PLANNED',
  'ASSIGNED',
  'STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'LATE',
  'SUSPICIOUS',
  'NOT_COMPLETED',
];

const MISSION_STATUS_LABELS: Record<MissionReportStatus, string> = {
  PLANNED: 'Planifiée',
  ASSIGNED: 'Assignée',
  STARTED: 'Démarrée',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
  LATE: 'En retard',
  SUSPICIOUS: 'Suspecte',
  NOT_COMPLETED: 'Non terminée',
};

export interface MissionReportFiltersProps {
  filters: MissionReportFilters;
  onChange: (filters: MissionReportFilters) => void;
}

/** Filtres du rapport Missions : période, véhicule, chauffeur, statut, point géographique. */
export function MissionReportFiltersBar({ filters, onChange }: MissionReportFiltersProps) {
  function set<K extends keyof MissionReportFilters>(key: K, value: string) {
    onChange({ ...filters, [key]: (value || undefined) as MissionReportFilters[K] });
  }

  return (
    <FilterBar>
      <FilterField label="Du">
        <Input id="report-mission-from" aria-label="Du" type="date" value={filters.from ?? ''} onChange={(e) => set('from', e.target.value)} />
      </FilterField>
      <FilterField label="Au">
        <Input id="report-mission-to" aria-label="Au" type="date" value={filters.to ?? ''} onChange={(e) => set('to', e.target.value)} />
      </FilterField>
      <FilterField label="Véhicule (id)">
        <Input id="report-mission-vehicle" aria-label="Véhicule (id)" value={filters.vehicleId ?? ''} onChange={(e) => set('vehicleId', e.target.value)} placeholder="uuid" />
      </FilterField>
      <FilterField label="Chauffeur (id)">
        <Input id="report-mission-driver" aria-label="Chauffeur (id)" value={filters.driverId ?? ''} onChange={(e) => set('driverId', e.target.value)} placeholder="uuid" />
      </FilterField>
      <FilterField label="Statut">
        <Select id="report-mission-status" aria-label="Statut" value={filters.status ?? ''} onChange={(e) => set('status', e.target.value)}>
          <option value="">Tous</option>
          {MISSION_STATUSES.map((s) => (
            <option key={s} value={s}>{MISSION_STATUS_LABELS[s]}</option>
          ))}
        </Select>
      </FilterField>
      <FilterField label="Point géo (id)">
        <Input id="report-mission-location" aria-label="Point géo (id)" value={filters.locationId ?? ''} onChange={(e) => set('locationId', e.target.value)} placeholder="uuid" />
      </FilterField>
    </FilterBar>
  );
}

export interface FuelReportFiltersProps {
  filters: FuelReportFilters;
  onChange: (filters: FuelReportFilters) => void;
}

/** Filtres du rapport Carburant : période, véhicule, chauffeur (mêmes champs que l'écran Carburant). */
export function FuelReportFiltersBar({ filters, onChange }: FuelReportFiltersProps) {
  function set<K extends keyof FuelReportFilters>(key: K, value: string) {
    onChange({ ...filters, [key]: value || undefined });
  }

  return (
    <FilterBar>
      <FilterField label="Du">
        <Input id="report-fuel-from" aria-label="Du" type="date" value={filters.from ?? ''} onChange={(e) => set('from', e.target.value)} />
      </FilterField>
      <FilterField label="Au">
        <Input id="report-fuel-to" aria-label="Au" type="date" value={filters.to ?? ''} onChange={(e) => set('to', e.target.value)} />
      </FilterField>
      <FilterField label="Véhicule (id)">
        <Input id="report-fuel-vehicle" aria-label="Véhicule (id)" value={filters.vehicleId ?? ''} onChange={(e) => set('vehicleId', e.target.value)} placeholder="uuid" />
      </FilterField>
      <FilterField label="Chauffeur (id)">
        <Input id="report-fuel-driver" aria-label="Chauffeur (id)" value={filters.driverId ?? ''} onChange={(e) => set('driverId', e.target.value)} placeholder="uuid" />
      </FilterField>
    </FilterBar>
  );
}
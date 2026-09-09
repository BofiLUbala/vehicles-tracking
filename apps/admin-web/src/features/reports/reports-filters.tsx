'use client';

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
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="report-mission-from" className="text-xs text-muted-foreground">Du</label>
        <Input id="report-mission-from" type="date" value={filters.from ?? ''} onChange={(e) => set('from', e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="report-mission-to" className="text-xs text-muted-foreground">Au</label>
        <Input id="report-mission-to" type="date" value={filters.to ?? ''} onChange={(e) => set('to', e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="report-mission-vehicle" className="text-xs text-muted-foreground">Véhicule (id)</label>
        <Input id="report-mission-vehicle" value={filters.vehicleId ?? ''} onChange={(e) => set('vehicleId', e.target.value)} placeholder="uuid" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="report-mission-driver" className="text-xs text-muted-foreground">Chauffeur (id)</label>
        <Input id="report-mission-driver" value={filters.driverId ?? ''} onChange={(e) => set('driverId', e.target.value)} placeholder="uuid" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="report-mission-status" className="text-xs text-muted-foreground">Statut</label>
        <Select id="report-mission-status" value={filters.status ?? ''} onChange={(e) => set('status', e.target.value)}>
          <option value="">Tous</option>
          {MISSION_STATUSES.map((s) => (
            <option key={s} value={s}>{MISSION_STATUS_LABELS[s]}</option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="report-mission-location" className="text-xs text-muted-foreground">Point géo (id)</label>
        <Input id="report-mission-location" value={filters.locationId ?? ''} onChange={(e) => set('locationId', e.target.value)} placeholder="uuid" />
      </div>
    </div>
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
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="report-fuel-from" className="text-xs text-muted-foreground">Du</label>
        <Input id="report-fuel-from" type="date" value={filters.from ?? ''} onChange={(e) => set('from', e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="report-fuel-to" className="text-xs text-muted-foreground">Au</label>
        <Input id="report-fuel-to" type="date" value={filters.to ?? ''} onChange={(e) => set('to', e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="report-fuel-vehicle" className="text-xs text-muted-foreground">Véhicule (id)</label>
        <Input id="report-fuel-vehicle" value={filters.vehicleId ?? ''} onChange={(e) => set('vehicleId', e.target.value)} placeholder="uuid" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="report-fuel-driver" className="text-xs text-muted-foreground">Chauffeur (id)</label>
        <Input id="report-fuel-driver" value={filters.driverId ?? ''} onChange={(e) => set('driverId', e.target.value)} placeholder="uuid" />
      </div>
    </div>
  );
}

'use client';

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
  function set<K extends keyof AlertFilters>(key: K, value: string) {
    onChange({ ...filters, [key]: value || undefined });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="alert-type" className="text-xs text-muted-foreground">Type</label>
        <Select id="alert-type" value={filters.type ?? ''} onChange={(e) => set('type', e.target.value)}>
          <option value="">Tous</option>
          {ALERT_TYPES.map((t) => (
            <option key={t} value={t}>{alertTypeToLabel(t)}</option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="alert-level" className="text-xs text-muted-foreground">Niveau</label>
        <Select id="alert-level" value={filters.level ?? ''} onChange={(e) => set('level', e.target.value)}>
          <option value="">Tous</option>
          {ALERT_LEVELS.map((l) => (
            <option key={l} value={l}>{alertLevelToLabel(l)}</option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="alert-status" className="text-xs text-muted-foreground">Statut</label>
        <Select id="alert-status" value={filters.status ?? ''} onChange={(e) => set('status', e.target.value)}>
          <option value="">Tous</option>
          {ALERT_STATUSES.map((s) => (
            <option key={s} value={s}>{alertStatusToLabel(s)}</option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="alert-vehicle" className="text-xs text-muted-foreground">Véhicule (id)</label>
        <Input id="alert-vehicle" value={filters.vehicleId ?? ''} onChange={(e) => set('vehicleId', e.target.value)} placeholder="uuid" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="alert-driver" className="text-xs text-muted-foreground">Chauffeur (id)</label>
        <Input id="alert-driver" value={filters.driverId ?? ''} onChange={(e) => set('driverId', e.target.value)} placeholder="uuid" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="alert-from" className="text-xs text-muted-foreground">Du</label>
        <Input id="alert-from" type="date" value={filters.from ?? ''} onChange={(e) => set('from', e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="alert-to" className="text-xs text-muted-foreground">Au</label>
        <Input id="alert-to" type="date" value={filters.to ?? ''} onChange={(e) => set('to', e.target.value)} />
      </div>
    </div>
  );
}

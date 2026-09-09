'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { MISSION_STATUS_LABELS, MISSION_STATUSES } from '@/features/missions/status-labels';
import type { MissionFilters } from '@/features/missions/types';

export interface MissionsFiltersBarProps {
  filters: MissionFilters;
  onChange: (filters: MissionFilters) => void;
}

export function MissionsFiltersBar({ filters, onChange }: MissionsFiltersBarProps) {
  function set<K extends keyof MissionFilters>(key: K, value: string) {
    onChange({ ...filters, [key]: value || undefined });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="mission-status">Statut</Label>
        <Select
          id="mission-status"
          value={filters.status ?? ''}
          onChange={(e) => set('status', e.target.value)}
        >
          <option value="">Tous</option>
          {MISSION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {MISSION_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="mission-driver">Chauffeur (id)</Label>
        <Input id="mission-driver" value={filters.driverId ?? ''} onChange={(e) => set('driverId', e.target.value)} placeholder="uuid" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="mission-vehicle">Véhicule (id)</Label>
        <Input id="mission-vehicle" value={filters.vehicleId ?? ''} onChange={(e) => set('vehicleId', e.target.value)} placeholder="uuid" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="mission-from">Du</Label>
        <Input id="mission-from" type="date" value={filters.from ?? ''} onChange={(e) => set('from', e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="mission-to">Au</Label>
        <Input id="mission-to" type="date" value={filters.to ?? ''} onChange={(e) => set('to', e.target.value)} />
      </div>
    </div>
  );
}

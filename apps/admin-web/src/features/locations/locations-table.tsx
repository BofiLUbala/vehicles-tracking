'use client';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge, type StatusTone } from '@/components/status-badge';
import { LOCATION_TYPE_LABELS, LOCATION_STATUS_LABELS, type LocationDto, type LocationType } from '@/features/locations/types';

const LOCATION_TYPE_TONES: Record<LocationType, StatusTone> = {
  COLLECTION: 'navy',
  DROPOFF: 'neutral',
  LANDFILL: 'warning',
  TRANSFER_CENTER: 'info',
  AUTHORIZED_GAS_STATION: 'warning',
};

export interface LocationsTableProps {
  locations: LocationDto[];
  onEdit: (location: LocationDto) => void;
  onDelete: (location: LocationDto) => void;
  onGenerateQr: (location: LocationDto) => void;
}

export function LocationsTable({ locations, onEdit, onDelete, onGenerateQr }: LocationsTableProps) {
  if (locations.length === 0) {
    return <EmptyState title="Aucun point géographique" description="Aucun point géographique enregistré." className="py-14" />;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-2xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Nom</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Adresse</th>
            <th className="px-4 py-3">Rayon autorisé</th>
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {locations.map((location) => (
            <tr key={location.id} className="border-b border-border transition-colors last:border-0 hover:bg-muted/40">
              <td className="px-4 py-3 font-medium text-foreground">{location.name}</td>
              <td className="px-4 py-3">
                <StatusBadge tone={LOCATION_TYPE_TONES[location.type] ?? 'neutral'}>
                  {LOCATION_TYPE_LABELS[location.type] ?? location.type}
                </StatusBadge>
              </td>
              <td className="px-4 py-3">{location.address ?? '—'}</td>
              <td className="px-4 py-3 tabular-nums">{location.allowedRadius} m</td>
              <td className="px-4 py-3">
                <StatusBadge tone={location.status === 'ACTIVE' ? 'success' : 'danger'} dot>
                  {LOCATION_STATUS_LABELS[location.status] ?? location.status}
                </StatusBadge>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  <Button type="button" variant="outline" size="sm" onClick={() => onEdit(location)}>
                    Modifier
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => onGenerateQr(location)}>
                    Générer QR
                  </Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(location)}>
                    Désactiver
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
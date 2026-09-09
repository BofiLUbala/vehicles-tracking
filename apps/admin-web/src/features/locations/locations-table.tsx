'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LOCATION_TYPE_LABELS, LOCATION_STATUS_LABELS, type LocationDto } from '@/features/locations/types';

export interface LocationsTableProps {
  locations: LocationDto[];
  onEdit: (location: LocationDto) => void;
  onDelete: (location: LocationDto) => void;
  onGenerateQr: (location: LocationDto) => void;
}

export function LocationsTable({ locations, onEdit, onDelete, onGenerateQr }: LocationsTableProps) {
  if (locations.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Aucun point géographique enregistré.</p>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="px-3 py-2">Nom</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Adresse</th>
            <th className="px-3 py-2">Rayon autorisé</th>
            <th className="px-3 py-2">Statut</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {locations.map((location) => (
            <tr key={location.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2 font-medium">{location.name}</td>
              <td className="px-3 py-2">
                <Badge variant="outline">{LOCATION_TYPE_LABELS[location.type] ?? location.type}</Badge>
              </td>
              <td className="px-3 py-2">{location.address ?? '—'}</td>
              <td className="px-3 py-2">{location.allowedRadius} m</td>
              <td className="px-3 py-2">
                <Badge variant={location.status === 'ACTIVE' ? 'secondary' : 'destructive'}>
                  {LOCATION_STATUS_LABELS[location.status] ?? location.status}
                </Badge>
              </td>
              <td className="px-3 py-2">
                <div className="flex gap-2">
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

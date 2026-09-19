'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState, LoadingSkeleton } from '@/components/empty-state';
import { LocationForm } from '@/features/locations/location-form';
import { LocationsTable } from '@/features/locations/locations-table';
import { QrCodeDialog } from '@/features/locations/qr-code-dialog';
import {
  createLocation,
  deleteLocation,
  fetchLocations,
  generateLocationQr,
  updateLocation,
} from '@/features/locations/api';
import type { LocationFormValues } from '@/features/locations/schemas';
import type { LocationDto, LocationQrCodeDto } from '@/features/locations/types';

type PanelState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; location: LocationDto };

export function LocationsPageClient() {
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState<PanelState>({ mode: 'closed' });
  const [qrState, setQrState] = useState<{ location: LocationDto; qrCode: LocationQrCodeDto } | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  });

  const createMutation = useMutation({
    mutationFn: (values: LocationFormValues) => createLocation(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Point créé.');
      setPanel({ mode: 'closed' });
    },
    onError: () => toast.error('Impossible de créer le point.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: LocationFormValues }) => updateLocation(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Point mis à jour.');
      setPanel({ mode: 'closed' });
    },
    onError: () => toast.error('Impossible de mettre à jour le point.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Point désactivé.');
    },
    onError: () => toast.error('Impossible de désactiver le point.'),
  });

  const qrMutation = useMutation({
    mutationFn: (location: LocationDto) => generateLocationQr(location.id).then((qrCode) => ({ location, qrCode })),
    onSuccess: ({ location, qrCode }) => setQrState({ location, qrCode }),
    onError: () => toast.error('Impossible de générer le QR code.'),
  });

  function handleDelete(location: LocationDto) {
    if (window.confirm(`Désactiver le point « ${location.name} » ? Cette action peut être annulée par un administrateur.`)) {
      deleteMutation.mutate(location.id);
    }
  }

  function handleSubmit(values: LocationFormValues) {
    if (panel.mode === 'edit') {
      return updateMutation.mutateAsync({ id: panel.location.id, values });
    }
    return createMutation.mutateAsync(values);
  }

  return (
    <div className="flex flex-col gap-5 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Points géographiques</h1>
          <p className="text-sm text-muted-foreground">
            Gérez les lieux de collecte, dépôt, transfert et ravitaillement de votre flotte.
          </p>
        </div>
        {panel.mode === 'closed' && (
          <Button type="button" onClick={() => setPanel({ mode: 'create' })}>
            Nouveau point
          </Button>
        )}
      </div>

      {panel.mode !== 'closed' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {panel.mode === 'edit' ? `Modifier « ${panel.location.name} »` : 'Nouveau point'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LocationForm
              initialValues={panel.mode === 'edit' ? panel.location : null}
              onSubmit={handleSubmit}
              onCancel={() => setPanel({ mode: 'closed' })}
              submitting={createMutation.isPending || updateMutation.isPending}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading && <LoadingSkeleton className="h-64" />}
          {isError && <ErrorState message="Impossible de charger les points géographiques." />}
          {data && (
            <LocationsTable
              locations={data}
              onEdit={(location) => setPanel({ mode: 'edit', location })}
              onDelete={handleDelete}
              onGenerateQr={(location) => qrMutation.mutate(location)}
            />
          )}
        </CardContent>
      </Card>

      {qrState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <QrCodeDialog
            locationName={qrState.location.name}
            qrCode={qrState.qrCode}
            onClose={() => setQrState(null)}
          />
        </div>
      )}
    </div>
  );
}

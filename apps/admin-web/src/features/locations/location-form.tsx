'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { LocationMapPickerClient } from '@/features/locations/location-map-picker-client';
import { locationFormSchema, type LocationFormValues } from '@/features/locations/schemas';
import { LOCATION_TYPE_LABELS, LOCATION_TYPES, type LocationDto } from '@/features/locations/types';

export interface LocationFormProps {
  initialValues?: LocationDto | null;
  onSubmit: (values: LocationFormValues) => Promise<unknown> | void;
  onCancel: () => void;
  submitting?: boolean;
}

export function LocationForm({ initialValues, onSubmit, onCancel, submitting }: LocationFormProps) {
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: initialValues?.name ?? '',
      type: initialValues?.type ?? 'COLLECTION',
      address: initialValues?.address ?? '',
      latitude: initialValues?.latitude ?? (undefined as unknown as number),
      longitude: initialValues?.longitude ?? (undefined as unknown as number),
      allowedRadius: initialValues?.allowedRadius ?? 50,
    },
  });

  const latitude = form.watch('latitude');
  const longitude = form.watch('longitude');

  function handlePick(lat: number, lng: number) {
    form.setValue('latitude', Number(lat.toFixed(6)), { shouldValidate: true, shouldDirty: true });
    form.setValue('longitude', Number(lng.toFixed(6)), { shouldValidate: true, shouldDirty: true });
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((values) => onSubmit(values))} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="location-name">Nom</Label>
          <Input id="location-name" {...form.register('name')} />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="location-type">Type</Label>
          <Select id="location-type" {...form.register('type')}>
            {LOCATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {LOCATION_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
          {form.formState.errors.type && (
            <p className="text-sm text-destructive">{form.formState.errors.type.message}</p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="location-address">Adresse</Label>
          <Input id="location-address" {...form.register('address')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location-latitude">Latitude</Label>
          <Input id="location-latitude" type="number" step="any" {...form.register('latitude', { valueAsNumber: true })} />
          {form.formState.errors.latitude && (
            <p className="text-sm text-destructive">{form.formState.errors.latitude.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="location-longitude">Longitude</Label>
          <Input id="location-longitude" type="number" step="any" {...form.register('longitude', { valueAsNumber: true })} />
          {form.formState.errors.longitude && (
            <p className="text-sm text-destructive">{form.formState.errors.longitude.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="location-radius">Rayon autorisé (mètres)</Label>
          <Input id="location-radius" type="number" step="1" {...form.register('allowedRadius', { valueAsNumber: true })} />
          {form.formState.errors.allowedRadius && (
            <p className="text-sm text-destructive">{form.formState.errors.allowedRadius.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Choisir sur la carte</Label>
        <LocationMapPickerClient
          latitude={typeof latitude === 'number' && !Number.isNaN(latitude) ? latitude : null}
          longitude={typeof longitude === 'number' && !Number.isNaN(longitude) ? longitude : null}
          onPick={handlePick}
        />
        <p className="text-xs text-muted-foreground">
          Cliquez sur la carte (ou déplacez le marqueur) pour définir les coordonnées automatiquement.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Annuler
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Enregistrement…' : initialValues ? 'Mettre à jour' : 'Créer le point'}
        </Button>
      </div>
    </form>
  );
}

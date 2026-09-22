'use client';

import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { fetchDrivers, fetchVehicles } from '@/features/missions/api';
import { fetchLocations } from '@/features/locations/api';
import { missionFormSchema, type MissionFormValues } from '@/features/missions/schemas';
import { MISSION_STEP_ACTION_LABELS, MISSION_STEP_ACTION_TYPES } from '@/features/missions/status-labels';
import {
  isDriverAssignable,
  isVehicleAssignable,
  type DriverRef,
  type VehicleRef,
} from '@/features/missions/types';

export interface MissionFormProps {
  onSubmit: (values: MissionFormValues) => Promise<unknown> | void;
  onCancel: () => void;
  submitting?: boolean;
}

const DRIVER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Disponible',
  PENDING_VERIFICATION: 'Non vérifié',
  SUSPENDED: 'Suspendu',
  UNAVAILABLE: 'Indisponible',
  DISABLED: 'Désactivé',
};

const VEHICLE_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible',
  ON_MISSION: 'En mission',
  BROKEN_DOWN: 'En panne',
  IN_MAINTENANCE: 'En maintenance',
  DISABLED: 'Désactivé',
};

function driverAvailability(driver: DriverRef): string {
  if (driver.activeMission) return 'En mission';
  return DRIVER_STATUS_LABELS[driver.status] ?? driver.status;
}

function driverLabel(driver: DriverRef): string {
  const identity = `${driver.firstName} ${driver.lastName}`.trim() || 'Chauffeur';
  const contact = driver.phone || driver.email || '';
  const vehicle = driver.currentVehicle ? ` — ${driver.currentVehicle.plateNumber}` : '';
  return `${identity}${contact ? ` (${contact})` : ''}${vehicle} — ${driverAvailability(driver)}`;
}

function vehicleAvailability(vehicle: VehicleRef): string {
  if (vehicle.activeMission) return 'En mission';
  return VEHICLE_STATUS_LABELS[vehicle.status] ?? vehicle.status;
}

function vehicleLabel(vehicle: VehicleRef): string {
  const model = [vehicle.brand, vehicle.model].filter(Boolean).join(' ');
  return `${vehicle.plateNumber}${model ? ` — ${model}` : ''} — ${vehicleAvailability(vehicle)}`;
}

export function MissionForm({ onSubmit, onCancel, submitting }: MissionFormProps) {
  const driversQuery = useQuery({ queryKey: ['missions', 'drivers'], queryFn: fetchDrivers });
  const vehiclesQuery = useQuery({ queryKey: ['missions', 'vehicles'], queryFn: fetchVehicles });
  const locationsQuery = useQuery({ queryKey: ['locations'], queryFn: fetchLocations });

  const form = useForm<MissionFormValues>({
    resolver: zodResolver(missionFormSchema),
    defaultValues: {
      driverId: '',
      vehicleId: '',
      plannedStart: '',
      plannedEnd: '',
      steps: [{ locationId: '', actionType: 'COLLECT', plannedAt: '', toleranceMin: 15 }],
    },
  });

  const { fields, append, remove, swap } = useFieldArray({ control: form.control, name: 'steps' });

  const selectedDriverId = form.watch('driverId');
  const selectedDriver = driversQuery.data?.find((d) => d.id === selectedDriverId) ?? null;
  const selectedVehicleId = form.watch('vehicleId');

  // Si le chauffeur a déjà un véhicule actuel assignable et qu'aucun véhicule n'est choisi,
  // on le présélectionne (évite les combinaisons impossibles).
  useEffect(() => {
    if (!selectedDriver?.currentVehicle || selectedVehicleId) return;
    const current = vehiclesQuery.data?.find((v) => v.id === selectedDriver.currentVehicle?.id);
    if (current && isVehicleAssignable(current)) {
      form.setValue('vehicleId', current.id, { shouldValidate: true });
    }
  }, [selectedDriver, selectedVehicleId, vehiclesQuery.data, form]);

  function moveUp(index: number) {
    if (index > 0) swap(index, index - 1);
  }

  function moveDown(index: number) {
    if (index < fields.length - 1) swap(index, index + 1);
  }

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit((values) => onSubmit(values))} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="mission-driver-select">Chauffeur</Label>
          <Select
            id="mission-driver-select"
            {...form.register('driverId')}
            disabled={driversQuery.isLoading}
          >
            <option value="">Sélectionner…</option>
            {driversQuery.data?.map((driver) => (
              <option key={driver.id} value={driver.id} disabled={!isDriverAssignable(driver)}>
                {driverLabel(driver)}
              </option>
            ))}
          </Select>
          {driversQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Chargement des chauffeurs…</p>
          )}
          {driversQuery.isError && (
            <div className="flex items-center gap-2">
              <p className="text-sm text-destructive">Impossible de charger les chauffeurs.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => driversQuery.refetch()}>
                Réessayer
              </Button>
            </div>
          )}
          {driversQuery.data && driversQuery.data.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun chauffeur disponible.</p>
          )}
          {form.formState.errors.driverId && (
            <p className="text-sm text-destructive">{form.formState.errors.driverId.message}</p>
          )}
          {selectedDriver && (
            <dl className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between gap-2 py-0.5">
                <dt className="text-muted-foreground">Statut</dt>
                <dd className="font-medium">{driverAvailability(selectedDriver)}</dd>
              </div>
              <div className="flex justify-between gap-2 py-0.5">
                <dt className="text-muted-foreground">Véhicule actuel</dt>
                <dd className="font-medium">{selectedDriver.currentVehicle?.plateNumber ?? 'Aucun'}</dd>
              </div>
              <div className="flex justify-between gap-2 py-0.5">
                <dt className="text-muted-foreground">Mission active</dt>
                <dd className="font-medium">
                  {selectedDriver.activeMission
                    ? `${selectedDriver.activeMission.id.slice(0, 8).toUpperCase()} (${selectedDriver.activeMission.status})`
                    : 'Aucune'}
                </dd>
              </div>
            </dl>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="mission-vehicle-select">Véhicule</Label>
          <Select
            id="mission-vehicle-select"
            {...form.register('vehicleId')}
            disabled={vehiclesQuery.isLoading}
          >
            <option value="">Sélectionner…</option>
            {vehiclesQuery.data?.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id} disabled={!isVehicleAssignable(vehicle)}>
                {vehicleLabel(vehicle)}
              </option>
            ))}
          </Select>
          {vehiclesQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Chargement des véhicules…</p>
          )}
          {vehiclesQuery.isError && (
            <div className="flex items-center gap-2">
              <p className="text-sm text-destructive">Impossible de charger les véhicules.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => vehiclesQuery.refetch()}>
                Réessayer
              </Button>
            </div>
          )}
          {vehiclesQuery.data && vehiclesQuery.data.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun véhicule disponible.</p>
          )}
          {form.formState.errors.vehicleId && (
            <p className="text-sm text-destructive">{form.formState.errors.vehicleId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="mission-planned-start">Début planifié</Label>
          <Input id="mission-planned-start" type="datetime-local" {...form.register('plannedStart')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mission-planned-end">Fin planifiée</Label>
          <Input id="mission-planned-end" type="datetime-local" {...form.register('plannedEnd')} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Étapes</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ locationId: '', actionType: 'COLLECT', plannedAt: '', toleranceMin: 15 })}
          >
            Ajouter une étape
          </Button>
        </div>
        {form.formState.errors.steps?.message && (
          <p className="text-sm text-destructive">{form.formState.errors.steps.message}</p>
        )}

        <ol className="space-y-3">
          {fields.map((field, index) => (
            <li key={field.id} className="rounded-md border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Étape {index + 1}</span>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => moveUp(index)} disabled={index === 0}>
                    Monter
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveDown(index)}
                    disabled={index === fields.length - 1}
                  >
                    Descendre
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                  >
                    Retirer
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor={`step-location-${index}`}>Lieu</Label>
                  <Select id={`step-location-${index}`} {...form.register(`steps.${index}.locationId` as const)}>
                    <option value="">Sélectionner…</option>
                    {locationsQuery.data?.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </Select>
                  {form.formState.errors.steps?.[index]?.locationId && (
                    <p className="text-sm text-destructive">{form.formState.errors.steps[index]?.locationId?.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`step-action-${index}`}>Action</Label>
                  <Select id={`step-action-${index}`} {...form.register(`steps.${index}.actionType` as const)}>
                    {MISSION_STEP_ACTION_TYPES.map((action) => (
                      <option key={action} value={action}>
                        {MISSION_STEP_ACTION_LABELS[action]}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`step-tolerance-${index}`}>Tolérance (min)</Label>
                  <Input
                    id={`step-tolerance-${index}`}
                    type="number"
                    step="1"
                    {...form.register(`steps.${index}.toleranceMin` as const)}
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor={`step-planned-at-${index}`}>Heure planifiée</Label>
                  <Input
                    id={`step-planned-at-${index}`}
                    type="datetime-local"
                    {...form.register(`steps.${index}.plannedAt` as const)}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Annuler
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Création…' : 'Créer la mission'}
        </Button>
      </div>
    </form>
  );
}

'use client';

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

export interface MissionFormProps {
  onSubmit: (values: MissionFormValues) => Promise<unknown> | void;
  onCancel: () => void;
  submitting?: boolean;
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
          <Select id="mission-driver-select" {...form.register('driverId')}>
            <option value="">Sélectionner…</option>
            {driversQuery.data?.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.firstName} {driver.lastName}
              </option>
            ))}
          </Select>
          {form.formState.errors.driverId && (
            <p className="text-sm text-destructive">{form.formState.errors.driverId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="mission-vehicle-select">Véhicule</Label>
          <Select id="mission-vehicle-select" {...form.register('vehicleId')}>
            <option value="">Sélectionner…</option>
            {vehiclesQuery.data?.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plateNumber}
              </option>
            ))}
          </Select>
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

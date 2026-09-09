'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { vehicleFormSchema, VEHICLE_STATUSES, type VehicleFormOutput, type VehicleFormValues } from '@/features/vehicles/schemas';
import { vehicleStatusToLabel } from '@/features/vehicles/vehicle-status';
import type { VehicleDto } from '@/features/vehicles/types';

export interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: VehicleDto | null;
  onSubmit: (values: VehicleFormOutput) => Promise<void> | void;
  submitting?: boolean;
}

/** Formulaire de création/édition d'un véhicule, réutilisé pour les deux cas (édition si `vehicle` est fourni). */
export function VehicleFormDialog({ open, onOpenChange, vehicle, onSubmit, submitting }: VehicleFormDialogProps) {
  const isEditing = Boolean(vehicle);

  const form = useForm<VehicleFormValues, unknown, VehicleFormOutput>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      plateNumber: '',
      brand: '',
      model: '',
      year: '',
      status: 'AVAILABLE',
      tankCapacity: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      plateNumber: vehicle?.plateNumber ?? '',
      brand: vehicle?.brand ?? '',
      model: vehicle?.model ?? '',
      year: vehicle?.year != null ? String(vehicle.year) : '',
      status: vehicle?.status ?? 'AVAILABLE',
      tankCapacity: vehicle?.tankCapacity != null ? String(vehicle.tankCapacity) : '',
    });
  }, [open, vehicle, form]);

  async function handleFormSubmit(values: VehicleFormOutput) {
    await onSubmit(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Modifier le véhicule' : 'Nouveau véhicule'}</DialogTitle>
      </DialogHeader>
      <form className="space-y-4" onSubmit={form.handleSubmit(handleFormSubmit)} noValidate>
        <div className="space-y-2">
          <Label htmlFor="plateNumber">Immatriculation</Label>
          <Input id="plateNumber" placeholder="AB-123-CD" {...form.register('plateNumber')} />
          {form.formState.errors.plateNumber && (
            <p className="text-sm text-destructive">{form.formState.errors.plateNumber.message}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="brand">Marque</Label>
            <Input id="brand" {...form.register('brand')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Modèle</Label>
            <Input id="model" {...form.register('model')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="year">Année</Label>
            <Input id="year" inputMode="numeric" {...form.register('year')} />
            {form.formState.errors.year && (
              <p className="text-sm text-destructive">{form.formState.errors.year.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tankCapacity">Capacité réservoir (L)</Label>
            <Input id="tankCapacity" inputMode="decimal" {...form.register('tankCapacity')} />
            {form.formState.errors.tankCapacity && (
              <p className="text-sm text-destructive">{form.formState.errors.tankCapacity.message}</p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Statut</Label>
          <Select id="status" {...form.register('status')}>
            {VEHICLE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {vehicleStatusToLabel(status)}
              </option>
            ))}
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { driverFormSchema, DRIVER_STATUSES, type DriverFormValues } from '@/features/drivers/schemas';
import { driverStatusToLabel } from '@/features/drivers/driver-status';
import type { DriverDto } from '@/features/drivers/types';

export interface DriverFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver?: DriverDto | null;
  onSubmit: (values: DriverFormValues) => Promise<void> | void;
  submitting?: boolean;
}

/** Formulaire de création/édition d'un chauffeur, réutilisé pour les deux cas (édition si `driver` est fourni). */
export function DriverFormDialog({ open, onOpenChange, driver, onSubmit, submitting }: DriverFormDialogProps) {
  const isEditing = Boolean(driver);

  const form = useForm<DriverFormValues>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      licenseNumber: '',
      status: 'ACTIVE',
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      firstName: driver?.firstName ?? '',
      lastName: driver?.lastName ?? '',
      phone: driver?.phone ?? '',
      licenseNumber: driver?.licenseNumber ?? '',
      status: driver?.status ?? 'ACTIVE',
    });
  }, [open, driver, form]);

  async function handleFormSubmit(values: DriverFormValues) {
    await onSubmit(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Modifier le chauffeur' : 'Nouveau chauffeur'}</DialogTitle>
      </DialogHeader>
      <form className="space-y-4" onSubmit={form.handleSubmit(handleFormSubmit)} noValidate>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Prénom</Label>
            <Input id="firstName" {...form.register('firstName')} />
            {form.formState.errors.firstName && (
              <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Nom</Label>
            <Input id="lastName" {...form.register('lastName')} />
            {form.formState.errors.lastName && (
              <p className="text-sm text-destructive">{form.formState.errors.lastName.message}</p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" placeholder="+243999000000" {...form.register('phone')} />
          {form.formState.errors.phone && (
            <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="licenseNumber">Numéro de permis</Label>
          <Input id="licenseNumber" {...form.register('licenseNumber')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Statut</Label>
          <Select id="status" {...form.register('status')}>
            {DRIVER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {driverStatusToLabel(status)}
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

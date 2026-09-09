'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { DriverDto } from '@/features/drivers/types';
import type { VehicleDto } from '@/features/vehicles/types';

export interface AssignDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: VehicleDto | null;
  drivers: DriverDto[];
  onAssign: (driverId: string) => Promise<void> | void;
  submitting?: boolean;
}

/** Dialogue permettant d'affecter un chauffeur à un véhicule (`POST /vehicles/:id/assign-driver`). */
export function AssignDriverDialog({ open, onOpenChange, vehicle, drivers, onAssign, submitting }: AssignDriverDialogProps) {
  const [driverId, setDriverId] = useState('');

  if (!vehicle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Affecter un chauffeur</DialogTitle>
        <DialogDescription>Véhicule : {vehicle.plateNumber}</DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="driverId">Chauffeur</Label>
        <Select id="driverId" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
          <option value="">Sélectionner un chauffeur…</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.firstName} {driver.lastName}
            </option>
          ))}
        </Select>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Annuler
        </Button>
        <Button type="button" disabled={!driverId || submitting} onClick={() => onAssign(driverId)}>
          {submitting ? 'Affectation…' : 'Affecter'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

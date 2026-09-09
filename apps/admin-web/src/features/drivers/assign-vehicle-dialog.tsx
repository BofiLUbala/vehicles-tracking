'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { DriverDto } from '@/features/drivers/types';
import type { VehicleDto } from '@/features/vehicles/types';

export interface AssignVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: DriverDto | null;
  vehicles: VehicleDto[];
  onAssign: (vehicleId: string) => Promise<void> | void;
  submitting?: boolean;
}

/** Dialogue permettant d'affecter un véhicule disponible à un chauffeur (`POST /drivers/:id/assign-vehicle`). */
export function AssignVehicleDialog({ open, onOpenChange, driver, vehicles, onAssign, submitting }: AssignVehicleDialogProps) {
  const [vehicleId, setVehicleId] = useState('');

  if (!driver) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Affecter un véhicule</DialogTitle>
        <DialogDescription>
          Chauffeur : {driver.firstName} {driver.lastName}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="vehicleId">Véhicule</Label>
        <Select id="vehicleId" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
          <option value="">Sélectionner un véhicule…</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.plateNumber} {vehicle.brand ? `— ${vehicle.brand} ${vehicle.model ?? ''}`.trim() : ''}
            </option>
          ))}
        </Select>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Annuler
        </Button>
        <Button
          type="button"
          disabled={!vehicleId || submitting}
          onClick={() => onAssign(vehicleId)}
        >
          {submitting ? 'Affectation…' : 'Affecter'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

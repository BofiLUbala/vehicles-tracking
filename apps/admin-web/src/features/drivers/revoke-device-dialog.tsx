'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DriverDto } from '@/features/drivers/types';

export interface RevokeDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: DriverDto | null;
  onRevoke: (deviceId: string) => Promise<void> | void;
  submitting?: boolean;
}

/**
 * Dialogue de révocation d'appareil — action sensible (sécurité), confirmation explicite requise.
 * L'API chauffeurs (`POST /drivers/:id/revoke-device`) n'expose pas de liste des appareils d'un
 * chauffeur ; l'identifiant est donc saisi manuellement par l'administrateur (ex: récupéré via
 * un signalement de perte/vol d'appareil).
 */
export function RevokeDeviceDialog({ open, onOpenChange, driver, onRevoke, submitting }: RevokeDeviceDialogProps) {
  const [deviceId, setDeviceId] = useState('');

  if (!driver) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Révoquer un appareil</DialogTitle>
        <DialogDescription>
          Chauffeur : {driver.firstName} {driver.lastName}. Cette action déconnectera immédiatement l&apos;appareil
          associé de l&apos;application mobile.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="deviceId">Identifiant de l&apos;appareil</Label>
        <Input id="deviceId" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="device-uuid" />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Annuler
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={!deviceId || submitting}
          onClick={() => onRevoke(deviceId)}
        >
          {submitting ? 'Révocation…' : 'Révoquer'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

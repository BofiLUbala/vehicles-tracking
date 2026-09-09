'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  submitting?: boolean;
}

/** Dialogue de confirmation générique pour les actions sensibles (suppression, révocation, …). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  destructive,
  onConfirm,
  submitting,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {cancelLabel}
        </Button>
        <Button type="button" variant={destructive ? 'destructive' : 'default'} disabled={submitting} onClick={onConfirm}>
          {submitting ? 'En cours…' : confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

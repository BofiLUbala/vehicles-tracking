'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Barre de filtres horizontale standardisée pour les écrans de liste (missions, véhicules, alertes…). */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4 shadow-card',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-[10rem] flex-col gap-1.5">
      <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
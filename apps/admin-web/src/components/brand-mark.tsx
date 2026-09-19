import { Radar } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Logo + nom de la plateforme. `inverted` = pour fond sombre (sidebar). */
export function BrandMark({ inverted = false, className }: { inverted?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-xl',
          inverted ? 'bg-primary text-white shadow-md shadow-primary/40' : 'bg-navy text-white',
        )}
      >
        <Radar className="h-5 w-5" />
      </div>
      <div className="flex flex-col">
        <p className={cn('text-sm font-bold leading-tight', inverted ? 'text-white' : 'text-foreground')}>
          Tracking Vehicles
        </p>
        <p className={cn('text-2xs font-medium uppercase tracking-wider', inverted ? 'text-slate-400' : 'text-muted-foreground')}>
          Fleet Control
        </p>
      </div>
    </div>
  );
}
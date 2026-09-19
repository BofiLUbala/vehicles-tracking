import type { LucideIcon } from 'lucide-react';
import { Inbox, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** État vide générique — écrans à données nulles. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-12 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

/** État d'erreur avec relance optionnelle. */
export function ErrorState({
  message = 'Impossible de charger les données.',
  onRetry,
  icon: Icon = AlertTriangle,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-12 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-foreground">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}

/** Skeleton de chargement pour cartes / lignes de table. */
export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-3 px-6 py-12 text-sm text-muted-foreground', className)}>
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <span>Chargement…</span>
    </div>
  );
}
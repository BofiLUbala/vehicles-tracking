import { cn } from '@/lib/utils';

export type ConnectionState = 'live' | 'connecting' | 'offline';

const STATE_LABELS: Record<ConnectionState, string> = {
  live: 'En direct',
  connecting: 'Reconnexion…',
  offline: 'Hors ligne',
};

const STATE_CLASSES: Record<ConnectionState, string> = {
  live: 'border-success/30 bg-success/10 text-success',
  connecting: 'border-warning/30 bg-warning/10 text-warning',
  offline: 'border-danger/30 bg-danger/10 text-danger',
};

const DOT_CLASSES: Record<ConnectionState, string> = {
  live: 'bg-success',
  connecting: 'bg-warning',
  offline: 'bg-danger',
};

/** Indicateur d'état de connexion temps réel (WebSocket). */
export function ConnectionStatus({
  state,
  className,
  label,
}: {
  state: ConnectionState;
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-2xs font-semibold',
        STATE_CLASSES[state],
        className,
      )}
    >
      <span className="relative flex h-2 w-2">
        {state === 'live' && (
          <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', DOT_CLASSES[state])} />
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', DOT_CLASSES[state])} />
      </span>
      {label ?? STATE_LABELS[state]}
    </span>
  );
}
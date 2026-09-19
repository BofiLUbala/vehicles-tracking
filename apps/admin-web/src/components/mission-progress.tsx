import { cn } from '@/lib/utils';

/** Barre de progression avec libellé (ex. « 3 / 6 étapes »). */
export function MissionProgress({
  label,
  value,
  total,
  className,
}: {
  label?: string;
  value: number;
  total: number;
  className?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {(label || total > 0) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-medium text-muted-foreground">{label}</span>}
          {total > 0 && (
            <span className="font-bold tabular-nums text-foreground">
              {value} / {total}
            </span>
          )}
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
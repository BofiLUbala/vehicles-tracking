import { STATUS_COLORS, STATUS_LABELS } from '@/features/tracking/status';
import type { VehicleTrackingStatus } from '@/features/tracking/types';

const ORDER: VehicleTrackingStatus[] = ['MOVING', 'ON_MISSION', 'STOPPED', 'OFFLINE', 'SUSPICIOUS'];

/** Répartition de la flotte par statut temps réel — barres horizontales colorées. */
export function FleetBreakdown({ counts, total }: { counts: Record<VehicleTrackingStatus, number>; total: number }) {
  return (
    <div className="flex flex-col gap-3.5">
      {ORDER.map((status) => {
        const value = counts[status];
        const pct = total > 0 ? Math.max(4, (value / total) * 100) : 0;
        return (
          <div key={status} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-2 font-medium text-foreground">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
                {STATUS_LABELS[status]}
              </span>
              <span className="font-bold tabular-nums text-foreground">{value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[status] }}
              />
            </div>
          </div>
        );
      })}
      <p className="mt-1 text-2xs text-muted-foreground">{total} véhicule(s) rapportant une position</p>
    </div>
  );
}
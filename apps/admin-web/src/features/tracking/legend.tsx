import { STATUS_COLORS, STATUS_LABELS } from '@/features/tracking/status';
import type { VehicleTrackingStatus } from '@/features/tracking/types';

const ORDER: VehicleTrackingStatus[] = ['MOVING', 'ON_MISSION', 'STOPPED', 'OFFLINE', 'SUSPICIOUS'];

export function TrackingLegend() {
  return (
    <div className="pointer-events-auto rounded-lg border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">Légende</p>
      <ul className="space-y-1">
        {ORDER.map((status) => (
          <li key={status} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
            {STATUS_LABELS[status]}
          </li>
        ))}
      </ul>
    </div>
  );
}

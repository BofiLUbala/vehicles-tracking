import { MISSION_STATUS_LABELS } from '@/features/missions/status-labels';
import { missionTone } from '@/features/dashboard/tones';
import type { StatusTone } from '@/components/status-badge';

/** Libellé + teinte pour le statut de mission renvoyé par `GET /tracking/missions/:id/trace`. */
export function useMissionStatusLabel(status: string | null): string {
  if (!status) return '—';
  const key = status as keyof typeof MISSION_STATUS_LABELS;
  return MISSION_STATUS_LABELS[key] ?? status;
}

export function missionStatusTone(status: string | null): StatusTone {
  if (!status) return 'neutral';
  return missionTone(status as Parameters<typeof missionTone>[0]);
}
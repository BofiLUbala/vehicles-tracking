import { MissionsApi } from '../api/missions.api';
import { GpsQueueRepository } from '../database/gps-queue.repository';
import type { RawTracePoint } from '../context/TrackingContext';

/**
 * Positions BRUTES d'une mission : trace serveur (autre appareil / réinstallation) + file locale
 * non encore synchronisée, dédupliquées puis triées chronologiquement. Le nettoyage (filtre de
 * Kalman, rejets) est fait ensuite par l'appelant, pour l'affichage uniquement.
 */
export async function loadMissionRawTrace(missionId: string): Promise<RawTracePoint[]> {
  const serverTrace = await MissionsApi.getMissionTrace(missionId).catch(() => null);
  const merged: RawTracePoint[] =
    serverTrace?.positions.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
      accuracy: p.accuracy,
      speed: p.speed,
      heading: p.heading,
      recordedAt: p.recordedAt,
    })) ?? [];
  const seen = new Set(merged.map((p) => `${p.latitude}|${p.longitude}|${p.recordedAt}`));
  for (const pos of GpsQueueRepository.getMissionPositions(missionId)) {
    const key = `${pos.latitude}|${pos.longitude}|${pos.recorded_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      latitude: pos.latitude,
      longitude: pos.longitude,
      accuracy: pos.accuracy,
      speed: pos.speed,
      heading: pos.heading,
      isMocked: pos.is_mocked === 1,
      recordedAt: pos.recorded_at,
    });
  }
  merged.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  return merged;
}

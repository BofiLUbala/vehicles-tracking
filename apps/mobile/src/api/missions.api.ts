import { apiClient } from './client';
import { Mission, MissionTrace } from '../types/mission.types';

export const MissionsApi = {
  async getTodayMissions(): Promise<Mission[]> {
    const response = await apiClient.get<Mission[]>('/mobile/missions/today');
    return response.data || [];
  },

  async getMissionHistory(): Promise<Mission[]> {
    const response = await apiClient.get<Mission[]>('/mobile/missions/history');
    return response.data || [];
  },

  async getMissionDetail(missionId: string): Promise<Mission> {
    const response = await apiClient.get<Mission>(`/mobile/missions/${missionId}`);
    return response.data;
  },

  async getMissionTrace(missionId: string): Promise<MissionTrace> {
    const response = await apiClient.get<MissionTrace>(`/mobile/missions/${missionId}/trace`);
    return response.data;
  },

  /**
   * Itinéraire planifié (TomTom Routing, calculé/cache côté backend). Facultatif : renvoie `[]` si
   * indisponible (hors ligne, TomTom non configuré…) — n'affecte jamais la mission ni le suivi GPS.
   */
  async getPlannedRoute(missionId: string): Promise<{ latitude: number; longitude: number }[]> {
    try {
      const response = await apiClient.get<{ points?: { latitude: number; longitude: number }[] }>(
        `/mobile/missions/${missionId}/planned-route`,
      );
      return response.data?.points ?? [];
    } catch {
      return [];
    }
  },

  async startMission(missionId: string): Promise<Mission> {
    const response = await apiClient.post<Mission>(`/missions/${missionId}/start`);
    return response.data;
  },

  async completeMission(missionId: string): Promise<Mission> {
    const response = await apiClient.post<Mission>(`/missions/${missionId}/complete`);
    return response.data;
  },
};

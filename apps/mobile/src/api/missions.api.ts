import { apiClient } from './client';
import { Mission, MissionTrace } from '../types/mission.types';

export const MissionsApi = {
  async getTodayMissions(): Promise<Mission[]> {
    const response = await apiClient.get<Mission[]>('/mobile/missions/today');
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

  async startMission(missionId: string): Promise<Mission> {
    const response = await apiClient.post<Mission>(`/missions/${missionId}/start`);
    return response.data;
  },
};

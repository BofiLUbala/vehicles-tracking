import { apiClient } from './client';
import { BatchPositionResponse, GpsPositionPayload } from '../types/tracking.types';

export const TrackingApi = {
  async sendSinglePosition(position: GpsPositionPayload): Promise<void> {
    await apiClient.post('/tracking/positions', position);
  },

  async sendPositionsBatch(positions: GpsPositionPayload[]): Promise<BatchPositionResponse> {
    const response = await apiClient.post<BatchPositionResponse>('/tracking/positions/batch', {
      positions,
    });
    return response.data || [];
  },
};

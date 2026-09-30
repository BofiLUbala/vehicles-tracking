import { apiClient } from './client';
import { BatchPositionResponse, GpsPositionPayload } from '../types/tracking.types';

/**
 * L'application manipule la vitesse en m/s (unité d'expo-location, utilisée par le filtre GPS et
 * l'analyse de trajet) ; l'API l'attend en km/h (seuil « en mouvement », affichage admin). La
 * conversion se fait ici, à la frontière, et nulle part ailleurs. Une vitesse négative signale une
 * mesure indisponible (iOS) : elle est envoyée comme absente.
 */
export function toApiPosition(position: GpsPositionPayload): GpsPositionPayload {
  const { speed } = position;
  return {
    ...position,
    speed: speed != null && Number.isFinite(speed) && speed >= 0 ? Math.round(speed * 3.6 * 10) / 10 : null,
  };
}

export const TrackingApi = {
  async sendSinglePosition(position: GpsPositionPayload): Promise<void> {
    await apiClient.post('/tracking/positions', toApiPosition(position));
  },

  async sendPositionsBatch(positions: GpsPositionPayload[]): Promise<BatchPositionResponse> {
    const response = await apiClient.post<BatchPositionResponse>('/tracking/positions/batch', {
      positions: positions.map(toApiPosition),
    });
    return response.data || [];
  },
};

import { useEffect, useRef } from 'react';
import { WebSocketService } from '../services/websocket.service';

interface UseMissionRealtimeOptions {
  missionId?: string | null;
  vehicleId?: string | null;
  /** Rechargée à chaque événement de cycle de vie de la mission (étape validée, démarrée, terminée). */
  onMissionEvent?: () => void;
}

const MISSION_EVENTS = ['mission.started', 'mission.completed', 'mission.step.validated'];

/**
 * Abonne l'écran courant aux rooms temps réel de sa mission/véhicule et déclenche `onMissionEvent`
 * sur les événements de cycle de vie. Le rappel est stocké dans une ref pour ne pas résouscrire à
 * chaque rendu (le handler passé change souvent d'identité).
 */
export function useMissionRealtime({ missionId, vehicleId, onMissionEvent }: UseMissionRealtimeOptions): void {
  const callbackRef = useRef(onMissionEvent);

  useEffect(() => {
    callbackRef.current = onMissionEvent;
  }, [onMissionEvent]);

  useEffect(() => {
    if (!missionId && !vehicleId) return;

    const missionRoom = missionId ? `mission:${missionId}` : null;
    const vehicleRoom = vehicleId ? `vehicle:${vehicleId}` : null;

    if (missionRoom) WebSocketService.subscribeToRoom(missionRoom);
    if (vehicleRoom) WebSocketService.subscribeToRoom(vehicleRoom);

    const handleEvent = () => {
      callbackRef.current?.();
    };

    const unsubscribers = MISSION_EVENTS.map((event) => WebSocketService.on(event, handleEvent));

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      if (missionRoom) WebSocketService.unsubscribeFromRoom(missionRoom);
      if (vehicleRoom) WebSocketService.unsubscribeFromRoom(vehicleRoom);
    };
  }, [missionId, vehicleId]);
}
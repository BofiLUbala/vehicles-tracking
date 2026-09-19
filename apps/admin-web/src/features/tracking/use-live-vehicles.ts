'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { decodeJwt } from 'jose';
import type { Socket } from 'socket.io-client';
import { fetchAccessToken } from '@/lib/api-client';
import { fetchLiveVehicles } from '@/features/tracking/api';
import { connectTrackingSocket } from '@/features/tracking/socket';
import { applyOfflineUpdate, applyPositionUpdate, applyStatusUpdate } from '@/features/tracking/live-vehicles-reducer';
import type {
  LiveVehicle,
  VehicleOfflineEvent,
  VehiclePositionUpdatedEvent,
  VehicleStatusUpdatedEvent,
} from '@/features/tracking/types';

interface OrgClaims {
  organizationId?: string;
}

export interface UseLiveVehiclesResult {
  vehicles: LiveVehicle[];
  isLoading: boolean;
  isError: boolean;
  connected: boolean;
  socket: Socket | null;
}

/**
 * Charge le seed initial (`GET /tracking/vehicles/live`) via React Query puis applique les mises
 * à jour incrémentales reçues sur `vehicle.position.updated` en local (pas de refetch). Expose
 * aussi l'état de connexion WebSocket pour l'indicateur "déconnecté" de l'écran, et le socket
 * pour permettre l'abonnement à des rooms spécifiques (mission, vehicle).
 */
export function useLiveVehicles(): UseLiveVehiclesResult {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['tracking', 'vehicles', 'live'],
    queryFn: fetchLiveVehicles,
  });

  const [vehicles, setVehicles] = useState<LiveVehicle[]>([]);
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (data) setVehicles(data);
  }, [data]);

  const handlePositionUpdate = useCallback((event: VehiclePositionUpdatedEvent) => {
    setVehicles((prev) => applyPositionUpdate(prev, event));
  }, []);

  const handleStatusUpdate = useCallback((event: VehicleStatusUpdatedEvent) => {
    setVehicles((prev) => applyStatusUpdate(prev, event));
  }, []);

  const handleOffline = useCallback((event: VehicleOfflineEvent) => {
    setVehicles((prev) => applyOfflineUpdate(prev, event.vehicleId));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      const token = await fetchAccessToken();
      if (!token || cancelled) return;
      const claims = decodeJwt(token) as OrgClaims;
      if (!claims.organizationId) return;

      const socket = connectTrackingSocket(token, claims.organizationId);
      socketRef.current = socket;
      if (!cancelled) setSocket(socket);

      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
      socket.on('connect_error', () => setConnected(false));
      socket.on('vehicle.position.updated', handlePositionUpdate);
      socket.on('vehicle.status.updated', handleStatusUpdate);
      socket.on('vehicle.offline', handleOffline);
    }

    setup();

    return () => {
      cancelled = true;
      socketRef.current?.off('vehicle.position.updated', handlePositionUpdate);
      socketRef.current?.off('vehicle.status.updated', handleStatusUpdate);
      socketRef.current?.off('vehicle.offline', handleOffline);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [handlePositionUpdate, handleStatusUpdate, handleOffline]);

  return { vehicles, isLoading, isError, connected, socket };
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { decodeJwt } from 'jose';
import type { Socket } from 'socket.io-client';
import { fetchAccessToken } from '@/lib/api-client';
import { fetchAlerts, updateAlertStatus } from '@/features/alerts/api';
import { connectTrackingSocket } from '@/features/tracking/socket';
import { applyAlertCreated } from '@/features/alerts/alerts-reducer';
import type { AlertCreatedEvent, AlertDto, AlertFilters, AlertStatus } from '@/features/alerts/types';

interface OrgClaims {
  organizationId?: string;
}

export interface UseAlertsResult {
  alerts: AlertDto[];
  isLoading: boolean;
  isError: boolean;
  connected: boolean;
  transition: (alertId: string, status: AlertStatus) => void;
  isTransitioning: boolean;
}

export const ALERTS_QUERY_KEY = ['alerts', 'list'] as const;

/**
 * Charge la liste filtrée (`GET /alerts`) via React Query, applique en local les alertes reçues
 * en direct sur `alert.created` (namespace `/tracking`, voir PHASE3_NOTES.md — même passerelle que
 * la carte temps réel, connexion dédiée à cette page), et expose une mutation de transition de
 * statut avec mise à jour optimiste + invalidation.
 */
export function useAlerts(filters: AlertFilters): UseAlertsResult {
  const queryClient = useQueryClient();
  const queryKey = [...ALERTS_QUERY_KEY, filters] as const;

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => fetchAlerts(filters),
  });

  const [liveAlerts, setLiveAlerts] = useState<AlertDto[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (data) setLiveAlerts(data);
  }, [data]);

  const handleAlertCreated = useCallback((event: AlertCreatedEvent) => {
    setLiveAlerts((prev) => applyAlertCreated(prev, event));
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

      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
      socket.on('connect_error', () => setConnected(false));
      socket.on('alert.created', handleAlertCreated);
    }

    setup();

    return () => {
      cancelled = true;
      socketRef.current?.off('alert.created', handleAlertCreated);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [handleAlertCreated]);

  // Snapshot pré-mutation pour permettre un rollback si le PATCH échoue. On ne peut pas s'appuyer
  // sur `onMutate` de React Query pour l'update optimiste elle-même : `mutate()` déclenche
  // `onMutate` de façon asynchrone (microtask), donc l'UI ne refléterait pas encore le nouveau
  // statut juste après l'appel à `transition()`. On applique donc la mise à jour optimiste ici,
  // de façon strictement synchrone, et on garde `onMutate` uniquement pour capturer l'état
  // précédent en vue d'un rollback.
  const previousAlertsRef = useRef<AlertDto[]>([]);

  const mutation = useMutation({
    mutationFn: ({ alertId, status }: { alertId: string; status: AlertStatus }) =>
      updateAlertStatus(alertId, status),
    onError: () => {
      setLiveAlerts(previousAlertsRef.current);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY });
    },
  });

  const transition = useCallback(
    (alertId: string, status: AlertStatus) => {
      setLiveAlerts((prev) => {
        previousAlertsRef.current = prev;
        return prev.map((a) => (a.id === alertId ? { ...a, status } : a));
      });
      mutation.mutate({ alertId, status });
    },
    [mutation],
  );

  return {
    alerts: liveAlerts,
    isLoading,
    isError,
    connected,
    transition,
    isTransitioning: mutation.isPending,
  };
}

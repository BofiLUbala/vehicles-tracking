import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ScanLine, CheckCircle2, Navigation2 } from 'lucide-react-native';
import { MissionsApi } from '../../../../src/api/missions.api';
import { useTracking } from '../../../../src/context/TrackingContext';
import { useSync } from '../../../../src/context/SyncContext';
import { useMissionRealtime } from '../../../../src/hooks/useMissionRealtime';
import { TrackingService } from '../../../../src/services/tracking.service';
import { GpsQueueRepository } from '../../../../src/database/gps-queue.repository';
import { Mission } from '../../../../src/types/mission.types';
import { MissionMap, MissionStop } from '../../../../src/components/MissionMap';
import { MissionStepCard } from '../../../../src/components/MissionStepCard';
import { GpsStatusPill } from '../../../../src/components/GpsStatusPill';
import { SyncStatusPill } from '../../../../src/components/SyncStatusPill';
import { BigButton } from '../../../../src/components/BigButton';
import { LoadingView } from '../../../../src/components/LoadingView';
import { ErrorView } from '../../../../src/components/ErrorView';
import { AppRadius, AppShadow, AppTheme } from '../../../../src/theme/colors';

const ACTION_LABELS: Record<string, string> = {
  COLLECT: 'Collecte de déchets',
  DROPOFF: 'Dépôt au centre de traitement',
  WEIGH: 'Pesée du camion',
  REFUEL: 'Ravitaillement',
  CHECKPOINT: 'Point de contrôle',
};

export default function MissionProgressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [mission, setMission] = useState<Mission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isTracking, startTracking, currentGps, trace, appendTracePoint, setTraceFromServer } = useTracking();
  const { isConnected, isSyncing, counts } = useSync();
  const router = useRouter();
  const listenerRef = useRef<(() => void) | null>(null);

  const loadMission = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await MissionsApi.getMissionDetail(id);
      setMission(data);
      if (data.status === 'STARTED' || data.status === 'IN_PROGRESS') {
        await startTracking(data.vehicleId, data.id);

        // Restaure le trajet : positions serveur (autre appareil / réinstallation) + file locale
        // non encore synchronisée, dédupliquées puis ordonnées chronologiquement.
        const serverTrace = await MissionsApi.getMissionTrace(data.id).catch(() => null);
        const merged: { latitude: number; longitude: number; recordedAt: string }[] =
          serverTrace?.positions.map((p) => ({
            latitude: p.latitude,
            longitude: p.longitude,
            recordedAt: p.recordedAt,
          })) ?? [];
        const seen = new Set(merged.map((p) => `${p.latitude}|${p.longitude}|${p.recordedAt}`));
        for (const pos of GpsQueueRepository.getMissionPositions(data.id)) {
          const key = `${pos.latitude}|${pos.longitude}|${pos.recorded_at}`;
          if (seen.has(key)) continue;
          seen.add(key);
          merged.push({ latitude: pos.latitude, longitude: pos.longitude, recordedAt: pos.recorded_at });
        }
        merged.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
        setTraceFromServer(merged);
      }
    } catch {
      setError('Impossible d’actualiser la progression.');
    } finally {
      setIsLoading(false);
    }
  }, [id, startTracking, setTraceFromServer]);

  // Rafraîchissement léger (sans redémarrer le suivi) déclenché par les événements temps réel.
  const refreshMission = useCallback(async () => {
    if (!id) return;
    try {
      const data = await MissionsApi.getMissionDetail(id);
      setMission(data);
    } catch {
      // Événement temps réel : en cas d'échec réseau on garde l'état affiché.
    }
  }, [id]);

  useMissionRealtime({
    missionId: mission?.id ?? id ?? null,
    vehicleId: mission?.vehicleId ?? null,
    onMissionEvent: refreshMission,
  });

  useEffect(() => {
    loadMission();
  }, [loadMission]);

  useEffect(() => {
    if (isTracking) {
      listenerRef.current = TrackingService.addPositionListener((position) => {
        appendTracePoint({
          latitude: position.latitude,
          longitude: position.longitude,
          timestamp: position.timestamp,
        });
      });
    }
    return () => {
      listenerRef.current?.();
      listenerRef.current = null;
    };
  }, [isTracking, appendTracePoint]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingView message="Chargement de la mission…" />
      </SafeAreaView>
    );
  }

  if (error || !mission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorView message={error || 'Mission introuvable.'} onRetry={loadMission} />
      </SafeAreaView>
    );
  }

  const sortedSteps = [...mission.steps].sort((a, b) => a.order - b.order);
  const currentStepIndex = sortedSteps.findIndex((s) => s.status !== 'VALIDATED');
  const isAllCompleted = currentStepIndex === -1;
  const currentStep = isAllCompleted ? null : sortedSteps[currentStepIndex];

  const mapStops: MissionStop[] = sortedSteps.map((step) => ({
    id: step.id,
    name: step.location.name,
    latitude: step.location.latitude,
    longitude: step.location.longitude,
    order: step.order,
    status: step.status === 'VALIDATED' ? 'VALIDATED' : 'PENDING',
    actionType: step.actionType,
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Retour aux missions"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <ArrowLeft size={20} color={AppTheme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Mission en cours</Text>
          {mission.vehiclePlateNumber && (
            <Text style={styles.headerSub}>{mission.vehiclePlateNumber}</Text>
          )}
        </View>
        <GpsStatusPill isTracking={isTracking} traceCount={trace.length} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isTracking && (
          <MissionMap
            currentGps={currentGps}
            trace={trace}
            stops={mapStops}
            currentStepIndex={currentStepIndex >= 0 ? currentStepIndex : sortedSteps.length}
          />
        )}

        {!isTracking && (
          <View style={styles.trackingCard}>
            <Navigation2 size={18} color={AppTheme.textMuted} />
            <View style={styles.trackingInfo}>
              <Text style={styles.trackingTitle}>Positionnement standard</Text>
              <Text style={styles.trackingSubtitle}>
                Le suivi par point sera actif au démarrage de la mission.
              </Text>
            </View>
          </View>
        )}

        {currentStep && (
          <View style={styles.currentStepCard}>
            <View style={styles.currentStepBadge}>
              <Text style={styles.currentStepBadgeText}>
                ÉTAPE {currentStepIndex + 1} / {sortedSteps.length}
              </Text>
            </View>

            <Text style={styles.currentStepAction}>
              {ACTION_LABELS[currentStep.actionType] ?? currentStep.actionType}
            </Text>
            <Text style={styles.currentStepLocationName}>{currentStep.location.name}</Text>
            {currentStep.location.address && (
              <Text style={styles.currentStepAddress}>{currentStep.location.address}</Text>
            )}

            <View style={styles.radiusPill}>
              <Text style={styles.radiusText}>
                Rayon de validation autorisé : {currentStep.location.allowedRadius} m
              </Text>
            </View>

            <BigButton
              label="Scanner le QR code du site"
              icon={<ScanLine size={20} color="#FFFFFF" />}
              onPressed={() =>
                router.push(`/(main)/missions/${mission.id}/steps/${currentStep.id}/scan`)
              }
            />
          </View>
        )}

        {isAllCompleted && (
          <View style={styles.completedBox}>
            <View style={styles.completedIconWrap}>
              <CheckCircle2 size={40} color={AppTheme.success} />
            </View>
            <Text style={styles.completedTitle}>Étapes toutes validées !</Text>
            <Text style={styles.completedSubtitle}>
              Vous avez terminé l&apos;ensemble du parcours prévu pour cette mission.
            </Text>
            <BigButton
              label="Retour aux missions du jour"
              variant="secondary"
              onPressed={() => router.replace('/(main)/missions')}
              style={styles.completedButton}
            />
          </View>
        )}

        <View style={styles.syncRow}>
          <Text style={styles.timelineTitle}>Parcours de la mission</Text>
          <SyncStatusPill
            state={isSyncing ? 'syncing' : !isConnected ? 'offline' : counts.total > 0 ? 'pending' : 'online'}
            pendingCount={counts.total}
          />
        </View>

        {sortedSteps.map((step, index) => (
          <MissionStepCard key={step.id} step={step} index={index} isCurrent={index === currentStepIndex} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: AppTheme.card,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: AppRadius.md,
    backgroundColor: AppTheme.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: AppTheme.text,
  },
  headerSub: {
    fontSize: 12,
    color: AppTheme.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  trackingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.card,
    padding: 14,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    borderColor: AppTheme.border,
    marginBottom: 16,
  },
  trackingInfo: {
    flex: 1,
    marginLeft: 10,
  },
  trackingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: AppTheme.text,
  },
  trackingSubtitle: {
    fontSize: 12,
    color: AppTheme.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  currentStepCard: {
    backgroundColor: AppTheme.card,
    borderRadius: AppRadius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: AppTheme.tracking,
    ...AppShadow.pop,
    marginBottom: 20,
  },
  currentStepBadge: {
    backgroundColor: AppTheme.trackingLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: AppRadius.pill,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  currentStepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: AppTheme.tracking,
    letterSpacing: 0.6,
  },
  currentStepAction: {
    fontSize: 13,
    fontWeight: '700',
    color: AppTheme.primary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  currentStepLocationName: {
    fontSize: 22,
    fontWeight: '900',
    color: AppTheme.text,
    marginBottom: 4,
  },
  currentStepAddress: {
    fontSize: 14,
    color: AppTheme.textSecondary,
    marginBottom: 14,
  },
  radiusPill: {
    backgroundColor: AppTheme.subtle,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AppRadius.pill,
    alignSelf: 'flex-start',
    marginBottom: 18,
  },
  radiusText: {
    fontSize: 12,
    color: AppTheme.textSecondary,
    fontWeight: '600',
  },
  completedBox: {
    backgroundColor: AppTheme.successLight,
    borderRadius: AppRadius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: `${AppTheme.success}40`,
    alignItems: 'center',
    marginBottom: 20,
  },
  completedIconWrap: {
    marginBottom: 12,
  },
  completedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: AppTheme.success,
    marginBottom: 6,
    textAlign: 'center',
  },
  completedSubtitle: {
    fontSize: 14,
    color: AppTheme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  completedButton: {
    width: '100%',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: AppTheme.text,
  },
});
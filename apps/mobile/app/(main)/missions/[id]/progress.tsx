import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ScanLine, CheckCircle2, ClipboardList, MapPin, RefreshCw, ChevronDown, ChevronUp, Flag, ChartLine } from 'lucide-react-native';
import { MissionsApi } from '../../../../src/api/missions.api';
import { useTracking } from '../../../../src/context/TrackingContext';
import { loadMissionRawTrace } from '../../../../src/services/mission-trace';
import { useSync } from '../../../../src/context/SyncContext';
import { useMissionRealtime } from '../../../../src/hooks/useMissionRealtime';
import { Mission } from '../../../../src/types/mission.types';
import { MissionMap, MissionStop } from '../../../../src/components/MissionMap';
import { MissionStepCard } from '../../../../src/components/MissionStepCard';
import { BigButton } from '../../../../src/components/BigButton';
import { LoadingView } from '../../../../src/components/LoadingView';
import { ErrorView } from '../../../../src/components/ErrorView';
import { TripStatsCard } from '../../../../src/components/TripStatsCard';
import { SpeedLegend } from '../../../../src/components/SpeedLegend';
import { useTripAnalysis } from '../../../../src/hooks/useTripAnalysis';
import { gpsQualityPercent } from '../../../../src/geo/gps-filter';
import { AppRadius, AppTheme } from '../../../../src/theme/colors';

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
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [plannedRoute, setPlannedRoute] = useState<{ latitude: number; longitude: number }[]>([]);
  const { height: screenHeight } = useWindowDimensions();
  const { isTracking, startTracking, stopTracking, currentGps, trace, gpsStats, setTraceFromServer } = useTracking();
  const trip = useTripAnalysis(trace);
  const { isConnected, isSyncing, counts } = useSync();
  const router = useRouter();

  // Itinéraire planifié : un seul appel par mission (jamais par point GPS), en arrière-plan.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    MissionsApi.getPlannedRoute(id).then((points) => { if (!cancelled) setPlannedRoute(points); });
    return () => { cancelled = true; };
  }, [id]);

  const loadMission = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await MissionsApi.getMissionDetail(id);
      setMission(data);
      if (data.status === 'STARTED' || data.status === 'IN_PROGRESS') {
        await startTracking(data.vehicleId, data.id);

        // Restaure le trajet : positions serveur + file locale non synchronisée (nettoyées ensuite).
        setTraceFromServer(await loadMissionRawTrace(data.id));
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
  const completedCount = sortedSteps.filter((step) => step.status === 'VALIDATED').length;
  const syncLabel = !isConnected ? 'Hors ligne' : isSyncing ? 'Synchronisation…' : counts.total > 0 ? `${counts.total} en attente` : 'À jour';
  const missionActive = mission.status === 'STARTED' || mission.status === 'IN_PROGRESS';

  const mapStops: MissionStop[] = sortedSteps.map((step) => ({
    id: step.id,
    name: step.location.name,
    latitude: step.location.latitude,
    longitude: step.location.longitude,
    order: step.order,
    status: step.status === 'VALIDATED' ? 'VALIDATED' : 'PENDING',
    actionType: step.actionType,
  }));

  const completeMission = async () => {
    setIsCompleting(true);
    setCompletionError(null);
    try {
      await MissionsApi.completeMission(mission.id);
      await stopTracking();
      router.replace('/(main)/history');
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setCompletionError(typeof message === 'string' ? message : 'Impossible de terminer la mission. Réessayez.');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Retour aux missions"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <ArrowLeft size={21} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Ma mission</Text>
          <Text style={styles.headerSub}>{mission.vehiclePlateNumber || `#${mission.id.slice(0, 8).toUpperCase()}`}</Text>
        </View>
        <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>{missionActive ? 'En direct' : 'Mission'}</Text></View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <MissionMap
          height={Math.max(260, Math.min(screenHeight * 0.4, 380))}
          currentGps={currentGps}
          trace={trace}
          stops={mapStops}
          plannedRoute={plannedRoute}
          traceSegments={trip.mapSegments}
          pauses={trip.mapPauses}
          overlay={trace.length > 1 ? <SpeedLegend /> : undefined}
          currentStepIndex={currentStepIndex >= 0 ? currentStepIndex : sortedSteps.length}
          onSettingsPress={() => router.push('/(main)/permissions/gps')}
        />

        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.titleRow}>
            <View style={styles.titleIcon}><ClipboardList size={22} color="#FFFFFF" /></View>
            <View style={styles.titleText}>
              <Text style={styles.sheetTitle}>Mission active</Text>
              <Text style={styles.missionCode}>#{mission.id.slice(0, 8).toUpperCase()} · {mission.vehiclePlateNumber || 'Véhicule assigné'}</Text>
              <Text style={styles.missionMeta}>{completedCount} / {sortedSteps.length} étapes terminées</Text>
            </View>
          </View>

          {currentStep ? (
            <View style={styles.stepHighlight}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{currentStep.order}</Text></View>
              <View style={styles.stepText}>
                <Text style={styles.eyebrow}>ÉTAPE ACTUELLE · {ACTION_LABELS[currentStep.actionType] ?? currentStep.actionType}</Text>
                <Text style={styles.stepName} numberOfLines={1}>{currentStep.location.name}</Text>
                <Text style={styles.stepAddress} numberOfLines={1}>{currentStep.location.address || `Rayon autorisé : ${currentStep.location.allowedRadius} m`}</Text>
              </View>
              <MapPin size={18} color={AppTheme.warning} />
            </View>
          ) : (
            <View style={styles.stepHighlight}><CheckCircle2 size={25} color={AppTheme.success} /><Text style={[styles.stepName, { marginLeft: 12 }]}>Toutes les étapes sont validées</Text></View>
          )}

          {trace.length > 1 && <TripStatsCard compact stats={trip.stats} stopsCount={trip.stops.length} />}

          <View style={styles.infoRow}>
            <MapPin size={20} color={isTracking ? AppTheme.success : AppTheme.textMuted} />
            <View style={styles.infoText}><Text style={styles.infoTitle}>GPS {isTracking ? 'actif' : 'inactif'}</Text><Text style={styles.infoSubtitle}>{isTracking ? 'Position transmise' : 'Localisation indisponible'}</Text></View>
            {currentGps?.accuracy != null && <Text style={styles.infoRight}>± {Math.round(currentGps.accuracy)} m · {gpsQualityPercent(gpsStats)} % exploitables</Text>}
          </View>
          <View style={styles.infoRow}>
            <RefreshCw size={20} color={isConnected ? AppTheme.tracking : AppTheme.textMuted} />
            <View style={styles.infoText}><Text style={styles.infoTitle}>Synchronisation</Text><Text style={styles.infoSubtitle}>{isConnected ? 'Données de la mission connectées' : 'Envoi dès le retour du réseau'}</Text></View>
            <Text style={[styles.syncBadge, !isConnected && styles.syncOffline]}>{syncLabel}</Text>
          </View>

          {currentStep ? (
            <BigButton label="Scanner le QR code du site" icon={<ScanLine size={20} color="#FFFFFF" />} onPressed={() => router.push(`/(main)/missions/${mission.id}/steps/${currentStep.id}/scan`)} style={styles.primaryAction} />
          ) : (
            <BigButton label="Terminer la mission" icon={<Flag size={20} color="#FFFFFF" />} isLoading={isCompleting} onPressed={completeMission} style={styles.finishAction} />
          )}
          {completionError && <Text style={styles.completionError}>{completionError}</Text>}
          <TouchableOpacity onPress={() => router.push(`/(main)/missions/${mission.id}/trip`)} style={styles.stepsToggle} accessibilityRole="button" accessibilityLabel="Analyser le trajet">
            <ChartLine size={18} color={AppTheme.tracking} />
            <Text style={[styles.stepsToggleText, { marginLeft: 6 }]}>Analyser le trajet (vitesse, arrêts, rejeu)</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSteps((value) => !value)} style={styles.stepsToggle} accessibilityRole="button" accessibilityLabel={showSteps ? 'Masquer les étapes' : 'Voir toutes les étapes'}>
            <Text style={styles.stepsToggleText}>{showSteps ? 'Masquer les étapes' : 'Voir toutes les étapes'}</Text>
            {showSteps ? <ChevronUp size={18} color={AppTheme.tracking} /> : <ChevronDown size={18} color={AppTheme.tracking} />}
          </TouchableOpacity>
          {showSteps && sortedSteps.map((step, index) => <MissionStepCard key={step.id} step={step} index={index} isCurrent={index === currentStepIndex} />)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppTheme.navyLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 13,
    backgroundColor: AppTheme.navyLight,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: AppRadius.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
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
    color: '#FFFFFF',
  },
  headerSub: {
    fontSize: 12,
    color: '#BFD4F0',
    fontWeight: '600',
    marginTop: 1,
  },
  content: {
    backgroundColor: AppTheme.background,
    paddingBottom: 30,
  },
  livePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#087A4A', paddingHorizontal: 11, paddingVertical: 6, borderRadius: AppRadius.pill },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#63E6A2', marginRight: 6 },
  liveText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -22, paddingHorizontal: 17, paddingTop: 8, paddingBottom: 22, shadowColor: '#0B1F33', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.12, shadowRadius: 14, elevation: 9 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#D6DEE9', alignSelf: 'center', marginBottom: 15 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  titleIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: AppTheme.tracking, justifyContent: 'center', alignItems: 'center', marginRight: 11 },
  titleText: { flex: 1 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: AppTheme.navy },
  missionCode: { fontSize: 13, fontWeight: '700', color: AppTheme.navyLight, marginTop: 2 },
  missionMeta: { fontSize: 12, color: AppTheme.textSecondary, marginTop: 2 },
  stepHighlight: { minHeight: 69, backgroundColor: '#F3F6FB', borderRadius: 12, padding: 11, flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  stepNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: AppTheme.warning, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  stepNumberText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  stepText: { flex: 1, minWidth: 0 },
  eyebrow: { color: AppTheme.tracking, fontSize: 10, fontWeight: '800', marginBottom: 2 },
  stepName: { color: AppTheme.navy, fontSize: 14, fontWeight: '800' },
  stepAddress: { color: AppTheme.textSecondary, fontSize: 11, marginTop: 2 },
  infoRow: { minHeight: 52, borderBottomWidth: 1, borderBottomColor: AppTheme.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  infoText: { flex: 1, marginLeft: 11 },
  infoTitle: { fontSize: 13, color: AppTheme.navy, fontWeight: '800' },
  infoSubtitle: { fontSize: 11, color: AppTheme.textSecondary, marginTop: 1 },
  infoRight: { color: AppTheme.textSecondary, fontSize: 11, fontWeight: '700' },
  syncBadge: { color: '#087A4A', backgroundColor: '#DBF6E8', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, fontSize: 11, fontWeight: '800', overflow: 'hidden' },
  syncOffline: { color: AppTheme.textSecondary, backgroundColor: AppTheme.subtle },
  primaryAction: { marginTop: 14, backgroundColor: AppTheme.tracking },
  finishAction: { marginTop: 14, backgroundColor: AppTheme.danger },
  completionError: { color: AppTheme.danger, marginTop: 10, fontSize: 12 },
  stepsToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15 },
  stepsToggleText: { color: AppTheme.tracking, fontSize: 13, fontWeight: '700', marginRight: 5 },
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

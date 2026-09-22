'use client';
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Navigation2,
  Satellite,
  WifiOff,
  Wifi,
  CheckCircle2,
  RefreshCw,
  Clock,
  Truck,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useTracking } from '../../src/context/TrackingContext';
import { useSync } from '../../src/context/SyncContext';
import { WebSocketService } from '../../src/services/websocket.service';
import { MissionsApi } from '../../src/api/missions.api';
import { MissionsCacheRepository } from '../../src/database/missions-cache.repository';
import { Mission } from '../../src/types/mission.types';
import { StatusBadge } from '../../src/components/StatusBadge';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import { LoadingView } from '../../src/components/LoadingView';
import { AppRadius, AppShadow, AppSpacing, AppTheme } from '../../src/theme/colors';

const ACTION_LABELS: Record<string, string> = {
  COLLECT: 'Collecte',
  DROPOFF: 'Dépôt',
  WEIGH: 'Pesée',
  REFUEL: 'Ravitaillement',
  CHECKPOINT: 'Point de contrôle',
};

function GpsIndicator({ isTracking, accuracy }: { isTracking: boolean; accuracy?: number | null }) {
  const label = isTracking ? 'GPS actif' : 'GPS inactif';
  const color = isTracking ? AppTheme.success : AppTheme.textMuted;
  const bg = isTracking ? AppTheme.successLight : AppTheme.subtle;
  return (
    <View style={[styles.indicator, { backgroundColor: bg }]}>
      <Satellite size={13} color={color} />
      <Text style={[styles.indicatorText, { color }]}>{label}</Text>
      {isTracking && accuracy != null && (
        <Text style={styles.indicatorMeta}>±{Math.round(accuracy)} m</Text>
      )}
    </View>
  );
}

function NetworkIndicator({ isConnected }: { isConnected: boolean }) {
  const label = isConnected ? 'En ligne' : 'Hors ligne';
  const color = isConnected ? AppTheme.primary : AppTheme.danger;
  const bg = isConnected ? AppTheme.primaryLight : AppTheme.dangerLight;
  const Icon = isConnected ? Wifi : WifiOff;
  return (
    <View style={[styles.indicator, { backgroundColor: bg }]}>
      <Icon size={13} color={color} />
      <Text style={[styles.indicatorText, { color }]}>{label}</Text>
    </View>
  );
}

function SyncIndicator({ isSyncing, pending }: { isSyncing: boolean; pending: number }) {
  let label: string;
  let color: string;
  let bg: string;
  let Icon: React.ComponentType<{ size: number; color: string }>;

  if (isSyncing) {
    label = 'Synchro…';
    color = AppTheme.info;
    bg = AppTheme.infoLight;
    Icon = RefreshCw;
  } else if (pending > 0) {
    label = `${pending} en attente`;
    color = AppTheme.warning;
    bg = AppTheme.warningLight;
    Icon = Clock;
  } else {
    label = 'À jour';
    color = AppTheme.success;
    bg = AppTheme.successLight;
    Icon = CheckCircle2;
  }

  return (
    <View style={[styles.indicator, { backgroundColor: bg }]}>
      <Icon size={13} color={color} />
      <Text style={[styles.indicatorText, { color }]}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { driver } = useAuth();
  const { isTracking, currentGps, activeMissionId } = useTracking();
  const { isConnected, isSyncing, counts } = useSync();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const loadMissions = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const data = await MissionsApi.getTodayMissions();
      setMissions(data);
      MissionsCacheRepository.save(data);
    } catch {
      const cached = MissionsCacheRepository.get();
      if (cached && cached.length > 0) setMissions(cached);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  useFocusEffect(
    useCallback(() => {
      loadMissions(false);
    }, [loadMissions]),
  );

  // Realtime: mission assigned/updated
  useEffect(() => {
    if (!driver?.id) return;
    const driverId = driver.id;
    const unsub = WebSocketService.on('mission.assigned', (payload) => {
      if (payload?.driverId === driverId) loadMissions(false);
    });
    const unsubReconnect = WebSocketService.on('connect', () => loadMissions(false));
    return () => { unsub(); unsubReconnect(); };
  }, [driver?.id, loadMissions]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadMissions(false);
  };

  // Determine active/assigned missions
  const activeMission = missions.find(
    (m) => m.status === 'STARTED' || m.status === 'IN_PROGRESS',
  );
  const assignedMission = missions.find((m) => m.status === 'ASSIGNED' || m.status === 'PLANNED');
  const primaryMission = activeMission ?? assignedMission ?? null;

  const otherMissions = missions.filter((m) => m.id !== primaryMission?.id && m.status !== 'COMPLETED');

  const firstName = driver?.firstName ?? 'Chauffeur';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[AppTheme.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingSmall}>Bonjour,</Text>
            <Text style={styles.greetingName}>{firstName}</Text>
          </View>
          {driver?.currentVehiclePlate && (
            <View style={styles.vehiclePill}>
              <Truck size={13} color={AppTheme.primary} />
              <Text style={styles.vehiclePillText}>{driver.currentVehiclePlate}</Text>
            </View>
          )}
        </View>

        {/* Operational status strip */}
        <View style={styles.statusStrip}>
          <GpsIndicator isTracking={isTracking} accuracy={currentGps?.accuracy} />
          <NetworkIndicator isConnected={isConnected} />
          <SyncIndicator isSyncing={isSyncing} pending={counts.total} />
        </View>

        {/* Offline banner */}
        {!isConnected && (
          <View style={styles.offlineBannerWrap}>
            <OfflineBanner pendingCount={counts.total} />
          </View>
        )}

        {/* Active tracking banner */}
        {isTracking && activeMission && (
          <View style={styles.trackingBanner}>
            <Navigation2 size={14} color={AppTheme.tracking} />
            <Text style={styles.trackingBannerText}>Suivi GPS en direct · Mission en cours</Text>
            <View style={styles.liveDot} />
          </View>
        )}

        {/* Primary mission card */}
        {isLoading ? (
          <LoadingView message="Chargement de vos missions…" />
        ) : primaryMission ? (
          <PrimaryMissionCard mission={primaryMission} />
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Truck size={26} color={AppTheme.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Aucune mission active</Text>
            <Text style={styles.emptySubtitle}>
              Vous n'avez aucune mission assignée pour le moment.
            </Text>
          </View>
        )}

        {/* Other missions today */}
        {otherMissions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Autres missions du jour</Text>
            {otherMissions.slice(0, 3).map((m) => (
              <OtherMissionRow key={m.id} mission={m} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function PrimaryMissionCard({ mission }: { mission: Mission }) {
  const router = useRouter();
  const { isTracking } = useTracking();
  const isActive = mission.status === 'STARTED' || mission.status === 'IN_PROGRESS';
  const isAssigned = mission.status === 'ASSIGNED' || mission.status === 'PLANNED';

  const completed = mission.steps.filter((s) => s.status === 'VALIDATED').length;
  const total = mission.steps.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const nextStep = mission.steps
    .sort((a, b) => a.order - b.order)
    .find((s) => s.status !== 'VALIDATED');

  const actionLabel = isActive
    ? 'Continuer la mission'
    : isAssigned
    ? 'Démarrer la mission'
    : 'Voir la mission';

  const handlePress = () => {
    if (isActive) {
      router.push(`/(main)/missions/${mission.id}/progress` as any);
    } else {
      router.push(`/(main)/missions/${mission.id}` as any);
    }
  };

  return (
    <View style={[styles.primaryCard, isActive && styles.primaryCardActive]}>
      {/* Card header */}
      <View style={styles.primaryCardHeader}>
        <View style={styles.primaryCardTitleRow}>
          <Text style={styles.primaryCardLabel}>
            {isActive ? 'Mission active' : 'Mission assignée'}
          </Text>
          {isActive && <View style={styles.liveIndicator} />}
        </View>
        <StatusBadge status={mission.status} dot />
      </View>

      {/* Mission ref + vehicle */}
      <Text style={styles.primaryCardRef}>#{mission.id.substring(0, 8).toUpperCase()}</Text>
      {mission.vehiclePlateNumber && (
        <View style={styles.vehicleRow}>
          <Truck size={13} color={AppTheme.textSecondary} />
          <Text style={styles.vehicleText}>{mission.vehiclePlateNumber}</Text>
        </View>
      )}

      {/* Progress */}
      {total > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>
              {completed} / {total} étapes
            </Text>
            <Text style={styles.progressPct}>{pct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(pct, total > 0 ? 3 : 0)}%` }]} />
          </View>
        </View>
      )}

      {/* Current step */}
      {nextStep && isActive && (
        <View style={styles.currentStepBlock}>
          <Text style={styles.currentStepLabel}>ÉTAPE ACTUELLE</Text>
          <Text style={styles.currentStepName}>{nextStep.location.name}</Text>
          <Text style={styles.currentStepAction}>
            {ACTION_LABELS[nextStep.actionType] ?? nextStep.actionType}
          </Text>
        </View>
      )}

      {/* Planned time */}
      {mission.plannedStart && (
        <View style={styles.plannedRow}>
          <Clock size={13} color={AppTheme.textMuted} />
          <Text style={styles.plannedText}>
            Prévu à{' '}
            {new Date(mission.plannedStart).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      )}

      {/* CTA */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        style={[styles.ctaBtn, isActive ? styles.ctaBtnActive : styles.ctaBtnAssigned]}
      >
        {isActive ? (
          <Navigation2 size={18} color="#FFFFFF" />
        ) : (
          <Navigation2 size={18} color="#FFFFFF" />
        )}
        <Text style={styles.ctaBtnText}>{actionLabel}</Text>
      </TouchableOpacity>

      {/* GPS warning when not tracking an active mission */}
      {isActive && !isTracking && (
        <View style={styles.gpsWarning}>
          <AlertTriangle size={13} color={AppTheme.warning} />
          <Text style={styles.gpsWarningText}>
            GPS non actif — ouvrez la mission pour démarrer le suivi
          </Text>
        </View>
      )}
    </View>
  );
}

function OtherMissionRow({ mission }: { mission: Mission }) {
  const router = useRouter();
  const completed = mission.steps.filter((s) => s.status === 'VALIDATED').length;
  const total = mission.steps.length;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push(`/(main)/missions/${mission.id}` as any)}
      style={styles.otherRow}
    >
      <View style={styles.otherRowLeft}>
        <Text style={styles.otherRef}>#{mission.id.substring(0, 8).toUpperCase()}</Text>
        <Text style={styles.otherSteps}>
          {completed}/{total} étapes
          {mission.vehiclePlateNumber ? ` · ${mission.vehiclePlateNumber}` : ''}
        </Text>
      </View>
      <StatusBadge status={mission.status} dot />
      <ChevronRight size={16} color={AppTheme.textMuted} style={styles.otherChevron} />
    </TouchableOpacity>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  scrollContent: {
    padding: AppSpacing.xl,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.lg,
  },
  greetingSmall: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    fontWeight: '600',
  },
  greetingName: {
    fontSize: 26,
    fontWeight: '900',
    color: AppTheme.text,
    letterSpacing: -0.5,
  },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: AppTheme.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: AppRadius.pill,
    borderWidth: 1,
    borderColor: `${AppTheme.primary}30`,
  },
  vehiclePillText: {
    fontSize: 13,
    fontWeight: '800',
    color: AppTheme.primary,
  },
  // Status strip
  statusStrip: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
    marginBottom: AppSpacing.lg,
    flexWrap: 'wrap',
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: AppRadius.pill,
    gap: 5,
  },
  indicatorText: {
    fontSize: 12,
    fontWeight: '700',
  },
  indicatorMeta: {
    fontSize: 11,
    fontWeight: '500',
    color: AppTheme.textMuted,
  },
  // Offline banner
  offlineBannerWrap: {
    marginBottom: AppSpacing.lg,
  },
  // Tracking banner
  trackingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.trackingLight,
    borderRadius: AppRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: AppSpacing.lg,
    borderWidth: 1,
    borderColor: `${AppTheme.tracking}30`,
    gap: 8,
  },
  trackingBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: AppTheme.tracking,
    flex: 1,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppTheme.tracking,
  },
  // Primary mission card
  primaryCard: {
    backgroundColor: AppTheme.card,
    borderRadius: AppRadius.xl,
    padding: AppSpacing.xl,
    borderWidth: 1,
    borderColor: AppTheme.border,
    marginBottom: AppSpacing.xl,
    ...AppShadow.card,
  },
  primaryCardActive: {
    borderColor: AppTheme.tracking,
    borderWidth: 1.5,
  },
  primaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: AppSpacing.sm,
  },
  primaryCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryCardLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: AppTheme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  liveIndicator: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: AppTheme.tracking,
  },
  primaryCardRef: {
    fontSize: 20,
    fontWeight: '900',
    color: AppTheme.text,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: AppSpacing.md,
  },
  vehicleText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppTheme.textSecondary,
  },
  progressSection: {
    marginBottom: AppSpacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: AppTheme.textSecondary,
  },
  progressPct: {
    fontSize: 13,
    fontWeight: '800',
    color: AppTheme.text,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: AppTheme.subtle,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: AppTheme.success,
  },
  currentStepBlock: {
    backgroundColor: `${AppTheme.tracking}0D`,
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.md,
    borderLeftWidth: 3,
    borderLeftColor: AppTheme.tracking,
  },
  currentStepLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: AppTheme.tracking,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  currentStepName: {
    fontSize: 15,
    fontWeight: '800',
    color: AppTheme.text,
    marginBottom: 2,
  },
  currentStepAction: {
    fontSize: 13,
    fontWeight: '600',
    color: AppTheme.textSecondary,
  },
  plannedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: AppSpacing.lg,
  },
  plannedText: {
    fontSize: 12,
    fontWeight: '600',
    color: AppTheme.textMuted,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: AppRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 52,
  },
  ctaBtnActive: {
    backgroundColor: AppTheme.tracking,
  },
  ctaBtnAssigned: {
    backgroundColor: AppTheme.primary,
  },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  gpsWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: AppSpacing.md,
    paddingHorizontal: AppSpacing.sm,
  },
  gpsWarningText: {
    fontSize: 12,
    fontWeight: '600',
    color: AppTheme.warning,
    flex: 1,
  },
  // Empty state
  emptyCard: {
    backgroundColor: AppTheme.card,
    borderRadius: AppRadius.xl,
    padding: AppSpacing.xxl,
    borderWidth: 1,
    borderColor: AppTheme.border,
    alignItems: 'center',
    marginBottom: AppSpacing.xl,
    ...AppShadow.card,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppTheme.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AppSpacing.lg,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: AppTheme.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: AppTheme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Other missions
  section: {
    marginBottom: AppSpacing.xl,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: AppTheme.text,
    marginBottom: AppSpacing.md,
  },
  otherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.card,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.sm,
    borderWidth: 1,
    borderColor: AppTheme.border,
    ...AppShadow.card,
  },
  otherRowLeft: {
    flex: 1,
  },
  otherRef: {
    fontSize: 14,
    fontWeight: '800',
    color: AppTheme.text,
  },
  otherSteps: {
    fontSize: 12,
    fontWeight: '600',
    color: AppTheme.textSecondary,
    marginTop: 2,
  },
  otherChevron: {
    marginLeft: AppSpacing.sm,
  },
});

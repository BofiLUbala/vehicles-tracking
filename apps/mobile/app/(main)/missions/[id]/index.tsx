import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Navigation2 } from 'lucide-react-native';
import { MissionsApi } from '../../../../src/api/missions.api';
import { useTracking } from '../../../../src/context/TrackingContext';
import { useMissionRealtime } from '../../../../src/hooks/useMissionRealtime';
import { Mission, MissionStep } from '../../../../src/types/mission.types';
import { StatusBadge } from '../../../../src/components/StatusBadge';
import { BigButton } from '../../../../src/components/BigButton';
import { MissionStepCard } from '../../../../src/components/MissionStepCard';
import { LoadingView } from '../../../../src/components/LoadingView';
import { ErrorView } from '../../../../src/components/ErrorView';
import { AppTheme, AppRadius, AppShadow, AppSpacing } from '../../../../src/theme/colors';

export default function MissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [mission, setMission] = useState<Mission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const { startTracking } = useTracking();
  const router = useRouter();

  const loadMission = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await MissionsApi.getMissionDetail(id);
      setMission(data);
    } catch {
      setError('Impossible de charger les détails de la mission.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMission();
  }, [loadMission]);

  // Rafraîchissement sur événements temps réel (ex. étape validée depuis un autre écran/appareil).
  useMissionRealtime({
    missionId: mission?.id ?? id ?? null,
    vehicleId: mission?.vehicleId ?? null,
    onMissionEvent: loadMission,
  });

  const handleStartMission = async () => {
    if (!mission) return;
    setIsStarting(true);
    setStartError(null);
    try {
      const started = await MissionsApi.startMission(mission.id);
      setMission(started);
      // Start background & foreground GPS tracking for this mission and vehicle
      await startTracking(started.vehicleId, started.id);
      router.replace(`/(main)/missions/${mission.id}/progress`);
    } catch {
      // Un échec peut simplement signifier que la mission est déjà démarrée (reprise) : on vérifie
      // l'état réel avant d'afficher une erreur, sans jamais poursuivre à l'aveugle.
      try {
        const fresh = await MissionsApi.getMissionDetail(mission.id);
        if (fresh.status === 'STARTED' || fresh.status === 'IN_PROGRESS') {
          setMission(fresh);
          await startTracking(fresh.vehicleId, fresh.id);
          router.replace(`/(main)/missions/${mission.id}/progress`);
          return;
        }
      } catch {
        // Ignoré : le message d'erreur générique ci-dessous couvre les deux cas.
      }
      setStartError('Impossible de démarrer la mission. Vérifiez votre connexion puis réessayez.');
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingView message="Chargement des détails de la mission…" />
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

  const isStarted = mission.status === 'STARTED' || mission.status === 'IN_PROGRESS';
  const isCompleted = mission.status === 'COMPLETED';

  const sortedSteps = mission.steps.sort((a, b) => a.order - b.order);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={AppTheme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mission #{mission.id.substring(0, 8).toUpperCase()}</Text>
        <StatusBadge status={mission.status} dot />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informations du véhicule</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Véhicule assigné</Text>
            <Text style={styles.infoValue}>{mission.vehiclePlateNumber || 'Non spécifié'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total des étapes</Text>
            <Text style={styles.infoValue}>{mission.steps.length} étape(s)</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Étapes ordonnées</Text>

        {sortedSteps.map((step: MissionStep, index: number) => {
          const isCurrentStep = step.status !== 'VALIDATED' && (index === 0 || sortedSteps[index - 1]?.status === 'VALIDATED');
          return (
            <MissionStepCard
              key={step.id}
              step={step}
              index={index}
              isCurrent={isCurrentStep}
            />
          );
        })}
      </ScrollView>

      {!isCompleted && (
        <View style={styles.bottomBar}>
          {startError && <Text style={styles.startError}>{startError}</Text>}
          <BigButton
            label={isStarted ? 'Continuer la mission' : 'Démarrer la mission'}
            isLoading={isStarting}
            icon={<Navigation2 size={20} color="#FFFFFF" />}
            onPressed={isStarted ? () => router.push(`/(main)/missions/${mission.id}/progress`) : handleStartMission}
          />
        </View>
      )}
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
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.md,
    backgroundColor: AppTheme.card,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: AppRadius.pill,
    backgroundColor: AppTheme.subtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: AppTheme.text,
    flex: 1,
    marginLeft: AppSpacing.md,
  },
  content: {
    padding: AppSpacing.xl,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: AppTheme.card,
    borderRadius: AppRadius.xl,
    padding: AppSpacing.lg,
    borderWidth: 1,
    borderColor: AppTheme.border,
    marginBottom: AppSpacing.xxl,
    ...AppShadow.card,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: AppTheme.text,
    marginBottom: AppSpacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: AppSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.subtle,
  },
  infoLabel: {
    fontSize: 14,
    color: AppTheme.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: AppTheme.text,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: AppTheme.text,
    marginBottom: AppSpacing.md,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: AppTheme.card,
    paddingHorizontal: AppSpacing.xl,
    paddingTop: AppSpacing.md,
    paddingBottom: AppSpacing.xxl,
    borderTopWidth: 1,
    borderTopColor: AppTheme.border,
  },
  startError: {
    fontSize: 13,
    fontWeight: '600',
    color: AppTheme.danger,
    marginBottom: AppSpacing.sm,
    textAlign: 'center',
  },
});

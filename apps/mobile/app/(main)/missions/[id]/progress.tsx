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
import { MissionsApi } from '../../../../src/api/missions.api';
import { useTracking } from '../../../../src/context/TrackingContext';
import { Mission, MissionStep } from '../../../../src/types/mission.types';
import { StatusBadge } from '../../../../src/components/StatusBadge';
import { BigButton } from '../../../../src/components/BigButton';
import { LoadingView } from '../../../../src/components/LoadingView';
import { ErrorView } from '../../../../src/components/ErrorView';
import { AppTheme } from '../../../../src/theme/colors';

export default function MissionProgressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [mission, setMission] = useState<Mission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isTracking, startTracking } = useTracking();
  const router = useRouter();

  const loadMission = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await MissionsApi.getMissionDetail(id);
      setMission(data);
      if (data.status === 'STARTED' || data.status === 'IN_PROGRESS') {
        startTracking(data.vehicleId, data.id);
      }
    } catch {
      setError('Impossible de rafraîchir la progression.');
    } finally {
      setIsLoading(false);
    }
  }, [id, startTracking]);

  useEffect(() => {
    loadMission();
  }, [loadMission]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingView message="Chargement de la mission en cours…" />
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(main)/missions')} style={styles.backBtn}>
          <Text style={styles.backText}>← Missions</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mission en cours</Text>
        <StatusBadge status={mission.status} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Tracking Live Indicator */}
        <View style={styles.trackingCard}>
          <View style={styles.trackingDot} />
          <View style={styles.trackingInfo}>
            <Text style={styles.trackingTitle}>
              {isTracking ? 'Suivi GPS Actif' : 'Positionnement standard'}
            </Text>
            <Text style={styles.trackingSubtitle}>
              Véhicule {mission.vehiclePlateNumber || mission.vehicleId.substring(0, 8)}
            </Text>
          </View>
        </View>

        {/* Current Step Focus Box */}
        {currentStep && (
          <View style={styles.currentStepCard}>
            <View style={styles.currentStepBadge}>
              <Text style={styles.currentStepBadgeText}>ÉTAPE {currentStepIndex + 1} SUR {sortedSteps.length}</Text>
            </View>

            <Text style={styles.currentStepAction}>
              {currentStep.actionType === 'COLLECT'
                ? 'Collecte des déchets'
                : currentStep.actionType === 'DROPOFF'
                ? 'Dépôt au centre de traitement'
                : currentStep.actionType === 'WEIGH'
                ? 'Pesée du camion'
                : 'Point de contrôle'}
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
              onPressed={() =>
                router.push(`/(main)/missions/${mission.id}/steps/${currentStep.id}/scan`)
              }
              style={styles.scanButton}
            />
          </View>
        )}

        {isAllCompleted && (
          <View style={styles.completedBox}>
            <Text style={styles.completedIcon}>🎉</Text>
            <Text style={styles.completedTitle}>Toutes les étapes sont validées !</Text>
            <Text style={styles.completedSubtitle}>
              Vous avez terminé l&apos;ensemble du parcours prévu pour cette mission.
            </Text>
            <BigButton
              label="Retour aux missions du jour"
              onPressed={() => router.replace('/(main)/missions')}
              style={styles.completedButton}
            />
          </View>
        )}

        {/* Steps Progression Timeline */}
        <Text style={styles.timelineTitle}>Parcours de la mission</Text>

        {sortedSteps.map((step: MissionStep, index: number) => {
          const isDone = step.status === 'VALIDATED';
          const isCurrent = index === currentStepIndex;

          return (
            <View
              key={step.id}
              style={[
                styles.timelineItem,
                isDone ? styles.timelineItemDone : null,
                isCurrent ? styles.timelineItemCurrent : null,
              ]}
            >
              <View
                style={[
                  styles.timelineOrder,
                  isDone ? styles.timelineOrderDone : isCurrent ? styles.timelineOrderCurrent : null,
                ]}
              >
                <Text
                  style={[
                    styles.timelineOrderText,
                    isDone || isCurrent ? styles.timelineOrderTextActive : null,
                  ]}
                >
                  {isDone ? '✓' : index + 1}
                </Text>
              </View>

              <View style={styles.timelineContent}>
                <Text style={styles.timelineStepName}>{step.location.name}</Text>
                <Text style={styles.timelineAction}>
                  {step.actionType} • Rayon {step.location.allowedRadius}m
                </Text>
              </View>

              <StatusBadge status={step.status} />
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: AppTheme.primary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: AppTheme.text,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  trackingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.primaryLight,
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  trackingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: AppTheme.primary,
    marginRight: 12,
  },
  trackingInfo: {
    flex: 1,
  },
  trackingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: AppTheme.primaryDark,
  },
  trackingSubtitle: {
    fontSize: 12,
    color: AppTheme.textSecondary,
    fontWeight: '600',
  },
  currentStepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 2,
    borderColor: AppTheme.primary,
    shadowColor: AppTheme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  currentStepBadge: {
    backgroundColor: AppTheme.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  currentStepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: AppTheme.primaryDark,
    letterSpacing: 0.5,
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
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  radiusText: {
    fontSize: 12,
    color: AppTheme.textSecondary,
    fontWeight: '600',
  },
  scanButton: {
    marginTop: 4,
  },
  completedBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    alignItems: 'center',
    marginBottom: 24,
  },
  completedIcon: {
    fontSize: 48,
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
  timelineTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: AppTheme.text,
    marginBottom: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timelineItemDone: {
    backgroundColor: '#F8FAFC',
    opacity: 0.75,
  },
  timelineItemCurrent: {
    borderColor: AppTheme.primary,
    borderWidth: 1.5,
  },
  timelineOrder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timelineOrderDone: {
    backgroundColor: AppTheme.successLight,
  },
  timelineOrderCurrent: {
    backgroundColor: AppTheme.primary,
  },
  timelineOrderText: {
    fontSize: 12,
    fontWeight: '800',
    color: AppTheme.text,
  },
  timelineOrderTextActive: {
    color: AppTheme.primaryDark,
  },
  timelineContent: {
    flex: 1,
    marginRight: 8,
  },
  timelineStepName: {
    fontSize: 14,
    fontWeight: '700',
    color: AppTheme.text,
  },
  timelineAction: {
    fontSize: 12,
    color: AppTheme.textSecondary,
    marginTop: 2,
  },
});

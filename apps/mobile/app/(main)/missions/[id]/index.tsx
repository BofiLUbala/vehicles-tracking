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

export default function MissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [mission, setMission] = useState<Mission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleStartMission = async () => {
    if (!mission) return;
    setIsStarting(true);
    try {
      const started = await MissionsApi.startMission(mission.id);
      setMission(started);
      // Start background & foreground GPS tracking for this mission and vehicle
      await startTracking(started.vehicleId, started.id);
      router.replace(`/(main)/missions/${mission.id}/progress`);
    } catch {
      // If error or already started, try to proceed
      await startTracking(mission.vehicleId, mission.id);
      router.replace(`/(main)/missions/${mission.id}/progress`);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mission #{mission.id.substring(0, 8).toUpperCase()}</Text>
        <StatusBadge status={mission.status} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informations du véhicule</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Véhicule assigné :</Text>
            <Text style={styles.infoValue}>{mission.vehiclePlateNumber || 'Non spécifié'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total des étapes :</Text>
            <Text style={styles.infoValue}>{mission.steps.length} étape(s)</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Étapes ordonnées</Text>

        {mission.steps
          .sort((a, b) => a.order - b.order)
          .map((step: MissionStep, index: number) => {
            const isStepValidated = step.status === 'VALIDATED';

            return (
              <View
                key={step.id}
                style={[
                  styles.stepCard,
                  isStepValidated ? styles.stepValidated : null,
                ]}
              >
                <View style={styles.stepOrderBadge}>
                  <Text style={styles.stepOrderText}>{index + 1}</Text>
                </View>

                <View style={styles.stepContent}>
                  <View style={styles.stepHeader}>
                    <Text style={styles.stepActionType}>
                      {step.actionType === 'COLLECT'
                        ? 'Collecte'
                        : step.actionType === 'DROPOFF'
                        ? 'Dépôt'
                        : step.actionType === 'WEIGH'
                        ? 'Pesage'
                        : 'Contrôle'}
                    </Text>
                    <StatusBadge status={step.status} />
                  </View>

                  <Text style={styles.stepLocationName}>{step.location.name}</Text>
                  {step.location.address && (
                    <Text style={styles.stepAddress}>{step.location.address}</Text>
                  )}
                  <Text style={styles.stepRadius}>
                    Rayon autorisé : {step.location.allowedRadius} m
                  </Text>
                </View>
              </View>
            );
          })}
      </ScrollView>

      {!isCompleted && (
        <View style={styles.bottomBar}>
          <BigButton
            label={isStarted ? 'Continuer la mission' : 'Démarrer la mission'}
            isLoading={isStarting}
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
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: AppTheme.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    marginBottom: 14,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepValidated: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  stepOrderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  stepOrderText: {
    fontSize: 14,
    fontWeight: '800',
    color: AppTheme.text,
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepActionType: {
    fontSize: 12,
    fontWeight: '700',
    color: AppTheme.primary,
    textTransform: 'uppercase',
  },
  stepLocationName: {
    fontSize: 15,
    fontWeight: '800',
    color: AppTheme.text,
    marginBottom: 2,
  },
  stepAddress: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    marginBottom: 4,
  },
  stepRadius: {
    fontSize: 11,
    color: AppTheme.textMuted,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
});

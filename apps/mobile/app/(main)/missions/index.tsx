import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { useTracking } from '../../../src/context/TrackingContext';
import { MissionsApi } from '../../../src/api/missions.api';
import { MissionsCacheRepository } from '../../../src/database/missions-cache.repository';
import { Mission } from '../../../src/types/mission.types';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { LoadingView } from '../../../src/components/LoadingView';
import { ErrorView } from '../../../src/components/ErrorView';
import { AppTheme } from '../../../src/theme/colors';

export default function MissionsListScreen() {
  const { driver } = useAuth();
  const { isTracking } = useTracking();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const loadMissions = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    setError(null);
    try {
      const data = await MissionsApi.getTodayMissions();
      setMissions(data);
      MissionsCacheRepository.save(data);
    } catch {
      // Fallback to offline cache
      const cached = MissionsCacheRepository.get();
      if (cached && cached.length > 0) {
        setMissions(cached);
      } else {
        setError('Impossible de récupérer vos missions.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadMissions(false);
  };

  const renderMissionItem = ({ item }: { item: Mission }) => {
    const isStarted = item.status === 'STARTED' || item.status === 'IN_PROGRESS';
    const isCompleted = item.status === 'COMPLETED';

    const completedCount = item.steps.filter((s) => s.status === 'VALIDATED').length;
    const totalSteps = item.steps.length;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          if (isStarted) {
            router.push(`/(main)/missions/${item.id}/progress`);
          } else {
            router.push(`/(main)/missions/${item.id}`);
          }
        }}
        style={[
          styles.missionCard,
          isStarted ? styles.activeMissionCard : null,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.missionTitleWrapper}>
            <Text style={styles.missionNumber}>
              Mission #{item.id.substring(0, 8).toUpperCase()}
            </Text>
            {item.vehiclePlateNumber && (
              <Text style={styles.vehiclePlate}>{item.vehiclePlateNumber}</Text>
            )}
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.stepsCount}>
            {completedCount} / {totalSteps} étape(s) complétée(s)
          </Text>

          {item.steps.length > 0 && (
            <View style={styles.stepPreview}>
              <Text style={styles.stepPreviewLabel}>Prochaine destination :</Text>
              <Text style={styles.stepLocationName} numberOfLines={1}>
                {item.steps[completedCount]?.location.name || 'Dépôt final'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.actionText, isStarted ? styles.actionTextActive : null]}>
            {isCompleted ? 'Voir le résumé →' : isStarted ? 'Continuer la mission →' : 'Détails de la mission →'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.driverInfo}>
          <Text style={styles.greeting}>Bonjour,</Text>
          <Text style={styles.driverName}>
            {driver ? `${driver.firstName} ${driver.lastName}` : 'Chauffeur'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(main)/fuel')}
            style={styles.headerIconBtn}
          >
            <Text style={styles.headerIcon}>⛽</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(main)/history')}
            style={styles.headerIconBtn}
          >
            <Text style={styles.headerIcon}>📋</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(main)/profile')}
            style={styles.headerIconBtn}
          >
            <Text style={styles.headerIcon}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isTracking && (
        <View style={styles.trackingBanner}>
          <View style={styles.trackingDot} />
          <Text style={styles.trackingText}>Suivi GPS en direct actif</Text>
        </View>
      )}

      {isLoading ? (
        <LoadingView message="Chargement des missions du jour…" />
      ) : error && missions.length === 0 ? (
        <ErrorView message={error} onRetry={() => loadMissions()} />
      ) : (
        <FlatList
          data={missions}
          keyExtractor={(item) => item.id}
          renderItem={renderMissionItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[AppTheme.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🚛</Text>
              <Text style={styles.emptyTitle}>Aucune mission aujourd&apos;hui</Text>
              <Text style={styles.emptySubtitle}>
                Vous n&apos;avez aucune mission assignée pour l&apos;instant. Tirez vers le bas pour rafraîchir.
              </Text>
            </View>
          }
        />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  driverInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    fontWeight: '600',
  },
  driverName: {
    fontSize: 20,
    fontWeight: '800',
    color: AppTheme.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 20,
  },
  trackingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppTheme.primary,
    marginRight: 8,
  },
  trackingText: {
    fontSize: 13,
    fontWeight: '700',
    color: AppTheme.primaryDark,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  missionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  activeMissionCard: {
    borderColor: AppTheme.primary,
    borderWidth: 2,
    backgroundColor: '#F0F9FF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  missionTitleWrapper: {
    flex: 1,
    marginRight: 10,
  },
  missionNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: AppTheme.text,
  },
  vehiclePlate: {
    fontSize: 13,
    fontWeight: '600',
    color: AppTheme.textSecondary,
    marginTop: 2,
  },
  cardBody: {
    marginBottom: 14,
  },
  stepsCount: {
    fontSize: 14,
    fontWeight: '700',
    color: AppTheme.text,
    marginBottom: 6,
  },
  stepPreview: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
  },
  stepPreviewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: AppTheme.textSecondary,
    textTransform: 'uppercase',
  },
  stepLocationName: {
    fontSize: 14,
    fontWeight: '700',
    color: AppTheme.text,
    marginTop: 2,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: AppTheme.primary,
    textAlign: 'right',
  },
  actionTextActive: {
    color: AppTheme.primaryDark,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppTheme.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: AppTheme.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});

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
import { Navigation2, Fuel, History, UserRound, Truck } from 'lucide-react-native';
import { useAuth } from '../../../src/context/AuthContext';
import { useTracking } from '../../../src/context/TrackingContext';
import { MissionsApi } from '../../../src/api/missions.api';
import { MissionsCacheRepository } from '../../../src/database/missions-cache.repository';
import { Mission } from '../../../src/types/mission.types';
import { MissionCard } from '../../../src/components/MissionCard';
import { GpsStatusPill } from '../../../src/components/GpsStatusPill';
import { LoadingView } from '../../../src/components/LoadingView';
import { ErrorView } from '../../../src/components/ErrorView';
import { AppRadius, AppTheme } from '../../../src/theme/colors';

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

  const firstLine = driver ? driver.firstName : 'Chauffeur';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.driverInfo}>
          <Text style={styles.greeting}>Bonjour,</Text>
          <Text style={styles.driverName}>{firstLine}</Text>
        </View>

        <View style={styles.headerActions}>
          <GpsStatusPill isTracking={isTracking} />
          <View style={styles.iconGroup}>
            <TouchableOpacity
              accessibilityLabel="Déclaration carburant"
              activeOpacity={0.7}
              onPress={() => router.push('/(main)/fuel')}
              style={styles.headerIconBtn}
            >
              <Fuel size={18} color={AppTheme.text} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Historique"
              activeOpacity={0.7}
              onPress={() => router.push('/(main)/history')}
              style={styles.headerIconBtn}
            >
              <History size={18} color={AppTheme.text} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Profil"
              activeOpacity={0.7}
              onPress={() => router.push('/(main)/profile')}
              style={styles.headerIconBtn}
            >
              <UserRound size={18} color={AppTheme.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {isTracking && (
        <View style={styles.trackingBanner}>
          <Navigation2 size={15} color={AppTheme.tracking} />
          <Text style={styles.trackingText}>Suivi GPS en direct actif</Text>
        </View>
      )}

      {isLoading ? (
        <LoadingView message="Chargement de vos missions…" />
      ) : error && missions.length === 0 ? (
        <ErrorView message={error} onRetry={() => loadMissions()} />
      ) : (
        <FlatList
          data={missions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MissionCard mission={item} />}
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
              <View style={styles.emptyIconWrap}>
                <Truck size={28} color={AppTheme.primary} />
              </View>
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
    backgroundColor: AppTheme.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: AppTheme.card,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.border,
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
    fontSize: 22,
    fontWeight: '800',
    color: AppTheme.text,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  iconGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: AppRadius.md,
    backgroundColor: AppTheme.subtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  trackingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.trackingLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: AppRadius.md,
  },
  trackingText: {
    fontSize: 13,
    fontWeight: '700',
    color: AppTheme.tracking,
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppTheme.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
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
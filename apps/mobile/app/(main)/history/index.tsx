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
import { MissionsApi } from '../../../src/api/missions.api';
import { MissionsCacheRepository } from '../../../src/database/missions-cache.repository';
import { Mission } from '../../../src/types/mission.types';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { LoadingView } from '../../../src/components/LoadingView';
import { AppTheme } from '../../../src/theme/colors';

export default function HistoryScreen() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const loadHistory = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const data = await MissionsApi.getTodayMissions();
      setMissions(data);
    } catch {
      const cached = MissionsCacheRepository.get();
      if (cached) setMissions(cached);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadHistory(false);
  };

  const completedMissions = missions.filter(
    (m) => m.status === 'COMPLETED' || m.status === 'CANCELLED' || m.status === 'NOT_COMPLETED'
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historique du jour</Text>
        <View style={{ width: 60 }} />
      </View>

      {isLoading ? (
        <LoadingView message="Chargement de l'historique…" />
      ) : (
        <FlatList
          data={completedMissions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[AppTheme.primary]}
            />
          }
          renderItem={({ item }) => {
            const completedCount = item.steps.filter((s) => s.status === 'VALIDATED').length;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push(`/(main)/missions/${item.id}`)}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.missionNumber}>
                    Mission #{item.id.substring(0, 8).toUpperCase()}
                  </Text>
                  <StatusBadge status={item.status} />
                </View>

                <Text style={styles.cardSubtitle}>
                  Véhicule : {item.vehiclePlateNumber || item.vehicleId.substring(0, 8)}
                </Text>
                <Text style={styles.stepsText}>
                  {completedCount} / {item.steps.length} étape(s) validée(s)
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>Aucune mission terminée</Text>
              <Text style={styles.emptySubtitle}>
                Les missions que vous aurez terminées aujourd&apos;hui apparaîtront ici.
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
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  missionNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: AppTheme.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    marginBottom: 4,
  },
  stepsText: {
    fontSize: 13,
    fontWeight: '700',
    color: AppTheme.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 14,
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

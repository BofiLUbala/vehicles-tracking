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
import { ArrowLeft, CheckCircle2, ClipboardList, ChevronRight } from 'lucide-react-native';
import { MissionsApi } from '../../../src/api/missions.api';
import { MissionsCacheRepository } from '../../../src/database/missions-cache.repository';
import { Mission } from '../../../src/types/mission.types';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { LoadingView } from '../../../src/components/LoadingView';
import { ErrorView } from '../../../src/components/ErrorView';
import { AppRadius, AppShadow, AppSpacing, AppTheme } from '../../../src/theme/colors';

export default function HistoryScreen() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const loadHistory = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    setError(null);
    try {
      const data = await MissionsApi.getTodayMissions();
      setMissions(data);
    } catch {
      const cached = MissionsCacheRepository.get();
      if (cached && cached.length > 0) {
        setMissions(cached);
      } else {
        setError('Impossible de charger l’historique. Vérifiez votre connexion puis réessayez.');
      }
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
          <ArrowLeft size={20} color={AppTheme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historique du jour</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <LoadingView message="Chargement de l'historique…" />
      ) : error ? (
        <ErrorView message={error} onRetry={() => loadHistory()} />
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
                  <StatusBadge status={item.status} dot />
                </View>

                <Text style={styles.cardSubtitle}>
                  Véhicule : {item.vehiclePlateNumber || item.vehicleId.substring(0, 8)}
                </Text>
                <View style={styles.stepsRow}>
                  <CheckCircle2 size={14} color={AppTheme.success} />
                  <Text style={styles.stepsText}>
                    <Text style={styles.stepsCount}>{completedCount}</Text> / {item.steps.length} étape(s) validée(s)
                  </Text>
                  <View style={styles.chevron}>
                    <ChevronRight size={16} color={AppTheme.textMuted} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <ClipboardList size={28} color={AppTheme.primary} />
              </View>
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
  headerSpacer: {
    width: 36,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: AppTheme.text,
  },
  listContent: {
    padding: AppSpacing.lg,
    flexGrow: 1,
  },
  card: {
    backgroundColor: AppTheme.card,
    borderRadius: AppRadius.xl,
    padding: AppSpacing.lg,
    marginBottom: AppSpacing.md,
    borderWidth: 1,
    borderColor: AppTheme.border,
    ...AppShadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.sm,
  },
  missionNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: AppTheme.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    marginBottom: AppSpacing.sm,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: AppSpacing.xs,
  },
  stepsText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppTheme.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  stepsCount: {
    fontWeight: '700',
    color: AppTheme.success,
    fontVariant: ['tabular-nums'],
  },
  chevron: {
    marginLeft: 8,
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
    marginBottom: AppSpacing.lg,
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
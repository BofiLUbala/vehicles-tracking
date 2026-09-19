import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, CloudOff, Fuel, MapPin, RefreshCw } from 'lucide-react-native';
import { useSync } from '../../../src/context/SyncContext';
import { BigButton } from '../../../src/components/BigButton';
import { SyncStatusPill } from '../../../src/components/SyncStatusPill';
import { AppRadius, AppShadow, AppSpacing, AppTheme } from '../../../src/theme/colors';

export default function PendingSyncScreen() {
  const { counts, isSyncing, isConnected, syncNow } = useSync();
  const router = useRouter();

  const hasFailed = counts.gpsFailed + counts.validationsFailed + counts.fuelFailed > 0;
  const syncState: 'online' | 'syncing' | 'offline' | 'pending' = isSyncing
    ? 'syncing'
    : !isConnected
    ? 'offline'
    : counts.total > 0
    ? 'pending'
    : 'online';

  const bannerConfig = counts.total === 0
    ? { icon: CheckCircle2, color: AppTheme.success, bg: AppTheme.successLight, title: 'Toutes les données sont synchronisées' }
    : hasFailed
    ? { icon: AlertTriangle, color: AppTheme.danger, bg: AppTheme.dangerLight, title: `${counts.total} élément(s) en attente d'envoi` }
    : { icon: CloudOff, color: AppTheme.warning, bg: AppTheme.warningLight, title: `${counts.total} élément(s) en attente d'envoi` };

  const BannerIcon = bannerConfig.icon;

  const queues = [
    {
      key: 'gps',
      name: 'Positions GPS',
      icon: MapPin,
      color: AppTheme.tracking,
      bg: AppTheme.trackingLight,
      pending: counts.gpsPending,
      failed: counts.gpsFailed,
      fullWidth: false,
    },
    {
      key: 'validations',
      name: "Validations d'étapes (QR + Photo)",
      icon: Camera,
      color: AppTheme.primary,
      bg: AppTheme.primaryLight,
      pending: counts.validationsPending,
      failed: counts.validationsFailed,
      fullWidth: false,
    },
    {
      key: 'fuel',
      name: 'Déclarations de carburant',
      icon: Fuel,
      color: AppTheme.info,
      bg: AppTheme.infoLight,
      pending: counts.fuelPending,
      failed: counts.fuelFailed,
      fullWidth: true,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={AppTheme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Synchronisation</Text>
        <SyncStatusPill state={syncState} pendingCount={counts.total} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: bannerConfig.bg }]}>
          <View style={[styles.bannerIconWrap, { backgroundColor: `${bannerConfig.color}1A` }]}>
            <BannerIcon size={22} color={bannerConfig.color} />
          </View>
          <View style={styles.bannerContent}>
            <Text style={[styles.bannerTitle, { color: bannerConfig.color }]}>{bannerConfig.title}</Text>
            <Text style={styles.bannerSubtitle}>
              {isConnected
                ? 'Connexion active avec le serveur central.'
                : 'Hors ligne. Les données restent en sécurité sur votre appareil.'}
            </Text>
          </View>
        </View>

        {/* Queues grid */}
        <Text style={styles.sectionTitle}>Détail des files d&apos;attente</Text>

        <View style={styles.grid}>
          {queues.map((q) => {
            const QueueIcon = q.icon;
            return (
              <View
                key={q.key}
                style={[styles.queueCard, q.fullWidth ? styles.queueCardFull : styles.queueCardHalf]}
              >
                <View style={[styles.queueIconWrapper, { backgroundColor: q.bg }]}>
                  <QueueIcon size={18} color={q.color} />
                </View>
                <Text style={styles.queueName}>{q.name}</Text>
                <View style={styles.queueCountsRow}>
                  <Text style={styles.queueCounts}>
                    <Text style={styles.queuePending}>{q.pending}</Text> en attente
                  </Text>
                  {q.failed > 0 && (
                    <View style={styles.failedPill}>
                      <Text style={styles.failedText}>{q.failed} en échec</Text>
                    </View>
                  )}
                </View>
                {q.pending === 0 && (
                  <View style={styles.checkDone}>
                    <CheckCircle2 size={16} color={AppTheme.success} />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <Text style={styles.infoNote}>
          Les éléments échoués sont retentés automatiquement avec un délai progressif dès que la connexion Internet est rétablie.
        </Text>
      </ScrollView>

      <View style={styles.bottomBar}>
        <BigButton
          label={isSyncing ? 'Synchronisation…' : 'Synchroniser maintenant'}
          icon={<RefreshCw size={20} color="#FFFFFF" />}
          isLoading={isSyncing}
          disabled={counts.total === 0}
          onPressed={() => syncNow(true)}
        />
      </View>
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
    fontSize: 20,
    fontWeight: '800',
    color: AppTheme.text,
    flex: 1,
    marginLeft: AppSpacing.md,
  },
  content: {
    padding: AppSpacing.xl,
    paddingBottom: 100,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppSpacing.lg,
    borderRadius: AppRadius.lg,
    marginBottom: AppSpacing.xxl,
    borderWidth: 1,
    borderColor: AppTheme.border,
    ...AppShadow.card,
  },
  bannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: AppRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: AppSpacing.md,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: AppTheme.text,
    marginBottom: AppSpacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.md,
  },
  queueCard: {
    backgroundColor: AppTheme.card,
    borderRadius: AppRadius.xl,
    padding: AppSpacing.lg,
    borderWidth: 1,
    borderColor: AppTheme.border,
    ...AppShadow.card,
  },
  queueCardHalf: {
    flexBasis: '47.5%',
    flexGrow: 1,
  },
  queueCardFull: {
    flexBasis: '100%',
  },
  queueIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: AppRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: AppSpacing.md,
  },
  queueName: {
    fontSize: 15,
    fontWeight: '700',
    color: AppTheme.text,
    marginBottom: 6,
  },
  queueCountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  queueCounts: {
    fontSize: 13,
    color: AppTheme.textSecondary,
  },
  queuePending: {
    fontWeight: '700',
    color: AppTheme.text,
    fontVariant: ['tabular-nums'],
  },
  failedPill: {
    backgroundColor: AppTheme.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: AppRadius.pill,
  },
  failedText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppTheme.danger,
  },
  checkDone: {
    position: 'absolute',
    top: AppSpacing.lg,
    right: AppSpacing.lg,
  },
  infoNote: {
    fontSize: 13,
    color: AppTheme.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: AppSpacing.xl,
    paddingHorizontal: AppSpacing.lg,
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
});
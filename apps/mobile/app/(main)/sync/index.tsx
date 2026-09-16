import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSync } from '../../../src/context/SyncContext';
import { BigButton } from '../../../src/components/BigButton';
import { AppTheme } from '../../../src/theme/colors';

export default function PendingSyncScreen() {
  const { counts, isSyncing, isConnected, syncNow } = useSync();
  const router = useRouter();

  const hasFailed = counts.gpsFailed + counts.validationsFailed + counts.fuelFailed > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Synchronisation</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status banner */}
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor: counts.total === 0
                ? AppTheme.successLight
                : hasFailed
                ? AppTheme.dangerLight
                : AppTheme.warningLight,
            },
          ]}
        >
          <Text style={styles.bannerIcon}>
            {counts.total === 0 ? '✓' : hasFailed ? '⚠️' : '☁'}
          </Text>
          <View style={styles.bannerContent}>
            <Text
              style={[
                styles.bannerTitle,
                {
                  color: counts.total === 0
                    ? AppTheme.success
                    : hasFailed
                    ? AppTheme.danger
                    : AppTheme.warning,
                },
              ]}
            >
              {counts.total === 0
                ? 'Toutes les données sont synchronisées'
                : `${counts.total} élément(s) en attente d'envoi`}
            </Text>
            <Text style={styles.bannerSubtitle}>
              {isConnected
                ? 'Connexion active avec le serveur central.'
                : 'Hors ligne. Les données restent en sécurité sur votre appareil.'}
            </Text>
          </View>
        </View>

        {/* Queues list */}
        <Text style={styles.sectionTitle}>Détail des files d&apos;attente</Text>

        <View style={styles.queueCard}>
          <View style={styles.queueIconWrapper}>
            <Text style={styles.queueIcon}>📍</Text>
          </View>
          <View style={styles.queueInfo}>
            <Text style={styles.queueName}>Positions GPS</Text>
            <Text style={styles.queueCounts}>
              {counts.gpsPending} en attente
              {counts.gpsFailed > 0 ? ` (${counts.gpsFailed} en échec)` : ''}
            </Text>
          </View>
          {counts.gpsPending === 0 && <Text style={styles.checkDone}>✓</Text>}
        </View>

        <View style={styles.queueCard}>
          <View style={styles.queueIconWrapper}>
            <Text style={styles.queueIcon}>📸</Text>
          </View>
          <View style={styles.queueInfo}>
            <Text style={styles.queueName}>Validations d&apos;étapes (QR + Photo)</Text>
            <Text style={styles.queueCounts}>
              {counts.validationsPending} en attente
              {counts.validationsFailed > 0 ? ` (${counts.validationsFailed} en échec)` : ''}
            </Text>
          </View>
          {counts.validationsPending === 0 && <Text style={styles.checkDone}>✓</Text>}
        </View>

        <View style={styles.queueCard}>
          <View style={styles.queueIconWrapper}>
            <Text style={styles.queueIcon}>⛽</Text>
          </View>
          <View style={styles.queueInfo}>
            <Text style={styles.queueName}>Déclarations de carburant</Text>
            <Text style={styles.queueCounts}>
              {counts.fuelPending} en attente
              {counts.fuelFailed > 0 ? ` (${counts.fuelFailed} en échec)` : ''}
            </Text>
          </View>
          {counts.fuelPending === 0 && <Text style={styles.checkDone}>✓</Text>}
        </View>

        <Text style={styles.infoNote}>
          Les éléments échoués sont retentés automatiquement avec un délai progressif dès que la connexion Internet est rétablie.
        </Text>
      </ScrollView>

      <View style={styles.bottomBar}>
        <BigButton
          label={isSyncing ? 'Synchronisation…' : 'Synchroniser maintenant'}
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
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    marginBottom: 24,
  },
  bannerIcon: {
    fontSize: 28,
    marginRight: 14,
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
    fontSize: 16,
    fontWeight: '800',
    color: AppTheme.text,
    marginBottom: 12,
  },
  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  queueIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  queueIcon: {
    fontSize: 18,
  },
  queueInfo: {
    flex: 1,
  },
  queueName: {
    fontSize: 15,
    fontWeight: '700',
    color: AppTheme.text,
  },
  queueCounts: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    marginTop: 2,
  },
  checkDone: {
    fontSize: 18,
    fontWeight: '800',
    color: AppTheme.success,
  },
  infoNote: {
    fontSize: 13,
    color: AppTheme.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 20,
    paddingHorizontal: 16,
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

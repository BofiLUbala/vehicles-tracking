import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Navigation2, Truck, ClipboardList, MapPin, RefreshCw, ChevronRight, CheckCircle2 } from 'lucide-react-native';
import { useAuth } from '../../../src/context/AuthContext';
import { useTracking } from '../../../src/context/TrackingContext';
import { WebSocketService } from '../../../src/services/websocket.service';
import { MissionsApi } from '../../../src/api/missions.api';
import { MissionsCacheRepository } from '../../../src/database/missions-cache.repository';
import { Mission } from '../../../src/types/mission.types';
import { MissionCard } from '../../../src/components/MissionCard';
import { LoadingView } from '../../../src/components/LoadingView';
import { ErrorView } from '../../../src/components/ErrorView';
import { AppRadius, AppTheme } from '../../../src/theme/colors';
import { MissionMap } from '../../../src/components/MissionMap';
import { useSync } from '../../../src/context/SyncContext';

export default function MissionsListScreen() {
  const { driver } = useAuth();
  const { isTracking, currentGps, trace } = useTracking();
  const { isConnected, counts } = useSync();
  const { height: screenHeight } = useWindowDimensions();
  const router = useRouter();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Recharge à chaque retour sur l'écran (une affectation reçue hors-ligne/après coup apparaît).
  useFocusEffect(
    useCallback(() => {
      loadMissions(false);
    }, [loadMissions]),
  );

  // Temps réel : la room organisation est rejointe automatiquement à la connexion,
  // donc `mission.assigned` arrive ici sans abonnement supplémentaire.
  useEffect(() => {
    if (!driver?.id) return;
    const driverId = driver.id;
    const unsubAssigned = WebSocketService.on('mission.assigned', (payload) => {
      if (payload?.driverId === driverId) {
        loadMissions(false);
      }
    });
    const unsubReconnect = WebSocketService.on('connect', () => loadMissions(false));
    return () => { unsubAssigned(); unsubReconnect(); };
  }, [driver?.id, loadMissions]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadMissions(false);
  };

  const firstLine = driver ? driver.firstName : 'Chauffeur';
  const primaryMission = missions.find((mission) => mission.status === 'STARTED' || mission.status === 'IN_PROGRESS')
    ?? missions.find((mission) => mission.status === 'ASSIGNED' || mission.status === 'PLANNED');
  const sortedSteps = primaryMission ? [...primaryMission.steps].sort((a, b) => a.order - b.order) : [];
  const currentStepIndex = sortedSteps.findIndex((step) => step.status !== 'VALIDATED');
  const currentStep = sortedSteps[currentStepIndex];
  const completedCount = sortedSteps.filter((step) => step.status === 'VALIDATED').length;
  const isActive = primaryMission?.status === 'STARTED' || primaryMission?.status === 'IN_PROGRESS';
  const openMission = () => {
    if (!primaryMission) return;
    router.push(isActive ? `/(main)/missions/${primaryMission.id}/progress` : `/(main)/missions/${primaryMission.id}`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.heroHeader}>
        <View><Text style={styles.heroSubtitle}>Bonjour, {firstLine}</Text><Text style={styles.heroTitle}>Ma mission</Text></View>
        <View style={[styles.heroStatus, !isActive && styles.heroStatusIdle]}><View style={[styles.heroDot, !isActive && styles.heroDotIdle]} /><Text style={styles.heroStatusText}>{isActive ? 'En direct' : 'En attente'}</Text></View>
      </View>

      {isLoading ? <LoadingView message="Chargement de votre mission…" /> : error && missions.length === 0 ? <ErrorView message={error} onRetry={() => loadMissions()} /> : primaryMission ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dashboardContent} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[AppTheme.tracking]} />}>
          <MissionMap height={Math.max(260, Math.min(screenHeight * 0.41, 390))} currentGps={currentGps} trace={isActive ? trace : []} stops={sortedSteps.map((step) => ({ id: step.id, name: step.location.name, latitude: step.location.latitude, longitude: step.location.longitude, order: step.order, status: step.status === 'VALIDATED' ? 'VALIDATED' : 'PENDING', actionType: step.actionType }))} currentStepIndex={currentStepIndex} onSettingsPress={() => router.push('/(main)/permissions/gps')} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}><View style={styles.sheetIcon}><ClipboardList size={21} color="#FFFFFF" /></View><View style={styles.sheetTitleBlock}><Text style={styles.sheetTitle}>{isActive ? 'Mission active' : 'Mission assignée'}</Text><Text style={styles.sheetCode}>#{primaryMission.id.slice(0, 8).toUpperCase()} · {primaryMission.vehiclePlateNumber || 'Véhicule assigné'}</Text><Text style={styles.sheetMeta}>{completedCount} / {sortedSteps.length} étapes</Text></View></View>
            {currentStep && <View style={styles.currentStop}><View style={styles.stopNumber}><Text style={styles.stopNumberText}>{currentStep.order}</Text></View><View style={styles.stopText}><Text style={styles.stopCaption}>ÉTAPE ACTUELLE</Text><Text style={styles.stopName} numberOfLines={1}>{currentStep.location.name}</Text><Text style={styles.stopAddress} numberOfLines={1}>{currentStep.location.address || currentStep.actionType}</Text></View><ChevronRight size={18} color={AppTheme.warning} /></View>}
            {!currentStep && <View style={styles.currentStop}><CheckCircle2 size={24} color={AppTheme.success} /><Text style={[styles.stopName, { marginLeft: 10 }]}>Toutes les étapes sont validées</Text></View>}
            <View style={styles.statusRow}><MapPin size={20} color={isTracking ? AppTheme.success : AppTheme.textMuted} /><View style={styles.statusCopy}><Text style={styles.statusTitle}>GPS {isTracking ? 'actif' : 'inactif'}</Text><Text style={styles.statusDetail}>{isTracking ? 'Position transmise' : 'Le suivi démarre avec la mission'}</Text></View>{currentGps?.accuracy != null && <Text style={styles.statusValue}>± {Math.round(currentGps.accuracy)} m</Text>}</View>
            <View style={styles.statusRow}><RefreshCw size={20} color={isConnected ? AppTheme.tracking : AppTheme.textMuted} /><View style={styles.statusCopy}><Text style={styles.statusTitle}>Synchronisation</Text><Text style={styles.statusDetail}>{isConnected ? 'Données connectées au web-admin' : 'Envoi dès le retour du réseau'}</Text></View><Text style={styles.statusValue}>{isConnected ? counts.total > 0 ? `${counts.total} à envoyer` : 'À jour' : 'Hors ligne'}</Text></View>
            <TouchableOpacity onPress={openMission} style={styles.mainAction} accessibilityRole="button"><Navigation2 size={19} color="#FFFFFF" /><Text style={styles.mainActionText}>{isActive ? 'Continuer la mission' : 'Voir la mission'}</Text></TouchableOpacity>
          </View>
          {missions.filter((mission) => mission.id !== primaryMission.id && mission.status !== 'COMPLETED').length > 0 && <View style={styles.moreMissions}><Text style={styles.moreTitle}>Autres missions</Text>{missions.filter((mission) => mission.id !== primaryMission.id && mission.status !== 'COMPLETED').map((mission) => <MissionCard key={mission.id} mission={mission} />)}</View>}
        </ScrollView>
      ) : <ScrollView contentContainerStyle={styles.dashboardContent} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[AppTheme.tracking]} />}>
        <MissionMap height={Math.max(260, Math.min(screenHeight * 0.41, 390))} currentGps={currentGps} trace={[]} stops={[]} currentStepIndex={-1} onSettingsPress={() => router.push('/(main)/permissions/gps')} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetTitleRow}><View style={styles.sheetIcon}><ClipboardList size={21} color="#FFFFFF" /></View><View style={styles.sheetTitleBlock}><Text style={styles.sheetTitle}>En attente d’une mission</Text><Text style={styles.sheetMeta}>Le trajet apparaîtra dès votre affectation</Text></View></View>
          <View style={styles.currentStop}><View style={styles.stopText}><Text style={styles.stopName}>Aucune mission aujourd’hui</Text><Text style={styles.stopAddress}>Votre coordinateur vous assignera une mission depuis le web-admin.</Text></View></View>
          <View style={styles.statusRow}><MapPin size={20} color={currentGps ? AppTheme.success : AppTheme.textMuted} /><View style={styles.statusCopy}><Text style={styles.statusTitle}>GPS {currentGps ? 'disponible' : 'inactif'}</Text><Text style={styles.statusDetail}>{currentGps ? 'Position prête pour la mission' : 'Activez la localisation dans les réglages'}</Text></View></View>
          <View style={styles.statusRow}><RefreshCw size={20} color={isConnected ? AppTheme.tracking : AppTheme.textMuted} /><View style={styles.statusCopy}><Text style={styles.statusTitle}>Synchronisation</Text><Text style={styles.statusDetail}>{isConnected ? 'Prêt à recevoir une mission' : 'Nouvelle mission reçue au retour du réseau'}</Text></View><Text style={styles.statusValue}>{isConnected ? 'À jour' : 'Hors ligne'}</Text></View>
          <TouchableOpacity style={styles.mainAction} onPress={onRefresh} accessibilityRole="button"><RefreshCw size={19} color="#FFFFFF" /><Text style={styles.mainActionText}>Actualiser la mission</Text></TouchableOpacity>
        </View>
      </ScrollView>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppTheme.navyLight,
  },
  heroHeader: { backgroundColor: AppTheme.navyLight, paddingHorizontal: 19, paddingTop: 12, paddingBottom: 17, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroSubtitle: { color: '#BFD4F0', fontSize: 12, fontWeight: '600' },
  heroTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 2 },
  heroStatus: { backgroundColor: '#087A4A', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center' },
  heroStatusIdle: { backgroundColor: 'rgba(255,255,255,0.14)' },
  heroDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#6CE6A9', marginRight: 6 },
  heroDotIdle: { backgroundColor: '#BFD4F0' },
  heroStatusText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  emptyPage: { flex: 1, backgroundColor: AppTheme.background, justifyContent: 'center', paddingHorizontal: 20 },
  dashboardContent: { backgroundColor: AppTheme.background, paddingBottom: 24 },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -22, paddingTop: 8, paddingHorizontal: 17, paddingBottom: 17, shadowColor: '#0B1F33', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.12, shadowRadius: 14, elevation: 9 },
  sheetHandle: { alignSelf: 'center', backgroundColor: '#D6DEE9', width: 38, height: 4, borderRadius: 2, marginBottom: 15 },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sheetIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: AppTheme.tracking, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  sheetTitleBlock: { flex: 1 },
  sheetTitle: { color: AppTheme.navy, fontSize: 17, fontWeight: '800' },
  sheetCode: { color: AppTheme.navyLight, fontSize: 13, fontWeight: '700', marginTop: 2 },
  sheetMeta: { color: AppTheme.textSecondary, fontSize: 12, marginTop: 2 },
  currentStop: { flexDirection: 'row', alignItems: 'center', minHeight: 69, backgroundColor: '#F3F6FB', borderRadius: 12, padding: 11, marginBottom: 9 },
  stopNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: AppTheme.warning, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  stopNumberText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  stopText: { flex: 1, minWidth: 0 },
  stopCaption: { color: AppTheme.tracking, fontSize: 10, fontWeight: '800', marginBottom: 2 },
  stopName: { color: AppTheme.navy, fontSize: 14, fontWeight: '800' },
  stopAddress: { color: AppTheme.textSecondary, fontSize: 11, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderBottomWidth: 1, borderBottomColor: AppTheme.border, paddingHorizontal: 4 },
  statusCopy: { flex: 1, marginLeft: 11 },
  statusTitle: { color: AppTheme.navy, fontSize: 13, fontWeight: '800' },
  statusDetail: { color: AppTheme.textSecondary, fontSize: 11, marginTop: 1 },
  statusValue: { color: AppTheme.textSecondary, fontSize: 11, fontWeight: '700' },
  mainAction: { marginTop: 14, minHeight: 48, borderRadius: 9, backgroundColor: AppTheme.primaryDark, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  mainActionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginLeft: 8 },
  moreMissions: { padding: 17 },
  moreTitle: { color: AppTheme.navy, fontSize: 15, fontWeight: '800', marginBottom: 10 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    backgroundColor: AppTheme.card,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.border,
  },
  driverInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: AppTheme.textSecondary,
    fontWeight: '500',
    marginTop: 3,
  },
  driverName: {
    fontSize: 24,
    fontWeight: '800',
    color: AppTheme.text,
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
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 28,
    borderRadius: AppRadius.lg,
    backgroundColor: AppTheme.card,
    borderWidth: 1,
    borderColor: AppTheme.border,
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
    paddingHorizontal: 8,
    lineHeight: 20,
  },
  refreshButton: {
    marginTop: 22,
    backgroundColor: AppTheme.primary,
    borderRadius: AppRadius.md,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  refreshButtonText: {
    color: AppTheme.card,
    fontSize: 14,
    fontWeight: '700',
  },
});

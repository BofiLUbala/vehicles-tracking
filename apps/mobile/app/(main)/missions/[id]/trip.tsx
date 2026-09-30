import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Pause, Play, RotateCcw, Route, Gauge, X } from 'lucide-react-native';
import { MissionsApi } from '../../../../src/api/missions.api';
import { Mission, SnappedTrace } from '../../../../src/types/mission.types';
import { MissionMap, MissionStop } from '../../../../src/components/MissionMap';
import { TomTomMapHandle } from '../../../../src/components/TomTomMapView';
import { TripStatsCard } from '../../../../src/components/TripStatsCard';
import { SpeedChart } from '../../../../src/components/SpeedChart';
import { SpeedLegend } from '../../../../src/components/SpeedLegend';
import { DetectedStopsList } from '../../../../src/components/DetectedStopsList';
import { LoadingView } from '../../../../src/components/LoadingView';
import { ErrorView } from '../../../../src/components/ErrorView';
import { loadMissionRawTrace } from '../../../../src/services/mission-trace';
import { GpsFilterStats, filterTrace, gpsQualityPercent } from '../../../../src/geo/gps-filter';
import { DetectedStop, TimedPoint, formatDuration, positionAt } from '../../../../src/geo/trace-analysis';
import { useTripAnalysis } from '../../../../src/hooks/useTripAnalysis';
import { AppRadius, AppTheme } from '../../../../src/theme/colors';

type TraceMode = 'speed' | 'snapped';
const REPLAY_SPEEDS = [10, 30, 60, 120];
const TICK_MS = 100;

/**
 * « Revoir le trajet » : trace nettoyée colorée par vitesse (ou recalée TomTom), statistiques,
 * courbe de vitesse, arrêts détectés avec adresse, et rejeu animé du parcours.
 */
export default function MissionTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const mapHandle = useRef<TomTomMapHandle | null>(null);

  const [mission, setMission] = useState<Mission | null>(null);
  const [trace, setTrace] = useState<TimedPoint[]>([]);
  const [gpsStats, setGpsStats] = useState<GpsFilterStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fitNonce, setFitNonce] = useState(0);

  const [mode, setMode] = useState<TraceMode>('speed');
  const [snapped, setSnapped] = useState<SnappedTrace | null>(null);
  const [snapState, setSnapState] = useState<'idle' | 'loading' | 'unavailable'>('idle');

  const [replayOn, setReplayOn] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(REPLAY_SPEEDS[1]);
  const [replayT, setReplayT] = useState(0);
  const replayTRef = useRef(0);

  const trip = useTripAnalysis(trace);
  const duration = trip.stats.durationSeconds;

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [detail, raw] = await Promise.all([MissionsApi.getMissionDetail(id), loadMissionRawTrace(id)]);
      const { fixes, stats } = filterTrace(raw.map((p) => ({ ...p, timestamp: p.recordedAt })));
      setMission(detail);
      setTrace(fixes);
      setGpsStats(stats);
      setFitNonce((n) => n + 1);
    } catch {
      setError('Impossible de charger le trajet de cette mission.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const selectMode = async (next: TraceMode) => {
    setMode(next);
    if (next !== 'snapped' || snapped || !id) return;
    setSnapState('loading');
    const result = await MissionsApi.getSnappedTrace(id);
    if (result && result.points.length > 1) {
      setSnapped(result);
      setSnapState('idle');
    } else {
      setSnapState('unavailable');
      setMode('speed');
    }
  };

  // ---------- Rejeu ----------
  const seek = useCallback((seconds: number) => {
    const t = Math.max(0, Math.min(seconds, duration));
    replayTRef.current = t;
    setReplayT(t);
    const frame = positionAt(trace, t);
    if (frame) mapHandle.current?.replayTo({ ...frame, elapsedMs: t * 1000 });
  }, [trace, duration]);

  const startReplay = (fromSeconds?: number) => {
    setReplayOn(true);
    // Laisse la carte passer en mode rejeu avant de placer le véhicule.
    requestAnimationFrame(() => seek(fromSeconds ?? (replayTRef.current >= duration ? 0 : replayTRef.current)));
  };

  const stopReplay = () => {
    setPlaying(false);
    setReplayOn(false);
    setFitNonce((n) => n + 1);
  };

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      const next = replayTRef.current + (TICK_MS / 1000) * replaySpeed;
      if (next >= duration) {
        seek(duration);
        setPlaying(false);
      } else {
        seek(next);
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [playing, replaySpeed, duration, seek]);

  const onScrub = (seconds: number) => {
    setPlaying(false);
    if (!replayOn) setReplayOn(true);
    seek(seconds);
  };

  const onPressStop = (stop: DetectedStop) => {
    setPlaying(false);
    startReplay((Date.parse(stop.startedAt) - Date.parse(trace[0].timestamp)) / 1000);
  };

  const stopIntervals = useMemo(() => {
    if (trace.length === 0) return [];
    const t0 = Date.parse(trace[0].timestamp);
    return trip.stops.map((s) => ({ startS: (Date.parse(s.startedAt) - t0) / 1000, endS: (Date.parse(s.endedAt) - t0) / 1000 }));
  }, [trip.stops, trace]);

  if (isLoading) {
    return <SafeAreaView edges={['top']} style={styles.safeArea}><LoadingView message="Chargement du trajet…" /></SafeAreaView>;
  }
  if (error || !mission) {
    return <SafeAreaView edges={['top']} style={styles.safeArea}><ErrorView message={error || 'Mission introuvable.'} onRetry={load} /></SafeAreaView>;
  }

  const sortedSteps = [...mission.steps].sort((a, b) => a.order - b.order);
  const mapStops: MissionStop[] = sortedSteps.map((step) => ({
    id: step.id,
    name: step.location.name,
    latitude: step.location.latitude,
    longitude: step.location.longitude,
    order: step.order,
    status: step.status === 'VALIDATED' ? 'VALIDATED' : 'PENDING',
    actionType: step.actionType,
  }));
  const currentStepIndex = sortedSteps.findIndex((s) => s.status !== 'VALIDATED');
  const hasTrace = trace.length > 1;
  const clock = trace.length > 0 ? new Date(Date.parse(trace[0].timestamp) + replayT * 1000) : null;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Retour" onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={21} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Trajet de la mission</Text>
          <Text style={styles.headerSub}>#{mission.id.slice(0, 8).toUpperCase()} · {mission.vehiclePlateNumber || 'Véhicule'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <MissionMap
          height={Math.max(280, Math.min(screenHeight * 0.45, 420))}
          currentGps={null}
          trace={trace}
          traceSegments={mode === 'speed' ? trip.mapSegments : undefined}
          snappedTrace={mode === 'snapped' ? snapped?.points : undefined}
          pauses={trip.mapPauses}
          stops={mapStops}
          currentStepIndex={currentStepIndex >= 0 ? currentStepIndex : sortedSteps.length}
          replay={replayOn}
          fitNonce={fitNonce}
          initialFollow={false}
          mapHandleRef={mapHandle}
          overlay={mode === 'speed' && hasTrace ? <SpeedLegend /> : undefined}
        />

        <View style={styles.sheet}>
          {!hasTrace ? (
            <Text style={styles.emptyText}>Aucune position GPS exploitable n’a été enregistrée pour cette mission.</Text>
          ) : (
            <>
              <View style={styles.segmented} accessibilityRole="tablist">
                <TouchableOpacity style={[styles.segment, mode === 'speed' && styles.segmentOn]} onPress={() => selectMode('speed')} accessibilityRole="tab" accessibilityState={{ selected: mode === 'speed' }}>
                  <Gauge size={15} color={mode === 'speed' ? '#FFFFFF' : AppTheme.navy} />
                  <Text style={[styles.segmentText, mode === 'speed' && styles.segmentTextOn]}>Vitesse</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.segment, mode === 'snapped' && styles.segmentOn]} onPress={() => selectMode('snapped')} accessibilityRole="tab" accessibilityState={{ selected: mode === 'snapped' }}>
                  <Route size={15} color={mode === 'snapped' ? '#FFFFFF' : AppTheme.navy} />
                  <Text style={[styles.segmentText, mode === 'snapped' && styles.segmentTextOn]}>
                    {snapState === 'loading' ? 'Recalage…' : 'Recalée sur la route'}
                  </Text>
                </TouchableOpacity>
              </View>
              {snapState === 'unavailable' && <Text style={styles.note}>Recalage TomTom indisponible (hors ligne ou service non configuré).</Text>}
              {mode === 'snapped' && snapped && (
                <Text style={styles.note}>
                  {snapped.inputPoints - snapped.offRoadPoints} / {snapped.inputPoints} points recalés sur une route
                </Text>
              )}

              <Text style={styles.sectionTitle}>Rejeu</Text>
              <View style={styles.replayBar}>
                <TouchableOpacity
                  style={styles.playBtn}
                  onPress={() => {
                    if (playing) { setPlaying(false); return; }
                    startReplay();
                    setPlaying(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={playing ? 'Pause' : 'Lire le trajet'}
                >
                  {playing ? <Pause size={18} color="#FFFFFF" /> : <Play size={18} color="#FFFFFF" />}
                </TouchableOpacity>
                <View style={styles.replayInfo}>
                  <Text style={styles.replayClock}>{clock ? clock.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--'}</Text>
                  <Text style={styles.replayElapsed}>{formatDuration(replayT)} / {formatDuration(duration)}</Text>
                </View>
                {REPLAY_SPEEDS.map((s) => (
                  <TouchableOpacity key={s} onPress={() => setReplaySpeed(s)} style={[styles.speedChip, replaySpeed === s && styles.speedChipOn]} accessibilityRole="button" accessibilityLabel={`Vitesse de rejeu ${s} fois`}>
                    <Text style={[styles.speedChipText, replaySpeed === s && styles.speedChipTextOn]}>×{s}</Text>
                  </TouchableOpacity>
                ))}
                {replayOn && (
                  <TouchableOpacity onPress={stopReplay} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Quitter le rejeu">
                    <X size={16} color={AppTheme.navy} />
                  </TouchableOpacity>
                )}
                {!replayOn && replayT > 0 && (
                  <TouchableOpacity onPress={() => seek(0)} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Revenir au début">
                    <RotateCcw size={16} color={AppTheme.navy} />
                  </TouchableOpacity>
                )}
              </View>
              <SpeedChart
                series={trip.speedSeries}
                durationSeconds={duration}
                stops={stopIntervals}
                cursorSeconds={replayOn ? replayT : null}
                onScrub={onScrub}
              />
              <Text style={styles.hint}>Glissez sur la courbe pour vous déplacer dans le trajet.</Text>

              <Text style={styles.sectionTitle}>Résumé</Text>
              <TripStatsCard stats={trip.stats} stopsCount={trip.stops.length} gpsQuality={gpsStats ? gpsQualityPercent(gpsStats) : undefined} />
              {gpsStats && gpsStats.rejected.mocked > 0 && (
                <Text style={[styles.note, { color: AppTheme.danger }]}>
                  {gpsStats.rejected.mocked} position(s) simulée(s) écartée(s) de l’affichage.
                </Text>
              )}

              <Text style={styles.sectionTitle}>Arrêts détectés</Text>
              <DetectedStopsList stops={trip.stops} onPressStop={onPressStop} />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppTheme.navyLight },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 13, backgroundColor: AppTheme.navyLight },
  backBtn: { width: 38, height: 38, borderRadius: AppRadius.md, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, marginHorizontal: 10 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: '#BFD4F0', fontWeight: '600', marginTop: 1 },
  content: { backgroundColor: AppTheme.background, paddingBottom: 30 },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -22, paddingHorizontal: 17, paddingTop: 16, paddingBottom: 22 },
  emptyText: { color: AppTheme.textSecondary, fontSize: 13, textAlign: 'center', paddingVertical: 24 },
  segmented: { flexDirection: 'row', backgroundColor: AppTheme.subtle, borderRadius: AppRadius.md, padding: 3 },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10 },
  segmentOn: { backgroundColor: AppTheme.tracking },
  segmentText: { marginLeft: 6, fontSize: 12, fontWeight: '800', color: AppTheme.navy },
  segmentTextOn: { color: '#FFFFFF' },
  note: { fontSize: 11, color: AppTheme.textSecondary, marginTop: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: AppTheme.navy, marginTop: 16, marginBottom: 8 },
  replayBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  playBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: AppTheme.tracking, alignItems: 'center', justifyContent: 'center' },
  replayInfo: { flex: 1, marginLeft: 10 },
  replayClock: { fontSize: 15, fontWeight: '800', color: AppTheme.navy },
  replayElapsed: { fontSize: 11, color: AppTheme.textSecondary },
  speedChip: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: AppRadius.pill, marginLeft: 4, backgroundColor: AppTheme.subtle },
  speedChipOn: { backgroundColor: AppTheme.navy },
  speedChipText: { fontSize: 11, fontWeight: '800', color: AppTheme.navy },
  speedChipTextOn: { color: '#FFFFFF' },
  iconBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginLeft: 4, backgroundColor: AppTheme.subtle },
  hint: { fontSize: 11, color: AppTheme.textMuted, marginBottom: 4 },
});

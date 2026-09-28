import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppRadius, AppTheme } from '../theme/colors';
import { TripStats, formatDistance, formatDuration } from '../geo/trace-analysis';

interface Props {
  stats: TripStats;
  stopsCount: number;
  /** Part des positions GPS conservées après filtrage (%). */
  gpsQuality?: number;
  /** Version une ligne pour l'écran de mission en cours. */
  compact?: boolean;
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={[styles.value, tone ? { color: tone } : null]} numberOfLines={1}>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function TripStatsCard({ stats, stopsCount, gpsQuality, compact }: Props) {
  const qualityTone = gpsQuality == null ? undefined : gpsQuality >= 90 ? AppTheme.success : gpsQuality >= 70 ? AppTheme.warning : AppTheme.danger;
  if (compact) {
    return (
      <View style={[styles.card, styles.row]} accessibilityLabel="Statistiques du trajet">
        <Tile label="Parcouru" value={formatDistance(stats.distanceMeters)} />
        <Tile label="En route" value={formatDuration(stats.movingSeconds)} />
        <Tile label="Moy." value={`${stats.avgMovingSpeedKmh} km/h`} />
        <Tile label="Arrêts" value={String(stopsCount)} />
      </View>
    );
  }
  return (
    <View style={styles.card} accessibilityLabel="Statistiques du trajet">
      <View style={styles.row}>
        <Tile label="Distance" value={formatDistance(stats.distanceMeters)} />
        <Tile label="Durée totale" value={formatDuration(stats.durationSeconds)} />
        <Tile label="En mouvement" value={formatDuration(stats.movingSeconds)} />
      </View>
      <View style={[styles.row, styles.rowSep]}>
        <Tile label="Vitesse moy." value={`${stats.avgMovingSpeedKmh} km/h`} />
        <Tile label="Vitesse max" value={`${stats.maxSpeedKmh} km/h`} />
        <Tile label="Arrêts" value={String(stopsCount)} />
      </View>
      {gpsQuality != null && (
        <View style={[styles.row, styles.rowSep]}>
          <Tile label="Temps à l'arrêt" value={formatDuration(stats.stoppedSeconds)} />
          <Tile label="Points GPS" value={String(stats.pointCount)} />
          <Tile label="Qualité GPS" value={`${gpsQuality} %`} tone={qualityTone} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#F3F6FB', borderRadius: AppRadius.md, paddingVertical: 10, paddingHorizontal: 6, marginBottom: 10 },
  row: { flexDirection: 'row' },
  rowSep: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: AppTheme.border },
  tile: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  value: { fontSize: 15, fontWeight: '800', color: AppTheme.navy },
  label: { fontSize: 10, fontWeight: '600', color: AppTheme.textSecondary, marginTop: 2 },
});

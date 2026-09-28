import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CircleParking } from 'lucide-react-native';
import { AppRadius, AppTheme } from '../theme/colors';
import { DetectedStop, formatDuration } from '../geo/trace-analysis';
import { GeoApi } from '../api/geo.api';

interface Props {
  stops: DetectedStop[];
  /** Appui sur un arrêt (ex. centrer le rejeu dessus). */
  onPressStop?: (stop: DetectedStop) => void;
}

const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function StopRow({ stop, index, onPress }: { stop: DetectedStop; index: number; onPress?: () => void }) {
  const [address, setAddress] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    // Adresse TomTom (à la demande, mise en cache côté app et serveur) ; coordonnées sinon.
    GeoApi.reverseGeocode(stop.latitude, stop.longitude).then((r) => {
      if (!cancelled && r?.address) setAddress(r.address);
    });
    return () => { cancelled = true; };
  }, [stop.latitude, stop.longitude]);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}>
      <View style={styles.icon}><CircleParking size={18} color="#FFFFFF" /></View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          Arrêt {index + 1} · {formatDuration(stop.durationSeconds)}
        </Text>
        <Text style={styles.sub} numberOfLines={2}>
          {address ?? `${stop.latitude.toFixed(5)}, ${stop.longitude.toFixed(5)}`}
        </Text>
      </View>
      <Text style={styles.time}>{hhmm(stop.startedAt)}–{hhmm(stop.endedAt)}</Text>
    </TouchableOpacity>
  );
}

/** Arrêts détectés automatiquement sur la trace (≥ 2 min dans un rayon de 40 m). */
export function DetectedStopsList({ stops, onPressStop }: Props) {
  if (stops.length === 0) {
    return <Text style={styles.empty}>Aucun arrêt de plus de 2 minutes détecté.</Text>;
  }
  return (
    <View>
      {stops.map((s, i) => (
        <StopRow key={`${s.startedAt}-${i}`} stop={s} index={i} onPress={onPressStop ? () => onPressStop(s) : undefined} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: AppTheme.border },
  icon: { width: 30, height: 30, borderRadius: AppRadius.sm, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  text: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, fontWeight: '800', color: AppTheme.navy },
  sub: { fontSize: 11, color: AppTheme.textSecondary, marginTop: 1 },
  time: { fontSize: 11, fontWeight: '700', color: AppTheme.textSecondary, marginLeft: 8 },
  empty: { fontSize: 12, color: AppTheme.textMuted, paddingVertical: 8 },
});

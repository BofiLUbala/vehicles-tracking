import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SPEED_BANDS } from '../geo/trace-analysis';

/** Légende des couleurs de la trace (km/h), superposée à la carte. */
export function SpeedLegend() {
  return (
    <View style={styles.wrap} pointerEvents="none" accessibilityLabel="Légende des vitesses">
      {SPEED_BANDS.map((b) => (
        <View key={b.band} style={styles.item}>
          <View style={[styles.swatch, { backgroundColor: b.color }]} />
          <Text style={styles.text}>{b.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    right: 60,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  item: { flexDirection: 'row', alignItems: 'center', marginRight: 8, marginVertical: 1 },
  swatch: { width: 14, height: 4, borderRadius: 2, marginRight: 4 },
  text: { fontSize: 10, fontWeight: '700', color: '#334155' },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Crosshair } from 'lucide-react-native';
import { AppRadius, AppTheme } from '../theme/colors';

interface MapStatusOverlayProps {
  /** `true` si le suivi GPS est actif (position live). */
  active: boolean;
  label: string;
  /** Information complémentaire (précision, nb de points…). */
  meta?: string;
}

/** Chips superposée en haut de la carte : état du suivi en direct. */
export const MapStatusOverlay: React.FC<MapStatusOverlayProps> = ({ active, label, meta }) => {
  return (
    <View style={[styles.chip, active ? styles.active : styles.idle]}>
      <Crosshair size={14} color={active ? AppTheme.success : AppTheme.textMuted} />
      <Text style={[styles.label, { color: active ? AppTheme.success : AppTheme.textSecondary }]}>{label}</Text>
      {meta && <Text style={styles.meta}>{meta}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: AppRadius.pill,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0B1F33',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    maxWidth: '80%',
  },
  active: {
    borderColor: `${AppTheme.success}55`,
  },
  idle: {
    borderColor: AppTheme.border,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  meta: {
    fontSize: 11,
    fontWeight: '500',
    color: AppTheme.textMuted,
    marginLeft: 6,
  },
});
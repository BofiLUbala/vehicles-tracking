import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Satellite } from 'lucide-react-native';
import { AppRadius, AppTheme } from '../theme/colors';

interface GpsStatusPillProps {
  isTracking: boolean;
  /** Nombre de points GPS déjà captés sur le trajet. */
  traceCount?: number;
  /** Précision approximative en mètres (si connue). */
  accuracyM?: number | null;
}

/** Pastille « GPS » : verte quand le suivi de mission est actif, grise sinon. */
export const GpsStatusPill: React.FC<GpsStatusPillProps> = ({ isTracking, traceCount = 0, accuracyM }) => {
  const live = isTracking;

  return (
    <View
      style={[
        styles.pill,
        live ? styles.live : styles.idle,
      ]}
    >
      <Satellite size={13} color={live ? AppTheme.success : AppTheme.textMuted} />
      <Text style={[styles.text, { color: live ? AppTheme.success : AppTheme.textMuted }]}>
        {live ? 'GPS actif' : 'GPS inactif'}
      </Text>
      {live && (
        <Text style={styles.meta}>
          {traceCount} points
          {accuracyM != null ? ` · ±${Math.round(accuracyM)} m` : ''}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AppRadius.pill,
    borderWidth: 1,
  },
  live: {
    backgroundColor: AppTheme.successLight,
    borderColor: `${AppTheme.success}40`,
  },
  idle: {
    backgroundColor: AppTheme.subtle,
    borderColor: AppTheme.border,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  meta: {
    fontSize: 11,
    fontWeight: '600',
    color: AppTheme.textMuted,
    marginLeft: 6,
  },
});
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppRadius, AppTheme } from '../theme/colors';

interface StatusBadgeProps {
  status: string;
  /** Affiche une pastille colorée avant le libellé. */
  dot?: boolean;
  /** Pills de tailles différentes : `sm` (défaut) pour les listes, `lg` pour les écrans de détail. */
  size?: 'sm' | 'lg';
}

const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planifiée',
  ASSIGNED: 'Assignée',
  STARTED: 'Démarrée',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  DONE: 'Terminée',
  CANCELLED: 'Annulée',
  LATE: 'En retard',
  SUSPICIOUS: 'Suspecte',
  NOT_COMPLETED: 'Non terminée',
  PENDING: 'En attente',
  VALIDATED: 'Validée',
  FAILED: 'Échouée',
  SKIPPED: 'Ignorée',
  MOVING: 'En mouvement',
  ON_MISSION: 'En mission',
  STOPPED: 'À l’arrêt',
  OFFLINE: 'Hors ligne',
};

const SUCCESS = new Set(['COMPLETED', 'DONE', 'VALIDATED', 'MOVING']);
const INFO = new Set(['STARTED', 'IN_PROGRESS', 'ASSIGNED', 'ON_MISSION']);
const WARNING = new Set(['LATE', 'PENDING', 'STOPPED']);
const DANGER = new Set(['CANCELLED', 'NOT_COMPLETED', 'FAILED']);
const SUSPICIOUS = new Set(['SUSPICIOUS']);
const OFFLINE = new Set(['OFFLINE']);

function getStatusColors(s: string): { bg: string; text: string } {
  if (SUCCESS.has(s)) return { bg: AppTheme.successLight, text: AppTheme.success };
  if (INFO.has(s)) return { bg: AppTheme.infoLight, text: AppTheme.info };
  if (WARNING.has(s)) return { bg: AppTheme.warningLight, text: AppTheme.warning };
  if (DANGER.has(s)) return { bg: AppTheme.dangerLight, text: AppTheme.danger };
  if (SUSPICIOUS.has(s)) return { bg: AppTheme.suspiciousLight, text: AppTheme.suspicious };
  if (OFFLINE.has(s)) return { bg: AppTheme.subtle, text: AppTheme.textMuted };
  return { bg: AppTheme.subtle, text: AppTheme.textSecondary };
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, dot = false, size = 'sm' }) => {
  const normalized = status.toUpperCase();
  const colors = getStatusColors(normalized);
  const label = STATUS_LABELS[normalized] ?? status;

  return (
    <View style={[styles.badge, size === 'lg' && styles.badgeLg, { backgroundColor: colors.bg }]}>
      {dot && <View style={[styles.dot, { backgroundColor: colors.text }]} />}
      <Text style={[styles.text, size === 'lg' && styles.textLg, { color: colors.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: AppRadius.pill,
    alignSelf: 'flex-start',
  },
  badgeLg: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textLg: {
    fontSize: 13,
  },
});
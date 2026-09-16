import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppTheme } from '../theme/colors';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status.toUpperCase();

  const getStatusLabel = (s: string): string => {
    switch (s) {
      case 'PLANNED':
        return 'Planifiée';
      case 'ASSIGNED':
        return 'Assignée';
      case 'STARTED':
        return 'Démarrée';
      case 'IN_PROGRESS':
        return 'En cours';
      case 'COMPLETED':
      case 'DONE':
        return 'Terminée';
      case 'CANCELLED':
        return 'Annulée';
      case 'LATE':
        return 'En retard';
      case 'SUSPICIOUS':
        return 'Suspecte';
      case 'NOT_COMPLETED':
        return 'Non terminée';
      case 'PENDING':
        return 'En attente';
      case 'VALIDATED':
        return 'Validée';
      case 'FAILED':
        return 'Échouée';
      case 'SKIPPED':
        return 'Ignorée';
      default:
        return s;
    }
  };

  const getStatusColors = (s: string): { bg: string; text: string } => {
    switch (s) {
      case 'COMPLETED':
      case 'DONE':
      case 'VALIDATED':
        return { bg: AppTheme.successLight, text: AppTheme.success };
      case 'STARTED':
      case 'IN_PROGRESS':
      case 'ASSIGNED':
        return { bg: AppTheme.primaryLight, text: AppTheme.primary };
      case 'LATE':
      case 'PENDING':
        return { bg: AppTheme.warningLight, text: AppTheme.warning };
      case 'CANCELLED':
      case 'NOT_COMPLETED':
      case 'FAILED':
        return { bg: AppTheme.dangerLight, text: AppTheme.danger };
      case 'SUSPICIOUS':
        return { bg: AppTheme.suspiciousLight, text: AppTheme.suspicious };
      default:
        return { bg: '#F1F5F9', text: '#64748B' };
    }
  };

  const colors = getStatusColors(normalized);

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>
        {getStatusLabel(normalized)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

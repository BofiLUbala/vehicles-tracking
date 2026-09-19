import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { StatusBadge } from './StatusBadge';
import { AppRadius, AppShadow, AppTheme } from '../theme/colors';
import type { Mission } from '../types/mission.types';

const ACTION_LABELS: Record<string, string> = {
  COLLECT: 'Collecte',
  DROPOFF: 'Dépôt',
  WEIGH: 'Pesée',
  REFUEL: 'Ravitaillement',
  CHECKPOINT: 'Point de contrôle',
};

interface MissionCardProps {
  mission: Mission;
}

/** Carte mission du tableau de bord terrain : statut, progression et prochaine étape. */
export const MissionCard: React.FC<MissionCardProps> = ({ mission }) => {
  const router = useRouter();
  const isStarted = mission.status === 'STARTED' || mission.status === 'IN_PROGRESS';
  const isCompleted = mission.status === 'COMPLETED';

  const completedCount = mission.steps.filter((s) => s.status === 'VALIDATED').length;
  const totalSteps = mission.steps.length;
  const pct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const nextStep = mission.steps[completedCount];

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push(isStarted ? `/(main)/missions/${mission.id}/progress` : `/(main)/missions/${mission.id}`)}
      style={[styles.card, isStarted && styles.activeCard]}
    >
      <View style={styles.header}>
        <View style={styles.titleWrapper}>
          <Text style={styles.number}>Mission #{mission.id.substring(0, 8).toUpperCase()}</Text>
          {mission.vehiclePlateNumber && <Text style={styles.plate}>{mission.vehiclePlateNumber}</Text>}
        </View>
        <StatusBadge status={mission.status} dot />
      </View>

      <View style={styles.progressRow}>
        <Text style={styles.stepsCount}>
          {completedCount} / {totalSteps} étape(s)
        </Text>
        <Text style={styles.pct}>{pct}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(pct, totalSteps > 0 ? 4 : 0)}%` }]} />
      </View>

      {nextStep && !isCompleted && (
        <View style={styles.nextStep}>
          <Text style={styles.nextLabel}>Prochaine étape</Text>
          <Text style={styles.nextAction}>
            {ACTION_LABELS[nextStep.actionType] ?? nextStep.actionType}
            {' · '}
            <Text style={styles.nextLocation}>{nextStep.location.name}</Text>
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.action}>
          {isCompleted ? 'Voir le résumé' : isStarted ? 'Continuer la mission' : 'Détails de la mission'}
        </Text>
        <ChevronRight size={18} color={isStarted ? AppTheme.tracking : AppTheme.primary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppTheme.card,
    borderRadius: AppRadius.xl,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: AppTheme.border,
    ...AppShadow.card,
  },
  activeCard: {
    borderColor: AppTheme.tracking,
    borderWidth: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  titleWrapper: {
    flex: 1,
    marginRight: 10,
  },
  number: {
    fontSize: 16,
    fontWeight: '800',
    color: AppTheme.text,
  },
  plate: {
    fontSize: 13,
    fontWeight: '600',
    color: AppTheme.textSecondary,
    marginTop: 2,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stepsCount: {
    fontSize: 13,
    fontWeight: '600',
    color: AppTheme.textSecondary,
  },
  pct: {
    fontSize: 13,
    fontWeight: '800',
    color: AppTheme.text,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: AppTheme.subtle,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: AppTheme.success,
  },
  nextStep: {
    backgroundColor: AppTheme.subtle,
    padding: 12,
    borderRadius: AppRadius.md,
    marginBottom: 12,
  },
  nextLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: AppTheme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  nextAction: {
    fontSize: 14,
    fontWeight: '700',
    color: AppTheme.text,
  },
  nextLocation: {
    fontWeight: '600',
    color: AppTheme.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: AppTheme.border,
    paddingTop: 12,
  },
  action: {
    fontSize: 14,
    fontWeight: '700',
    color: AppTheme.primary,
    marginRight: 4,
  },
});
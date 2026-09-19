import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check, MapPin, Package } from 'lucide-react-native';
import { StatusBadge } from './StatusBadge';
import { AppRadius, AppTheme } from '../theme/colors';
import type { MissionStep } from '../types/mission.types';

const ACTION_LABELS: Record<string, string> = {
  COLLECT: 'Collecte',
  DROPOFF: 'Dépôt',
  WEIGH: 'Pesée',
  REFUEL: 'Ravitaillement',
  CHECKPOINT: 'Point de contrôle',
};

interface MissionStepCardProps {
  step: MissionStep;
  index: number;
  isCurrent: boolean;
}

/** Élément de la timeline du parcours mission : numéro, lieu et statut. */
export const MissionStepCard: React.FC<MissionStepCardProps> = ({ step, index, isCurrent }) => {
  const isDone = step.status === 'VALIDATED';

  return (
    <View style={[styles.item, isDone && styles.itemDone, isCurrent && styles.itemCurrent]}>
      <View style={[styles.order, isDone ? styles.orderDone : isCurrent ? styles.orderCurrent : null]}>
        {isDone ? <Check size={14} color="#FFFFFF" /> : <Text style={styles.orderText}>{index + 1}</Text>}
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {step.location.name}
          </Text>
          <StatusBadge status={step.status} />
        </View>
        <View style={styles.metaRow}>
          <Package size={12} color={AppTheme.textMuted} />
          <Text style={styles.action}>{ACTION_LABELS[step.actionType] ?? step.actionType}</Text>
          <View style={styles.radiusDot} />
          <MapPin size={12} color={AppTheme.textMuted} />
          <Text style={styles.radius}>Rayon {step.location.allowedRadius} m</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.card,
    padding: 14,
    borderRadius: AppRadius.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  itemDone: {
    backgroundColor: AppTheme.subtle,
    opacity: 0.8,
  },
  itemCurrent: {
    borderColor: AppTheme.tracking,
    borderWidth: 1.5,
  },
  order: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AppTheme.subtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orderDone: {
    backgroundColor: AppTheme.success,
  },
  orderCurrent: {
    backgroundColor: AppTheme.tracking,
  },
  orderText: {
    fontSize: 12,
    fontWeight: '800',
    color: AppTheme.text,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: AppTheme.text,
    marginRight: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  action: {
    fontSize: 12,
    color: AppTheme.textSecondary,
    fontWeight: '600',
    marginLeft: 4,
  },
  radiusDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: AppTheme.textMuted,
    marginHorizontal: 8,
  },
  radius: {
    fontSize: 12,
    color: AppTheme.textMuted,
    fontWeight: '500',
    marginLeft: 4,
  },
});
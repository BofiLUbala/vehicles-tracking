import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RefreshCw, WifiOff, CheckCircle2, Clock } from 'lucide-react-native';
import { AppRadius, AppTheme } from '../theme/colors';

type SyncState = 'online' | 'syncing' | 'offline' | 'pending';

interface SyncStatusPillProps {
  state: SyncState;
  pendingCount?: number;
  lastSyncAt?: string | null;
}

function stateConfig(s: SyncState, pending: number) {
  if (s === 'syncing')
    return { icon: RefreshCw, bg: AppTheme.infoLight, color: AppTheme.info, label: 'Synchronisation…' };
  if (s === 'offline')
    return { icon: WifiOff, bg: AppTheme.dangerLight, color: AppTheme.danger, label: `Hors ligne${pending ? ` (${pending})` : ''}` };
  if (pending > 0)
    return { icon: Clock, bg: AppTheme.warningLight, color: AppTheme.warning, label: `${pending} en attente` };
  return { icon: CheckCircle2, bg: AppTheme.successLight, color: AppTheme.success, label: 'Synchronisé' };
}

export const SyncStatusPill: React.FC<SyncStatusPillProps> = ({ state, pendingCount = 0, lastSyncAt }) => {
  const config = stateConfig(state, pendingCount);
  const Icon = config.icon;

  return (
    <View style={[styles.pill, { backgroundColor: config.bg, borderColor: `${config.color}30` }]}>
      <Icon size={13} color={config.color} />
      <Text style={[styles.label, { color: config.color }]} numberOfLines={1}>{config.label}</Text>
      {lastSyncAt && state !== 'syncing' && (
        <Text style={styles.meta}>
          MAJ {new Date(lastSyncAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
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
    flexShrink: 1,
    maxWidth: '50%',
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
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSync } from '../context/SyncContext';
import { AppTheme } from '../theme/colors';
import { useRouter } from 'expo-router';

export const ConnectivityPill: React.FC = () => {
  const { isConnected, isSyncing, counts } = useSync();
  const router = useRouter();

  if (isConnected && counts.total === 0 && !isSyncing) {
    return null;
  }

  const getPillData = () => {
    if (!isConnected) {
      return {
        text: `Hors ligne (${counts.total} en attente)`,
        bg: AppTheme.dangerLight,
        color: AppTheme.danger,
      };
    }
    if (isSyncing) {
      return {
        text: 'Synchronisation en cours…',
        bg: AppTheme.primaryLight,
        color: AppTheme.primary,
      };
    }
    return {
      text: `${counts.total} élément(s) à synchroniser`,
      bg: AppTheme.warningLight,
      color: AppTheme.warning,
    };
  };

  const data = getPillData();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push('/(main)/sync')}
      style={[styles.pill, { backgroundColor: data.bg }]}
    >
      <View style={[styles.dot, { backgroundColor: data.color }]} />
      <Text style={[styles.text, { color: data.color }]}>{data.text}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 6,
    alignSelf: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { AppTheme } from '../theme/colors';

interface LoadingViewProps {
  message?: string;
}

export const LoadingView: React.FC<LoadingViewProps> = ({
  message = 'Chargement…',
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={AppTheme.primary} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    color: AppTheme.textSecondary,
    textAlign: 'center',
  },
});

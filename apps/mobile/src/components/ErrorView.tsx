import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { AppRadius, AppShadow, AppTheme } from '../theme/colors';
import { BigButton } from './BigButton';

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorView: React.FC<ErrorViewProps> = ({
  message = 'Une erreur est survenue.',
  onRetry,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.icon}>
          <AlertTriangle size={24} color={AppTheme.danger} />
        </View>
        <Text style={styles.title}>Oups !</Text>
        <Text style={styles.message}>{message}</Text>
        {onRetry && (
          <BigButton
            label="Réessayer"
            variant="outline"
            onPressed={onRetry}
            style={styles.button}
          />
        )}
      </View>
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
  card: {
    backgroundColor: AppTheme.card,
    borderRadius: AppRadius.xl,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${AppTheme.danger}22`,
    ...AppShadow.card,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: AppRadius.md,
    backgroundColor: AppTheme.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: AppTheme.text,
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    color: AppTheme.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  button: {
    width: '100%',
  },
});
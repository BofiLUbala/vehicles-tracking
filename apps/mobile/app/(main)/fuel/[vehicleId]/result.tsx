import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BigButton } from '../../../../src/components/BigButton';
import { frenchMessageForFuelErrorCode } from '../../../../src/utils/error-messages';
import { AppTheme } from '../../../../src/theme/colors';

export default function FuelResultScreen() {
  const {
    success,
    queued,
    errorCode,
    message,
    anomaliesCount,
  } = useLocalSearchParams<{
    success?: string;
    queued?: string;
    errorCode?: string;
    message?: string;
    anomaliesCount?: string;
  }>();

  const router = useRouter();

  const isSuccess = success === 'true';
  const isQueued = queued === 'true';
  const hasAnomalies = Number(anomaliesCount) > 0;

  const displayMessage = isSuccess
    ? hasAnomalies
      ? 'Déclaration enregistrée. Des avertissements de consommation ont été transmis au superviseur.'
      : 'Votre déclaration de carburant a été transmise et validée avec succès.'
    : isQueued
    ? "Pas de réseau : la déclaration et les photos sont enregistrées sur l'appareil et seront envoyées automatiquement dès le retour de la connexion."
    : frenchMessageForFuelErrorCode(errorCode, message);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.resultCard}>
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: isSuccess
                  ? hasAnomalies
                    ? AppTheme.warningLight
                    : AppTheme.successLight
                  : isQueued
                  ? AppTheme.primaryLight
                  : AppTheme.dangerLight,
              },
            ]}
          >
            <Text style={styles.resultIcon}>
              {isSuccess ? (hasAnomalies ? '⚠️' : '✓') : isQueued ? '☁' : '✕'}
            </Text>
          </View>

          <Text style={styles.resultTitle}>
            {isSuccess
              ? 'Déclaration enregistrée'
              : isQueued
              ? 'Enregistré hors-ligne'
              : 'Déclaration refusée'}
          </Text>

          <Text style={styles.resultDesc}>{displayMessage}</Text>
        </View>

        <View style={styles.actions}>
          <BigButton
            label="Retour aux missions"
            onPressed={() => router.replace('/(main)/missions')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  resultCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  resultIcon: {
    fontSize: 44,
    fontWeight: '900',
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: AppTheme.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  resultDesc: {
    fontSize: 15,
    color: AppTheme.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  actions: {
    paddingBottom: 16,
  },
});

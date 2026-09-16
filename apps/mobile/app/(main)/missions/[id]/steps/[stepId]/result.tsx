import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BigButton } from '../../../../../../src/components/BigButton';
import { frenchMessageForErrorCode } from '../../../../../../src/utils/error-messages';
import { AppTheme } from '../../../../../../src/theme/colors';

export default function ValidationResultScreen() {
  const {
    id: missionId,
    stepId,
    success,
    queued,
    errorCode,
    message,
  } = useLocalSearchParams<{
    id: string;
    stepId: string;
    success?: string;
    queued?: string;
    errorCode?: string;
    message?: string;
  }>();

  const router = useRouter();

  const isSuccess = success === 'true';
  const isQueued = queued === 'true';

  const displayMessage = isSuccess
    ? 'Étape validée avec succès.'
    : isQueued
    ? "Pas de réseau : la validation a été enregistrée sur l'appareil et sera envoyée automatiquement dès que la connexion revient."
    : frenchMessageForErrorCode(errorCode, message);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.resultCard}>
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: isSuccess
                  ? AppTheme.successLight
                  : isQueued
                  ? AppTheme.primaryLight
                  : AppTheme.dangerLight,
              },
            ]}
          >
            <Text style={styles.resultIcon}>
              {isSuccess ? '✓' : isQueued ? '☁' : '✕'}
            </Text>
          </View>

          <Text style={styles.resultTitle}>
            {isSuccess
              ? 'Validation réussie'
              : isQueued
              ? 'En attente de connexion'
              : 'Validation refusée'}
          </Text>

          <Text style={styles.resultDesc}>{displayMessage}</Text>
        </View>

        <View style={styles.actions}>
          {isSuccess || isQueued ? (
            <BigButton
              label="Retour à la mission"
              onPressed={() => router.replace(`/(main)/missions/${missionId}/progress`)}
            />
          ) : (
            <>
              <BigButton
                label="Réessayer cette étape"
                onPressed={() =>
                  router.replace(`/(main)/missions/${missionId}/steps/${stepId}/scan`)
                }
                style={styles.retryBtn}
              />
              <BigButton
                label="Retour à la mission"
                variant="outline"
                onPressed={() => router.replace(`/(main)/missions/${missionId}/progress`)}
              />
            </>
          )}
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
  retryBtn: {
    marginBottom: 12,
  },
});

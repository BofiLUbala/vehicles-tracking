import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle, CheckCircle2, CloudOff, XCircle } from 'lucide-react-native';
import { BigButton } from '../../../../src/components/BigButton';
import { frenchMessageForFuelErrorCode } from '../../../../src/utils/error-messages';
import { AppRadius, AppShadow, AppTheme } from '../../../../src/theme/colors';

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

  const iconColor = isSuccess
    ? hasAnomalies
      ? AppTheme.warning
      : AppTheme.success
    : isQueued
    ? AppTheme.primary
    : AppTheme.danger;

  const iconBg = isSuccess
    ? hasAnomalies
      ? AppTheme.warningLight
      : AppTheme.successLight
    : isQueued
    ? AppTheme.primaryLight
    : AppTheme.dangerLight;

  const ResultIcon = isSuccess
    ? hasAnomalies
      ? AlertTriangle
      : CheckCircle2
    : isQueued
    ? CloudOff
    : XCircle;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.resultCard}>
          <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
            <ResultIcon size={44} color={iconColor} strokeWidth={2.2} />
          </View>

          <View style={styles.messageCard}>
            <Text style={styles.resultTitle}>
              {isSuccess
                ? 'Déclaration enregistrée'
                : isQueued
                ? 'Enregistré hors-ligne'
                : 'Déclaration refusée'}
            </Text>

            <Text style={styles.resultDesc}>{displayMessage}</Text>
          </View>
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
    backgroundColor: AppTheme.background,
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
    paddingHorizontal: 8,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  messageCard: {
    backgroundColor: AppTheme.card,
    borderRadius: AppRadius.xl,
    borderWidth: 1,
    borderColor: AppTheme.border,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    ...AppShadow.card,
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
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { MapPin, Navigation, Fuel } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { TrackingService } from '../../../src/services/tracking.service';
import { BigButton } from '../../../src/components/BigButton';
import { AppRadius, AppShadow, AppSpacing, AppTheme } from '../../../src/theme/colors';

export default function GpsPermissionScreen() {
  const [isGranted, setIsGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkCurrent() {
      const { foregroundGranted } = await TrackingService.checkPermissions();
      if (foregroundGranted) {
        setIsGranted(true);
        router.replace('/(main)/missions');
      }
    }
    checkCurrent();
  }, [router]);

  const handleRequest = async () => {
    setIsLoading(true);
    const { foregroundGranted } = await TrackingService.requestPermissions();
    setIsLoading(false);
    if (foregroundGranted) {
      setIsGranted(true);
      router.replace('/(main)/missions');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <MapPin size={34} color={AppTheme.primary} strokeWidth={2} />
        </View>

        <Text style={styles.title}>Autorisation GPS</Text>
        <Text style={styles.subtitle}>
          Pour pouvoir démarrer et valider vos missions de collecte de déchets, l&apos;accès à votre position géographique est obligatoire.
        </Text>

        <View style={styles.card}>
          <View style={styles.bulletItem}>
            <View style={[styles.bulletChip, { backgroundColor: AppTheme.primaryLight }]}>
              <MapPin size={16} color={AppTheme.primary} strokeWidth={2} />
            </View>
            <View style={styles.bulletContent}>
              <Text style={styles.bulletTitle}>Validation des étapes</Text>
              <Text style={styles.bulletDesc}>
                Confirme que vous êtes bien présent sur le site de collecte ou de dépôt lors du scan QR.
              </Text>
            </View>
          </View>

          <View style={styles.bulletItem}>
            <View style={[styles.bulletChip, { backgroundColor: AppTheme.trackingLight }]}>
              <Navigation size={16} color={AppTheme.tracking} strokeWidth={2} />
            </View>
            <View style={styles.bulletContent}>
              <Text style={styles.bulletTitle}>Suivi en arrière-plan</Text>
              <Text style={styles.bulletDesc}>
                Enregistre l&apos;itinéraire du camion même lorsque l&apos;écran de votre téléphone est éteint.
              </Text>
            </View>
          </View>

          <View style={styles.bulletItem}>
            <View style={[styles.bulletChip, { backgroundColor: AppTheme.warningLight }]}>
              <Fuel size={16} color={AppTheme.warning} strokeWidth={2} />
            </View>
            <View style={styles.bulletContent}>
              <Text style={styles.bulletTitle}>Déclaration carburant</Text>
              <Text style={styles.bulletDesc}>
                Associe automatiquement la station-service lors de vos déclarations de plein.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <BigButton
            label={isGranted ? 'Continuer' : 'Autoriser la localisation'}
            isLoading={isLoading}
            onPressed={isGranted ? () => router.replace('/(main)/missions') : handleRequest}
            style={styles.button}
          />

          <BigButton
            label="Ignorer pour l'instant"
            variant="outline"
            onPressed={() => router.replace('/(main)/missions')}
            style={styles.skipButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  content: {
    padding: AppSpacing.xxl,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: AppRadius.pill,
    backgroundColor: AppTheme.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: AppTheme.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: AppTheme.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  card: {
    backgroundColor: AppTheme.card,
    borderRadius: AppRadius.xl,
    padding: AppSpacing.xl,
    borderWidth: 1,
    borderColor: AppTheme.border,
    marginBottom: 24,
    ...AppShadow.card,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  bulletChip: {
    width: 30,
    height: 30,
    borderRadius: AppRadius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  bulletContent: {
    flex: 1,
  },
  bulletTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: AppTheme.text,
    marginBottom: 2,
  },
  bulletDesc: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    lineHeight: 18,
  },
  footer: {
    marginTop: 'auto',
  },
  button: {
    marginBottom: 12,
  },
  skipButton: {
    borderColor: AppTheme.border,
  },
});
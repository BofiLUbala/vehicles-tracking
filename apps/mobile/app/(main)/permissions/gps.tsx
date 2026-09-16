import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { TrackingService } from '../../../src/services/tracking.service';
import { BigButton } from '../../../src/components/BigButton';
import { AppTheme } from '../../../src/theme/colors';

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
          <Text style={styles.icon}>📍</Text>
        </View>

        <Text style={styles.title}>Autorisation GPS</Text>
        <Text style={styles.subtitle}>
          Pour pouvoir démarrer et valider vos missions de collecte de déchets, l&apos;accès à votre position géographique est obligatoire.
        </Text>

        <View style={styles.card}>
          <View style={styles.bulletItem}>
            <Text style={styles.bulletCheck}>✓</Text>
            <View style={styles.bulletContent}>
              <Text style={styles.bulletTitle}>Validation des étapes</Text>
              <Text style={styles.bulletDesc}>
                Confirme que vous êtes bien présent sur le site de collecte ou de dépôt lors du scan QR.
              </Text>
            </View>
          </View>

          <View style={styles.bulletItem}>
            <Text style={styles.bulletCheck}>✓</Text>
            <View style={styles.bulletContent}>
              <Text style={styles.bulletTitle}>Suivi en arrière-plan</Text>
              <Text style={styles.bulletDesc}>
                Enregistre l&apos;itinéraire du camion même lorsque l&apos;écran de votre téléphone est éteint.
              </Text>
            </View>
          </View>

          <View style={styles.bulletItem}>
            <Text style={styles.bulletCheck}>✓</Text>
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
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: AppTheme.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  icon: {
    fontSize: 32,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  bulletCheck: {
    fontSize: 18,
    fontWeight: '800',
    color: AppTheme.success,
    marginRight: 12,
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
    borderColor: '#CBD5E1',
  },
});

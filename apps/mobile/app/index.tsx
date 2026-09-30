import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { AppRadius, AppTheme } from '../src/theme/colors';

export default function SplashScreen() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/(auth)/login');
    } else if (status === 'authenticated') {
      router.replace('/(main)/missions');
    }
  }, [status, router]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoCard}>
          <Image
            source={require('../assets/branding/logo-task-force.jpg')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="Task Force Présidentielle de salubrité et d'assainissement de la ville de Kinshasa"
          />
        </View>
        <View style={styles.accentBar} />
        <Text style={styles.appSubtitle}>Application Chauffeur</Text>
      </View>
      <ActivityIndicator size="large" color={AppTheme.surface} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.navy,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  // Le logo a un fond blanc : il est posé sur une carte blanche pour rester net sur le fond sombre.
  logoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: AppRadius.xl,
    padding: 14,
    marginBottom: 16,
  },
  logo: {
    width: 280,
    height: Math.round((280 * 468) / 1080),
  },
  appName: {
    fontSize: 26,
    fontWeight: '900',
    color: AppTheme.surface,
    letterSpacing: 2,
    marginBottom: 10,
  },
  accentBar: {
    width: 44,
    height: 4,
    borderRadius: AppRadius.pill,
    backgroundColor: AppTheme.tracking,
    marginBottom: 10,
  },
  appSubtitle: {
    fontSize: 16,
    color: AppTheme.textMuted,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  loader: {
    marginTop: 20,
  },
});
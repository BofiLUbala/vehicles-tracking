import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { AppRadius, AppTheme } from '../src/theme/colors';

export default function SplashScreen() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/(auth)/login');
    } else if (status === 'otp_requested') {
      router.replace('/(auth)/otp');
    } else if (status === 'authenticated') {
      router.replace('/(main)/missions');
    }
  }, [status, router]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.appName}>TRACKING VEHICLES</Text>
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
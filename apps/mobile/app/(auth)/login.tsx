import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { BigButton } from '../../src/components/BigButton';
import { AppTextField } from '../../src/components/AppTextField';
import { AppTheme } from '../../src/theme/colors';

export default function LoginPhoneScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const { requestOtp, isLoading, error, clearError } = useAuth();
  const router = useRouter();

  const handleRequestOtp = async () => {
    if (!phoneNumber.trim()) return;
    clearError();
    const success = await requestOtp(phoneNumber);
    if (success) {
      router.push('/(auth)/otp');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>CHAUFFEURS</Text>
            </View>
            <Text style={styles.title}>Connexion</Text>
            <Text style={styles.subtitle}>
              Entrez votre numéro de téléphone pour recevoir votre code de sécurité par WhatsApp.
            </Text>
          </View>

          <View style={styles.form}>
            <AppTextField
              label="Numéro de téléphone"
              placeholder="081 234 5678 ou +243..."
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={(text) => {
                clearError();
                setPhoneNumber(text);
              }}
              error={error}
              autoFocus
            />

            <Text style={styles.hint}>
              Format accepté : avec ou sans indicatif pays (+243). Le code OTP sera transmis instantanément.
            </Text>

            <BigButton
              label="Recevoir mon code"
              isLoading={isLoading}
              disabled={phoneNumber.trim().length < 6}
              onPressed={handleRequestOtp}
              style={styles.button}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              En cas de problème d&apos;accès, contactez le coordinateur de flotte de votre organisation.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
  },
  badge: {
    backgroundColor: AppTheme.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  badgeText: {
    color: AppTheme.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: AppTheme.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: AppTheme.textSecondary,
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  hint: {
    fontSize: 13,
    color: AppTheme.textMuted,
    lineHeight: 18,
    marginBottom: 24,
  },
  button: {
    marginTop: 8,
  },
  footer: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerText: {
    fontSize: 13,
    color: AppTheme.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});

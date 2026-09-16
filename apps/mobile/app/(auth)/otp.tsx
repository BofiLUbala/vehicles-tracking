import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { BigButton } from '../../src/components/BigButton';
import { AppTextField } from '../../src/components/AppTextField';
import { AppTheme } from '../../src/theme/colors';

export default function OtpVerificationScreen() {
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(60);
  const { phone, verifyOtp, resendOtp, isLoading, error, clearError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  const handleVerify = async () => {
    if (code.trim().length < 4) return;
    clearError();
    const success = await verifyOtp(code.trim());
    if (success) {
      router.replace('/(main)/permissions/gps');
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    clearError();
    const success = await resendOtp();
    if (success) {
      setCountdown(60);
      setCode('');
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
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>← Modifier le numéro</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Vérification du code</Text>
            <Text style={styles.subtitle}>
              Un code de validation à 6 chiffres a été envoyé par WhatsApp au{' '}
              <Text style={styles.phoneHighlight}>{phone || 'votre numéro'}</Text>.
            </Text>
          </View>

          <View style={styles.form}>
            <AppTextField
              label="Code de sécurité à 6 chiffres"
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={(text) => {
                clearError();
                setCode(text);
              }}
              error={error}
              autoFocus
              style={styles.codeInput}
            />

            <BigButton
              label="Valider et continuer"
              isLoading={isLoading}
              disabled={code.trim().length < 4}
              onPressed={handleVerify}
              style={styles.button}
            />

            <View style={styles.resendContainer}>
              {countdown > 0 ? (
                <Text style={styles.countdownText}>
                  Renvoyer un nouveau code dans {countdown}s
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={isLoading}
                  style={styles.resendButton}
                >
                  <Text style={styles.resendButtonText}>Renvoyer le code par WhatsApp</Text>
                </TouchableOpacity>
              )}
            </View>
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
  },
  header: {
    marginTop: 10,
    marginBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: AppTheme.primary,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: AppTheme.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: AppTheme.textSecondary,
    lineHeight: 22,
  },
  phoneHighlight: {
    fontWeight: '700',
    color: AppTheme.text,
  },
  form: {
    flex: 1,
  },
  codeInput: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 6,
    textAlign: 'center',
  },
  button: {
    marginTop: 12,
  },
  resendContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 14,
    color: AppTheme.textMuted,
    fontWeight: '500',
  },
  resendButton: {
    padding: 8,
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: AppTheme.primary,
  },
});

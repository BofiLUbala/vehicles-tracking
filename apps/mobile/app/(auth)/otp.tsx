import React, { useState, useEffect, useCallback } from 'react';
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
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { BigButton } from '../../src/components/BigButton';
import { AppTextField } from '../../src/components/AppTextField';
import { OtpInput } from '../../src/components/OtpInput';
import { maskPhoneNumber, maskEmail } from '../../src/utils/phone';
import { AppRadius, AppSpacing, AppTheme } from '../../src/theme/colors';

export default function OtpVerificationScreen() {
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [countdown, setCountdown] = useState(60);
  const {
    otpPurpose,
    channel,
    phone,
    email,
    identifier,
    verifySignupOtp,
    verifyPasswordReset,
    resendOtp,
    isLoading,
    error,
    clearError,
  } = useAuth();
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

  const isRecovery = otpPurpose === 'recovery';

  const handleVerify = useCallback(async (codeToVerify?: string) => {
    const targetCode = (codeToVerify ?? code).trim();
    if (targetCode.length !== 6 || isLoading) return;
    if (isRecovery && newPassword.length < 8) return;
    clearError();
    if (isRecovery) {
      const success = await verifyPasswordReset(targetCode, newPassword);
      if (success) {
        router.replace('/(auth)/login');
      }
      return;
    }
    const success = await verifySignupOtp(targetCode);
    if (success) {
      router.replace('/(main)/permissions/gps');
    }
  }, [code, newPassword, isRecovery, isLoading, clearError, verifySignupOtp, verifyPasswordReset, router]);

  const handleResend = async () => {
    if (countdown > 0 || isLoading) return;
    clearError();
    const success = await resendOtp();
    if (success) {
      setCountdown(60);
      setCode('');
    }
  };

  const isWhatsApp = channel === 'WHATSAPP';
  const displayTarget = isWhatsApp
    ? maskPhoneNumber(phone || identifier) || 'votre numéro'
    : maskEmail(email || identifier) || 'votre adresse e-mail';
  const canSubmit = code.trim().length === 6 && !isLoading && (!isRecovery || newPassword.length >= 8);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={isWhatsApp ? 'Modifier le numéro' : "Modifier l'adresse e-mail"}
            >
              <View style={styles.backButtonContent}>
                <ChevronLeft size={18} color={AppTheme.primary} strokeWidth={2.5} />
                <Text style={styles.backButtonText}>
                  {isWhatsApp ? 'Modifier le numéro' : "Modifier l'adresse e-mail"}
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.title}>
              {isRecovery ? 'Réinitialiser le mot de passe' : 'Confirmez votre compte'}
            </Text>
            <Text style={styles.subtitle}>
              {isWhatsApp ? (
                <>
                  Un code de sécurité à 6 chiffres a été envoyé par WhatsApp au{' '}
                  <Text style={styles.targetHighlight}>{displayTarget}</Text>
                  {isRecovery ? ' pour réinitialiser votre mot de passe.' : ' pour finaliser votre inscription.'}
                </>
              ) : (
                <>
                  Un code de sécurité à 6 chiffres a été envoyé par e-mail à{' '}
                  <Text style={styles.targetHighlight}>{displayTarget}</Text>
                  {isRecovery ? ' pour réinitialiser votre mot de passe.' : ' pour finaliser votre inscription.'}
                </>
              )}
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.inputLabel}>Entrez le code reçu</Text>
            <OtpInput
              length={6}
              value={code}
              onChange={(val) => {
                clearError();
                setCode(val);
              }}
              onComplete={(completedCode) => {
                handleVerify(completedCode);
              }}
              disabled={isLoading}
              hasError={!!error}
              autoFocus
            />

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : (
              <Text style={styles.hintText}>
                Code valable 5 minutes • 5 tentatives maximum
              </Text>
            )}

            {isRecovery && (
              <AppTextField
                label="Nouveau mot de passe"
                placeholder="8 caractères minimum"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                value={newPassword}
                onChangeText={(text) => {
                  clearError();
                  setNewPassword(text);
                }}
              />
            )}

            <BigButton
              label={isRecovery ? 'Réinitialiser le mot de passe' : 'Valider et continuer'}
              isLoading={isLoading}
              disabled={!canSubmit}
              onPressed={() => handleVerify()}
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
                  activeOpacity={0.7}
                >
                  <Text style={styles.resendButtonText}>
                    {isWhatsApp
                      ? 'Renvoyer le code par WhatsApp'
                      : 'Renvoyer le code par e-mail'}
                  </Text>
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
    backgroundColor: AppTheme.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: AppSpacing.xxl,
  },
  header: {
    marginTop: 10,
    marginBottom: 28,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 16,
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  targetHighlight: {
    fontWeight: '700',
    color: AppTheme.text,
  },
  form: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppTheme.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: AppTheme.dangerLight,
    borderColor: AppTheme.danger,
    borderWidth: 1,
    borderRadius: AppRadius.md,
    padding: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  errorText: {
    color: AppTheme.danger,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  hintText: {
    fontSize: 12,
    color: AppTheme.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
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
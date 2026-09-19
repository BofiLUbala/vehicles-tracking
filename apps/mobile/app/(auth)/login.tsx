import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MessageCircle, Mail } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { BigButton } from '../../src/components/BigButton';
import { AppTextField } from '../../src/components/AppTextField';
import { AppRadius, AppShadow, AppSpacing, AppTheme } from '../../src/theme/colors';
import { AuthChannel } from '../../src/types/auth.types';
import { isValidEmail, isValidPhoneNumber } from '../../src/utils/phone';

type AuthView = 'login' | 'signup' | 'recovery';

export default function LoginScreen() {
  const [view, setView] = useState<AuthView>('login');
  const [channel, setChannel] = useState<AuthChannel>('WHATSAPP');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [identifierInput, setIdentifierInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const {
    loginWithPassword,
    startSignup,
    startPasswordReset,
    isLoading,
    error,
    notice,
    clearError,
    clearNotice,
  } = useAuth();
  const router = useRouter();

  const isSignupIdentifierValid =
    channel === 'WHATSAPP'
      ? isValidPhoneNumber(phoneInput) || phoneInput.trim().length >= 8
      : isValidEmail(emailInput);

  const isLoginValid = identifierInput.trim().length >= 3 && passwordInput.length >= 1;
  const isSignupValid =
    isSignupIdentifierValid &&
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    signupPassword.length >= 8;
  const isRecoveryValid = isSignupIdentifierValid;

  const switchView = (next: AuthView) => {
    clearError();
    clearNotice();
    setPasswordInput('');
    setView(next);
  };

  const handleChannelChange = (newChannel: AuthChannel) => {
    clearError();
    setChannel(newChannel);
  };

  const handleLogin = async () => {
    if (!identifierInput.trim() || !passwordInput) return;
    clearError();
    const success = await loginWithPassword(identifierInput, passwordInput);
    if (success) {
      router.replace('/(main)/permissions/gps');
    }
  };

  const handleSignup = async () => {
    const target = channel === 'WHATSAPP' ? phoneInput : emailInput;
    if (!target.trim()) return;
    clearError();
    const success = await startSignup({
      channel,
      target,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      password: signupPassword,
    });
    if (success) {
      router.push('/(auth)/otp');
    }
  };

  const handleRecoveryRequest = async () => {
    const target = channel === 'WHATSAPP' ? phoneInput : emailInput;
    if (!target.trim()) return;
    clearError();
    const success = await startPasswordReset(channel, target);
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topSection}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>TRACKING VEHICLES</Text>
            </View>
            <Text style={styles.welcomeText}>Bienvenue</Text>

            {view !== 'recovery' && (
              <View style={styles.modeSegmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.modeSegmentOption,
                    view === 'login' && styles.modeSegmentOptionActive,
                  ]}
                  onPress={() => switchView('login')}
                  activeOpacity={0.8}
                  accessibilityRole="tab"
                  accessibilityLabel="Connexion"
                >
                  <Text
                    style={[
                      styles.modeSegmentText,
                      view === 'login' && styles.modeSegmentTextActive,
                    ]}
                  >
                    Connexion
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeSegmentOption,
                    view === 'signup' && styles.modeSegmentOptionActive,
                  ]}
                  onPress={() => switchView('signup')}
                  activeOpacity={0.8}
                  accessibilityRole="tab"
                  accessibilityLabel="Créer un compte"
                >
                  <Text
                    style={[
                      styles.modeSegmentText,
                      view === 'signup' && styles.modeSegmentTextActive,
                    ]}
                  >
                    Créer un compte
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.title}>
              {view === 'login' ? 'Connexion' : view === 'signup' ? 'Créer votre compte' : 'Mot de passe oublié'}
            </Text>
            <Text style={styles.subtitle}>
              {view === 'login'
                ? 'Connectez-vous avec votre identifiant et votre mot de passe.'
                : view === 'signup'
                  ? 'Inscrivez-vous pour rejoindre votre organisation et démarrer vos missions.'
                  : 'Recevez un code de récupération, puis définissez un nouveau mot de passe.'}
            </Text>

            {view !== 'login' && (
              <View style={styles.channelContainer}>
                <Text style={styles.channelLabel}>Méthode de vérification</Text>
                <View style={styles.segmentedControl}>
                  <TouchableOpacity
                    style={[
                      styles.segmentOption,
                      channel === 'WHATSAPP' && styles.segmentOptionActive,
                    ]}
                    onPress={() => handleChannelChange('WHATSAPP')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.segmentContent}>
                      <MessageCircle
                        size={16}
                        color={channel === 'WHATSAPP' ? AppTheme.tracking : AppTheme.textMuted}
                        strokeWidth={2}
                      />
                      <Text
                        style={[
                          styles.segmentText,
                          channel === 'WHATSAPP' && styles.segmentTextActive,
                        ]}
                      >
                        WhatsApp
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.segmentOption,
                      channel === 'EMAIL' && styles.segmentOptionActive,
                    ]}
                    onPress={() => handleChannelChange('EMAIL')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.segmentContent}>
                      <Mail
                        size={16}
                        color={channel === 'EMAIL' ? AppTheme.tracking : AppTheme.textMuted}
                        strokeWidth={2}
                      />
                      <Text
                        style={[
                          styles.segmentText,
                          channel === 'EMAIL' && styles.segmentTextActive,
                        ]}
                      >
                        E-mail
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <View style={styles.formSection}>
            {view === 'login' && (
              <>
                <AppTextField
                  label="Téléphone ou e-mail"
                  placeholder="081 234 5678 ou chauffeur@exemple.com"
                  keyboardType="default"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={identifierInput}
                  onChangeText={(text) => {
                    clearError();
                    setIdentifierInput(text);
                  }}
                  error={error}
                  autoFocus
                />
                <AppTextField
                  label="Mot de passe"
                  placeholder="Votre mot de passe"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={passwordInput}
                  onChangeText={(text) => {
                    clearError();
                    setPasswordInput(text);
                  }}
                  error={undefined}
                />
                {notice ? (
                  <View style={styles.noticeContainer}>
                    <Text style={styles.noticeText}>{notice}</Text>
                  </View>
                ) : null}
                <BigButton
                  label="Se connecter"
                  isLoading={isLoading}
                  disabled={!isLoginValid}
                  onPressed={handleLogin}
                  style={styles.submitButton}
                />
                <TouchableOpacity
                  onPress={() => switchView('recovery')}
                  style={styles.linkButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.linkText}>Mot de passe oublié ?</Text>
                </TouchableOpacity>
              </>
            )}

            {view === 'signup' && (
              <>
                <View style={styles.nameRow}>
                  <View style={styles.nameField}>
                    <AppTextField
                      label="Prénom"
                      placeholder="Gauthier"
                      value={firstName}
                      onChangeText={(text) => {
                        clearError();
                        setFirstName(text);
                      }}
                    />
                  </View>
                  <View style={styles.nameField}>
                    <AppTextField
                      label="Nom"
                      placeholder="Bofi"
                      value={lastName}
                      onChangeText={(text) => {
                        clearError();
                        setLastName(text);
                      }}
                    />
                  </View>
                </View>

                {channel === 'WHATSAPP' ? (
                  <View>
                    <AppTextField
                      label="Numéro de téléphone"
                      placeholder="081 234 5678 ou +243..."
                      keyboardType="phone-pad"
                      value={phoneInput}
                      onChangeText={(text) => {
                        clearError();
                        setPhoneInput(text);
                      }}
                      error={error}
                      autoFocus
                    />
                    <Text style={styles.hint}>
                      Format accepté : avec ou sans indicatif (+243). Le code de sécurité à 6 chiffres vous sera envoyé par WhatsApp.
                    </Text>
                  </View>
                ) : (
                  <View>
                    <AppTextField
                      label="Adresse e-mail"
                      placeholder="chauffeur@exemple.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={emailInput}
                      onChangeText={(text) => {
                        clearError();
                        setEmailInput(text);
                      }}
                      error={error}
                      autoFocus
                    />
                    <Text style={styles.hint}>
                      Un code de sécurité à 6 chiffres sera envoyé directement à votre boîte de réception e-mail.
                    </Text>
                  </View>
                )}

                <AppTextField
                  label="Mot de passe"
                  placeholder="8 caractères minimum"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={signupPassword}
                  onChangeText={(text) => {
                    clearError();
                    setSignupPassword(text);
                  }}
                  error={undefined}
                />

                <BigButton
                  label="Recevoir le code"
                  isLoading={isLoading}
                  disabled={!isSignupValid}
                  onPressed={handleSignup}
                  style={styles.submitButton}
                />
              </>
            )}

            {view === 'recovery' && (
              <>
                {channel === 'WHATSAPP' ? (
                  <AppTextField
                    label="Numéro de téléphone"
                    placeholder="081 234 5678 ou +243..."
                    keyboardType="phone-pad"
                    value={phoneInput}
                    onChangeText={(text) => {
                      clearError();
                      setPhoneInput(text);
                    }}
                    error={error}
                    autoFocus
                  />
                ) : (
                  <AppTextField
                    label="Adresse e-mail"
                    placeholder="chauffeur@exemple.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={emailInput}
                    onChangeText={(text) => {
                      clearError();
                      setEmailInput(text);
                    }}
                    error={error}
                    autoFocus
                  />
                )}
                <BigButton
                  label="Recevoir le code de récupération"
                  isLoading={isLoading}
                  disabled={!isRecoveryValid}
                  onPressed={handleRecoveryRequest}
                  style={styles.submitButton}
                />
                <TouchableOpacity
                  onPress={() => switchView('login')}
                  style={styles.linkButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.linkText}>Retour à la connexion</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.footerSection}>
            <Text style={styles.footerText}>
              {view === 'login'
                ? 'En cas de difficulté d’accès ou de compte suspendu, contactez le coordinateur de flotte de votre organisation.'
                : 'En créant votre compte, vous confirmez votre rattachement à la flotte de votre organisation.'}
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
    backgroundColor: AppTheme.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: AppSpacing.xxl,
    justifyContent: 'space-between',
  },
  topSection: {
    marginTop: 6,
    marginBottom: 20,
  },
  brandBadge: {
    backgroundColor: AppTheme.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: AppRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  brandBadgeText: {
    color: AppTheme.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppTheme.textSecondary,
    marginBottom: 12,
  },
  modeSegmentedControl: {
    flexDirection: 'row',
    backgroundColor: AppTheme.subtle,
    borderRadius: AppRadius.md,
    padding: 4,
    marginBottom: 20,
  },
  modeSegmentOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AppRadius.md,
  },
  modeSegmentOptionActive: {
    backgroundColor: AppTheme.card,
    ...AppShadow.card,
  },
  modeSegmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: AppTheme.textMuted,
  },
  modeSegmentTextActive: {
    color: AppTheme.primary,
    fontWeight: '800',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: AppTheme.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: AppTheme.textSecondary,
    lineHeight: 20,
  },
  channelContainer: {
    marginTop: 18,
  },
  channelLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: AppTheme.text,
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: AppTheme.subtle,
    borderRadius: AppRadius.md,
    padding: 4,
  },
  segmentOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AppRadius.sm,
  },
  segmentOptionActive: {
    backgroundColor: AppTheme.card,
    ...AppShadow.card,
  },
  segmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppTheme.textMuted,
  },
  segmentTextActive: {
    color: AppTheme.primary,
    fontWeight: '800',
  },
  formSection: {
    flex: 1,
    marginTop: 4,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  nameField: {
    flex: 1,
  },
  hint: {
    fontSize: 13,
    color: AppTheme.textMuted,
    lineHeight: 18,
    marginBottom: 16,
    marginTop: 4,
  },
  submitButton: {
    marginTop: 8,
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: AppTheme.primary,
  },
  noticeContainer: {
    backgroundColor: AppTheme.primaryLight,
    borderRadius: AppRadius.md,
    padding: 10,
    marginBottom: 12,
  },
  noticeText: {
    color: AppTheme.primary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  footerSection: {
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: AppTheme.border,
  },
  footerText: {
    fontSize: 12,
    color: AppTheme.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});

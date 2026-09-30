import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { BigButton } from '../../src/components/BigButton';
import { AppTextField } from '../../src/components/AppTextField';
import { AppRadius, AppSpacing, AppTheme } from '../../src/theme/colors';
import { isValidEmail } from '../../src/utils/phone';
import { AuthService } from '../../src/services/auth.service';

type AuthView = 'login' | 'recovery';

/**
 * Connexion chauffeur par identifiant + mot de passe. Il n'y a pas d'inscription ici : l'admin invite
 * le chauffeur, qui active son compte en ouvrant le lien reçu par e-mail (écran `activate`).
 */
export default function LoginScreen() {
  const [view, setView] = useState<AuthView>('login');
  const [identifierInput, setIdentifierInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [rememberCredentials, setRememberCredentials] = useState(false);
  const {
    loginWithPassword,
    requestPasswordReset,
    isLoading,
    error,
    notice,
    clearError,
    clearNotice,
  } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let active = true;
    void AuthService.getRememberedCredentials().then((saved) => {
      if (!active || !saved) return;
      setIdentifierInput(saved.identifier);
      setPasswordInput(saved.password);
      setRememberCredentials(true);
    });
    return () => { active = false; };
  }, []);

  const isLoginValid = identifierInput.trim().length >= 3 && passwordInput.length >= 1;
  const isRecoveryValid = isValidEmail(emailInput.trim());

  const switchView = (next: AuthView) => {
    clearError();
    clearNotice();
    setPasswordInput('');
    setView(next);
  };

  const handleLogin = async () => {
    if (!identifierInput.trim() || !passwordInput) return;
    clearError();
    const success = await loginWithPassword(identifierInput, passwordInput);
    if (success) {
      try {
        if (rememberCredentials) {
          await AuthService.saveRememberedCredentials({ identifier: identifierInput.trim(), password: passwordInput });
        } else {
          await AuthService.clearRememberedCredentials();
        }
      } catch {
        // La connexion reste valable si le stockage sécurisé est indisponible.
      }
      router.replace('/(main)/permissions/gps');
    }
  };

  const toggleRememberCredentials = () => {
    if (rememberCredentials) {
      void AuthService.clearRememberedCredentials().catch(() => undefined);
    }
    setRememberCredentials((value) => !value);
  };

  const handleRecoveryRequest = async () => {
    if (!emailInput.trim()) return;
    clearError();
    await requestPasswordReset(emailInput);
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
            <Image
              source={require('../../assets/branding/logo-task-force.jpg')}
              style={styles.brandLogo}
              resizeMode="contain"
              accessibilityRole="image"
              accessibilityLabel="Task Force Présidentielle de salubrité et d'assainissement de la ville de Kinshasa"
            />
            <Text style={styles.welcomeText}>Bienvenue</Text>

            <Text style={styles.title}>
              {view === 'login' ? 'Connexion' : 'Mot de passe oublié'}
            </Text>
            <Text style={styles.subtitle}>
              {view === 'login'
                ? 'Connectez-vous avec votre identifiant et votre mot de passe.'
                : 'Recevez par e-mail un lien pour choisir un nouveau mot de passe.'}
            </Text>
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
                {Platform.OS !== 'web' && <TouchableOpacity
                  style={styles.rememberRow}
                  onPress={toggleRememberCredentials}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: rememberCredentials }}
                  accessibilityLabel="Se souvenir de moi sur cet appareil"
                >
                  <View style={[styles.rememberBox, rememberCredentials && styles.rememberBoxChecked]}>
                    {rememberCredentials && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                  <Text style={styles.rememberText}>Se souvenir de moi sur cet appareil</Text>
                </TouchableOpacity>}
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

                <View style={styles.inviteHint}>
                  <Mail size={18} color={AppTheme.tracking} strokeWidth={2} />
                  <Text style={styles.inviteHintText}>
                    Première connexion ? Ouvrez sur ce téléphone le lien « Activer mon compte » reçu par e-mail
                    pour choisir votre mot de passe.
                  </Text>
                </View>
              </>
            )}

            {view === 'recovery' && (
              <>
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
                {notice ? (
                  <View style={styles.noticeContainer}>
                    <Text style={styles.noticeText}>{notice}</Text>
                  </View>
                ) : null}
                <BigButton
                  label="Recevoir le lien par e-mail"
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
              En cas de difficulté d’accès ou de compte suspendu, contactez le coordinateur de flotte de votre organisation.
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
  // Logo Task Force (1080x468) : hauteur déduite du ratio pour ne jamais déformer l'emblème.
  brandLogo: {
    width: 260,
    height: Math.round((260 * 468) / 1080),
    alignSelf: 'flex-start',
    marginBottom: 12,
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
  formSection: {
    flex: 1,
    marginTop: 4,
  },
  submitButton: {
    marginTop: 8,
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginBottom: 4 },
  rememberBox: { width: 21, height: 21, borderRadius: 5, borderWidth: 1.5, borderColor: AppTheme.textMuted, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  rememberBoxChecked: { backgroundColor: AppTheme.tracking, borderColor: AppTheme.tracking },
  rememberText: { color: AppTheme.textSecondary, fontSize: 13, fontWeight: '600', flex: 1 },
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
  inviteHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 20,
    padding: 12,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    borderColor: AppTheme.border,
    backgroundColor: AppTheme.surface,
  },
  inviteHintText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: AppTheme.textMuted,
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

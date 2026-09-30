import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { BigButton } from '../../src/components/BigButton';
import { AppTextField } from '../../src/components/AppTextField';
import { AppRadius, AppSpacing, AppTheme } from '../../src/theme/colors';

/**
 * Nouveau mot de passe chauffeur. Ouvert par le lien « Choisir un nouveau mot de passe » de l'e-mail
 * de récupération (https://track…/reset-password?token=… via Android App Links). Aucun code à saisir.
 */
export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = (Array.isArray(params.token) ? params.token[0] : params.token)?.trim() ?? '';
  const router = useRouter();
  const { status, confirmPasswordReset, logout, isLoading, error, clearError } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const mismatch = confirmation.length > 0 && confirmation !== password;
  const canSubmit = password.length >= 8 && confirmation === password && !isLoading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    clearError();
    // Les sessions ouvertes sont fermées par le backend : on quitte proprement la session locale.
    if (status === 'authenticated') await logout();
    const success = await confirmPasswordReset(token, password);
    if (success) {
      router.replace('/(auth)/login');
    }
  };

  const goToLogin = () => {
    clearError();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Image
            source={require('../../assets/branding/logo-task-force.jpg')}
            style={styles.brandLogo}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="Task Force Présidentielle de salubrité et d'assainissement de la ville de Kinshasa"
          />
          {!token ? (
            <>
              <Text style={styles.title}>Lien non valide</Text>
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                  Ce lien est incomplet. Ouvrez à nouveau le lien reçu par e-mail, ou demandez-en un nouveau
                  depuis « Mot de passe oublié ».
                </Text>
              </View>
              <BigButton label="Aller à la connexion" onPressed={goToLogin} style={styles.button} />
            </>
          ) : (
            <>
              <Text style={styles.title}>Nouveau mot de passe</Text>
              <Text style={styles.subtitle}>
                Choisissez votre nouveau mot de passe. Vous vous connecterez ensuite avec celui-ci.
              </Text>
              <AppTextField
                label="Nouveau mot de passe"
                placeholder="8 caractères minimum"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={(text) => {
                  clearError();
                  setPassword(text);
                }}
                autoFocus
              />
              <AppTextField
                label="Confirmer le mot de passe"
                placeholder="Saisissez-le une seconde fois"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                value={confirmation}
                onChangeText={(text) => {
                  clearError();
                  setConfirmation(text);
                }}
                error={mismatch ? 'Les deux mots de passe ne correspondent pas.' : error}
              />
              <BigButton
                label="Enregistrer le mot de passe"
                isLoading={isLoading}
                disabled={!canSubmit}
                onPressed={handleSubmit}
                style={styles.button}
              />
            </>
          )}
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
  // Logo Task Force (1080x468) : hauteur déduite du ratio pour ne jamais déformer l'emblème.
  brandLogo: {
    width: 260,
    height: Math.round((260 * 468) / 1080),
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: AppTheme.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: AppTheme.textSecondary,
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: AppTheme.dangerLight,
    borderRadius: AppRadius.md,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  errorText: {
    color: AppTheme.danger,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  button: {
    marginTop: 12,
  },
});

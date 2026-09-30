import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { BigButton } from '../../src/components/BigButton';
import { AppTextField } from '../../src/components/AppTextField';
import { AppRadius, AppSpacing, AppTheme } from '../../src/theme/colors';
import { DriverInvitation } from '../../src/types/auth.types';

/**
 * Activation du compte chauffeur. Ouvert par le lien « Activer mon compte » de l'e-mail
 * d'invitation (https://track…/activate?token=… via Android App Links, ou trackingvehicles://activate).
 * Le lien prouve la propriété de l'adresse e-mail : le chauffeur n'a plus qu'à choisir son mot de passe.
 */
export default function ActivateScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = (Array.isArray(params.token) ? params.token[0] : params.token)?.trim() ?? '';
  const router = useRouter();
  const { status, loadInvitation, activateInvitation, logout, isLoading, error, clearError } = useAuth();
  const [invitation, setInvitation] = useState<DriverInvitation | null>(null);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  useEffect(() => {
    let active = true;
    if (!token) {
      setChecked(true);
      return;
    }
    void loadInvitation(token).then((result) => {
      if (!active) return;
      setInvitation(result);
      setChecked(true);
    });
    return () => {
      active = false;
    };
    // loadInvitation change à chaque rendu du contexte : on ne relit l'invitation que si le jeton change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const mismatch = confirmation.length > 0 && confirmation !== password;
  const canSubmit = password.length >= 8 && confirmation === password && !isLoading;

  const handleActivate = async () => {
    if (!canSubmit) return;
    clearError();
    // Un autre chauffeur est connecté sur ce téléphone : on ferme sa session avant d'ouvrir la nouvelle.
    if (status === 'authenticated') await logout();
    const success = await activateInvitation(token, password);
    if (success) {
      router.replace('/(main)/permissions/gps');
    }
  };

  const goToLogin = () => {
    clearError();
    router.replace('/(auth)/login');
  };

  let content: React.ReactNode;
  if (!checked) {
    content = (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={AppTheme.primary} />
        <Text style={styles.subtitle}>Vérification du lien d’activation…</Text>
      </View>
    );
  } else if (!invitation) {
    content = (
      <>
        <Text style={styles.title}>Lien non valide</Text>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error || 'Ce lien d’activation est incomplet. Ouvrez à nouveau le lien reçu par e-mail.'}
          </Text>
        </View>
        <BigButton label="Aller à la connexion" onPressed={goToLogin} style={styles.button} />
      </>
    );
  } else {
    content = (
      <>
        <Text style={styles.title}>Bonjour {invitation.firstName}</Text>
        <Text style={styles.subtitle}>
          Choisissez votre mot de passe pour activer votre compte chauffeur. Vous vous connecterez ensuite avec
          {invitation.email ? ` ${invitation.email}` : ' votre adresse e-mail'}
          {invitation.phone ? ` ou ${invitation.phone}` : ''}.
        </Text>
        <AppTextField
          label="Mot de passe"
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
          label="Activer mon compte"
          isLoading={isLoading}
          disabled={!canSubmit}
          onPressed={handleActivate}
          style={styles.button}
        />
      </>
    );
  }

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
          {content}
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
  centered: {
    alignItems: 'center',
    gap: 16,
    marginTop: 40,
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

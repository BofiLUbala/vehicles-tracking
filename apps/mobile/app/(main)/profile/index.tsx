import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { ArrowLeft, BadgeCheck, Building2, CreditCard, LogOut, Package, Phone, UserRound } from 'lucide-react-native';
import { useAuth } from '../../../src/context/AuthContext';
import { AuthApi } from '../../../src/api/auth.api';
import { Driver } from '../../../src/types/auth.types';
import { BigButton } from '../../../src/components/BigButton';
import { AppRadius, AppShadow, AppSpacing, AppTheme } from '../../../src/theme/colors';

const APP_VERSION = Constants.expoConfig?.version ?? '0.1.0';

export default function ProfileScreen() {
  const { driver, logout } = useAuth();
  const [profile, setProfile] = useState<Driver | null>(driver);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setProfile(driver);
  }, [driver]);

  useEffect(() => {
    // Rafraîchit le profil pour récupérer les champs absents de la réponse de connexion
    // (nom d'organisation, numéro de permis).
    let cancelled = false;
    AuthApi.getProfile()
      .then((fresh) => {
        if (!cancelled) setProfile(fresh);
      })
      .catch(() => {
        // Conserve le profil déjà connu en cas d'échec réseau.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={AppTheme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil Chauffeur</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar and name banner */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.firstName?.[0] || 'C'}
              {profile?.lastName?.[0] || 'H'}
            </Text>
          </View>
          <Text style={styles.driverName}>
            {profile?.firstName} {profile?.lastName}
          </Text>
          <View style={styles.roleRow}>
            <UserRound size={14} color={AppTheme.textSecondary} />
            <Text style={styles.driverRole}>{profile ? 'Chauffeur de collecte' : '—'}</Text>
          </View>
        </View>

        {/* Profile info card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Coordonnées & Documents</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Phone size={16} color={AppTheme.info} />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.infoLabel}>Téléphone WhatsApp</Text>
              <Text style={styles.infoValue}>{profile?.phone || 'Non renseigné'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <BadgeCheck size={16} color={AppTheme.primary} />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.infoLabel}>Numéro de permis</Text>
              <Text style={styles.infoValue}>{profile?.licenseNumber || 'Non renseigné'}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <View style={styles.infoIconWrap}>
              <CreditCard size={16} color={AppTheme.success} />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.infoLabel}>Statut du compte</Text>
              <Text style={[styles.infoValue, { color: AppTheme.success }]}>
                {profile?.status === 'ACTIVE' ? 'Actif' : profile?.status || 'Inconnu'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Application</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Package size={16} color={AppTheme.textMuted} />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>v{APP_VERSION} (Expo React Native)</Text>
            </View>
          </View>

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <View style={styles.infoIconWrap}>
              <Building2 size={16} color={AppTheme.textMuted} />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.infoLabel}>Organisation</Text>
              <Text style={styles.infoValue}>{profile?.organizationName || 'Non renseignée'}</Text>
            </View>
          </View>
        </View>

        <BigButton
          label="Se déconnecter"
          variant="danger"
          icon={<LogOut size={20} color="#FFFFFF" />}
          isLoading={isLoggingOut}
          onPressed={handleLogout}
          style={styles.logoutBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.md,
    backgroundColor: AppTheme.card,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: AppRadius.pill,
    backgroundColor: AppTheme.subtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: AppTheme.text,
  },
  content: {
    padding: AppSpacing.xl,
    paddingBottom: 40,
  },
  profileHeaderCard: {
    backgroundColor: AppTheme.card,
    borderRadius: AppRadius.xl,
    padding: AppSpacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppTheme.border,
    marginBottom: AppSpacing.lg,
    ...AppShadow.card,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: AppTheme.navy,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: AppSpacing.md,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  driverName: {
    fontSize: 22,
    fontWeight: '800',
    color: AppTheme.text,
    marginBottom: AppSpacing.xs,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  driverRole: {
    fontSize: 14,
    color: AppTheme.textSecondary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: AppTheme.card,
    borderRadius: AppRadius.xl,
    padding: AppSpacing.lg,
    borderWidth: 1,
    borderColor: AppTheme.border,
    marginBottom: AppSpacing.lg,
    ...AppShadow.card,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: AppTheme.text,
    marginBottom: AppSpacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: AppSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.subtle,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: AppRadius.sm,
    backgroundColor: AppTheme.subtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: AppSpacing.md,
  },
  infoBody: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: AppTheme.text,
  },
  logoutBtn: {
    marginTop: AppSpacing.xs,
  },
});
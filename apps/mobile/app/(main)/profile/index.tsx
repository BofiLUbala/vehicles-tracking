import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { BigButton } from '../../../src/components/BigButton';
import { AppTheme } from '../../../src/theme/colors';

export default function ProfileScreen() {
  const { driver, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil Chauffeur</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar and name banner */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {driver?.firstName?.[0] || 'C'}
              {driver?.lastName?.[0] || 'H'}
            </Text>
          </View>
          <Text style={styles.driverName}>
            {driver?.firstName} {driver?.lastName}
          </Text>
          <Text style={styles.driverRole}>Chauffeur de collecte</Text>
        </View>

        {/* Profile info card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Coordonnées & Documents</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Téléphone WhatsApp</Text>
            <Text style={styles.infoValue}>{driver?.phone || 'Non renseigné'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Numéro de permis</Text>
            <Text style={styles.infoValue}>{driver?.licenseNumber || 'Non renseigné'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Statut du compte</Text>
            <Text style={[styles.infoValue, { color: AppTheme.success }]}>
              {driver?.status === 'ACTIVE' ? 'Actif' : driver?.status || 'Inconnu'}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Application</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>v0.1.0 (Expo React Native)</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Organisation</Text>
            <Text style={styles.infoValue}>Kinshasa Waste Logistics</Text>
          </View>
        </View>

        <BigButton
          label="Se déconnecter"
          variant="danger"
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: AppTheme.primary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: AppTheme.text,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: AppTheme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  driverName: {
    fontSize: 22,
    fontWeight: '800',
    color: AppTheme.text,
    marginBottom: 4,
  },
  driverRole: {
    fontSize: 14,
    color: AppTheme.textSecondary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: AppTheme.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 14,
    color: AppTheme.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: AppTheme.text,
  },
  logoutBtn: {
    marginTop: 12,
  },
});

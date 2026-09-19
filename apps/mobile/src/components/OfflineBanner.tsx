import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CloudOff } from 'lucide-react-native';
import { AppRadius, AppTheme } from '../theme/colors';

interface OfflineBannerProps {
  pendingCount?: number;
}

/** Bandeau hors-ligne : vos actions sont conservées sur l'appareil et envoyées au retour du réseau. */
export const OfflineBanner: React.FC<OfflineBannerProps> = ({ pendingCount = 0 }) => {
  return (
    <View style={styles.banner}>
      <CloudOff size={16} color="#FFFFFF" />
      <Text style={styles.text}>
        Mode hors ligne{'\n'}
        <Text style={styles.sub}>
          {pendingCount > 0
            ? `${pendingCount} action(s) en attente — envoi automatique au retour du réseau.`
            : 'Synchronisation automatique au retour du réseau.'}
        </Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.navy,
    borderRadius: AppRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 10,
    lineHeight: 17,
  },
  sub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#AFC3D6',
  },
});
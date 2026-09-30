import React, { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTracking } from '../context/TrackingContext';
import { applyUpdate, checkAndFetchUpdate } from '../services/app-update.service';
import { AppRadius, AppTheme } from '../theme/colors';

/**
 * Livraison des mises à jour OTA sur les téléphones des chauffeurs : vérifie au lancement et à
 * chaque retour au premier plan, télécharge, puis applique aussitôt — sauf pendant une mission
 * suivie, où l'on ne redémarre pas l'écran sous les doigts du chauffeur : un bandeau propose
 * « Redémarrer », et la mise à jour s'applique d'elle-même dès la fin du suivi.
 */
export const AppUpdater: React.FC = () => {
  const { isTracking } = useTracking();
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);

  const check = useCallback(async () => {
    if (await checkAndFetchUpdate()) setReady(true);
  }, []);

  useEffect(() => {
    void check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => sub.remove();
  }, [check]);

  useEffect(() => {
    if (ready && !isTracking) void applyUpdate();
  }, [ready, isTracking]);

  if (!ready || !isTracking) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { top: insets.top + 8 }]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => void applyUpdate()}
        style={styles.banner}
        accessibilityRole="button"
        accessibilityLabel="Nouvelle version prête. Redémarrer l'application. Votre mission et vos données sont conservées."
      >
        <Text style={styles.text}>Nouvelle version prête</Text>
        <Text style={styles.action}>Redémarrer</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.primaryDark,
    borderRadius: AppRadius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  action: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});

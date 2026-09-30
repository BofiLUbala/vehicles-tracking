import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Navigation2, RefreshCw, History, UserRound } from 'lucide-react-native';
import { AppTheme } from '../../src/theme/colors';
import { useSync } from '../../src/context/SyncContext';

/**
 * Petit badge numérique sur l'onglet Sync quand des données sont en attente.
 */
function SyncBadge() {
  const { counts, isConnected } = useSync();
  if (counts.total === 0 && isConnected) return null;
  return <View style={styles.dot} />;
}

/** Hauteur utile de la barre d'onglets, hors zone système du bas. */
const TAB_BAR_BASE_HEIGHT = 64;
/** Respiration entre les libellés et la barre de gestes du téléphone. */
const TAB_BAR_GAP_ABOVE_SYSTEM = 10;

export default function MainTabsLayout() {
  // La barre de gestes Android (et l'indicateur iOS) occupe le bas de l'écran : on l'ajoute à la
  // hauteur plutôt que de fixer une hauteur qui la ferait passer par-dessus les libellés.
  const { bottom } = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: TAB_BAR_BASE_HEIGHT + bottom + TAB_BAR_GAP_ABOVE_SYSTEM,
            paddingBottom: bottom + TAB_BAR_GAP_ABOVE_SYSTEM,
          },
        ],
        tabBarActiveTintColor: AppTheme.tracking,
        // Lisible en extérieur : gris secondaire (4,97:1) plutôt que le gris discret.
        tabBarInactiveTintColor: AppTheme.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      {/* Tab 1 — Accueil */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} strokeWidth={2.2} />,
        }}
      />

      {/* Tab 2 — Missions (stack-based deep nav) */}
      <Tabs.Screen
        name="missions"
        options={{
          title: 'Missions',
          tabBarIcon: ({ color, size }) => <Navigation2 size={size} color={color} strokeWidth={2.2} />,
        }}
      />

      {/* Tab 3 — Sync */}
      <Tabs.Screen
        name="sync"
        options={{
          title: 'Sync',
          tabBarIcon: ({ color, size }) => (
            <View>
              <RefreshCw size={size} color={color} strokeWidth={2.2} />
              <SyncBadge />
            </View>
          ),
        }}
      />

      {/* Tab 4 — Historique */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historique',
          tabBarIcon: ({ color, size }) => <History size={size} color={color} strokeWidth={2.2} />,
        }}
      />

      {/* Tab 5 — Profil */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <UserRound size={size} color={color} strokeWidth={2.2} />,
        }}
      />

      {/* Fuel screens — hidden from tab bar, accessible as push from any tab */}
      <Tabs.Screen
        name="fuel"
        options={{
          href: null, // not a visible tab
        }}
      />

      {/* Permissions screen — hidden */}
      <Tabs.Screen
        name="permissions"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: AppTheme.card,
    borderTopWidth: 1,
    borderTopColor: AppTheme.border,
    paddingTop: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  tabItem: {
    paddingTop: 4,
  },
  dot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppTheme.warning,
    borderWidth: 1.5,
    borderColor: AppTheme.card,
  },
});

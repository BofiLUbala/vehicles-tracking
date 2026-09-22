import { Stack } from 'expo-router';
import { AppTheme } from '../../../src/theme/colors';

/**
 * Stack navigator pour l'onglet Missions.
 * L'en-tête est géré dans chaque écran (headerShown: false partout).
 */
export default function MissionsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: AppTheme.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/progress" />
      <Stack.Screen name="[id]/steps/[stepId]/scan" />
      <Stack.Screen name="[id]/steps/[stepId]/photo" />
      <Stack.Screen name="[id]/steps/[stepId]/result" />
    </Stack>
  );
}

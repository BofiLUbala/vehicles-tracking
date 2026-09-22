import { Stack } from 'expo-router';
import { AppTheme } from '../../../src/theme/colors';

export default function PermissionsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: AppTheme.background } }}>
      <Stack.Screen name="gps" />
    </Stack>
  );
}

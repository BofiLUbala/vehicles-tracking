import { Stack } from 'expo-router';
import { AppTheme } from '../../../src/theme/colors';

export default function HistoryStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: AppTheme.background } }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}

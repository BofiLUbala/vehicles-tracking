import { Stack } from 'expo-router';
import { AppTheme } from '../../../src/theme/colors';

export default function FuelStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: AppTheme.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[vehicleId]/receipt-photo" />
      <Stack.Screen name="[vehicleId]/odometer-photo" />
      <Stack.Screen name="[vehicleId]/result" />
    </Stack>
  );
}

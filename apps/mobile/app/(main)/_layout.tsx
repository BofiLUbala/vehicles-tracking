import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { ConnectivityPill } from '../../src/components/ConnectivityPill';

export default function MainLayout() {
  return (
    <View style={styles.container}>
      <ConnectivityPill />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F8FAFC' },
        }}
      >
        <Stack.Screen name="permissions/gps" />
        <Stack.Screen name="missions/index" />
        <Stack.Screen name="missions/[id]/index" />
        <Stack.Screen name="missions/[id]/progress" />
        <Stack.Screen name="missions/[id]/steps/[stepId]/scan" />
        <Stack.Screen name="missions/[id]/steps/[stepId]/photo" />
        <Stack.Screen name="missions/[id]/steps/[stepId]/result" />
        <Stack.Screen name="fuel/index" />
        <Stack.Screen name="fuel/[vehicleId]/receipt-photo" />
        <Stack.Screen name="fuel/[vehicleId]/odometer-photo" />
        <Stack.Screen name="fuel/[vehicleId]/result" />
        <Stack.Screen name="sync/index" />
        <Stack.Screen name="history/index" />
        <Stack.Screen name="profile/index" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});

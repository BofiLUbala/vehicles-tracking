import '../src/services/background-location.task';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/AuthContext';
import { SyncProvider } from '../src/context/SyncContext';
import { TrackingProvider } from '../src/context/TrackingContext';
import { AppUpdater } from '../src/components/AppUpdater';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SyncProvider>
          <TrackingProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(main)" />
            </Stack>
            <AppUpdater />
          </TrackingProvider>
        </SyncProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

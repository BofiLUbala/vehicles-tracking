import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    server: {
      deps: {
        inline: [
          'expo-sqlite',
          'expo-secure-store',
          'expo-location',
          'expo-task-manager',
          '@react-native-community/netinfo',
        ],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

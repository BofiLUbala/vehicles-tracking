import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  plugins: [
    {
      name: 'debug-modules-core',
      resolveId(id, importer) {
        if (id.includes('modules-core')) {
          console.log(`[probe] resolveId('${id}') from '${importer}'`);
        }
        return null;
      },
    },
  ],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    server: {
      deps: {
        inline: [
          'expo-sqlite',
          'expo-secure-store',
          'expo-modules-core',
          'expo-location',
          'expo-task-manager',
          '@react-native-community/netinfo',
        ],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src').replace(/\\/g, '/'),
      'expo-secure-store': path.resolve(__dirname, './src/__tests__/mocks/expo-secure-store.ts').replace(/\\/g, '/'),
      'expo-modules-core': path.resolve(__dirname, './src/__tests__/mocks/expo-modules-core.ts').replace(/\\/g, '/'),
      'expo-location': path.resolve(__dirname, './src/__tests__/mocks/expo-location.ts').replace(/\\/g, '/'),
      'expo-task-manager': path.resolve(__dirname, './src/__tests__/mocks/expo-task-manager.ts').replace(/\\/g, '/'),
      'expo-sqlite': path.resolve(__dirname, './src/__tests__/mocks/expo-sqlite.ts').replace(/\\/g, '/'),
      '@react-native-community/netinfo': path.resolve(__dirname, './src/__tests__/mocks/netinfo.ts').replace(/\\/g, '/'),
    },
    extensions: ['.js', '.ts', '.tsx', '.jsx', '.json'],
  },
});

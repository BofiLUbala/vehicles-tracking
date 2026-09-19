import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

// Web fallback using localStorage (in-memory on web, not secure but sufficient for QA)
const webStore = new Map<string, string>();

const webAdapter = {
  async getItemAsync(key: string): Promise<string | null> {
    if (isWeb) return webStore.get(key) ?? null;
    return await SecureStore.getItemAsync(key);
  },
  async setItemAsync(key: string, value: string): Promise<void> {
    if (isWeb) { webStore.set(key, value); return; }
    await SecureStore.setItemAsync(key, value);
  },
  async deleteItemAsync(key: string): Promise<void> {
    if (isWeb) { webStore.delete(key); return; }
    await SecureStore.deleteItemAsync(key);
  },
};

export default webAdapter;
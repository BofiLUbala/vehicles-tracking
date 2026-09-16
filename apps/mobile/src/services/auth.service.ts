import * as SecureStore from 'expo-secure-store';
import { Driver } from '../types/auth.types';

const ACCESS_TOKEN_KEY = 'tv_access_token';
const REFRESH_TOKEN_KEY = 'tv_refresh_token';
const DRIVER_PROFILE_KEY = 'tv_driver_profile';
const DEVICE_ID_KEY = 'tv_device_id';

export const AuthService = {
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  },

  async clearTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(DRIVER_PROFILE_KEY);
    } catch {
      // Ignore cleanup errors
    }
  },

  async saveDriverProfile(driver: Driver): Promise<void> {
    await SecureStore.setItemAsync(DRIVER_PROFILE_KEY, JSON.stringify(driver));
  },

  async getDriverProfile(): Promise<Driver | null> {
    try {
      const json = await SecureStore.getItemAsync(DRIVER_PROFILE_KEY);
      return json ? JSON.parse(json) : null;
    } catch {
      return null;
    }
  },

  async getDeviceId(): Promise<string> {
    let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  },
};

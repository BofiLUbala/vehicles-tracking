import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getDevHost = (): string => {
  // Try to extract host URI from Expo constants (e.g. 192.168.1.50:8081)
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoClient?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost') {
      return ip;
    }
  }

  // Android emulator loopback vs standard localhost
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
};

const defaultHost = getDevHost();

const rawApiUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string) ||
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ||
  `http://${defaultHost}:3001/api/v1`;

const normalizedApiUrl = rawApiUrl.replace(/\/+$/, '');
export const API_BASE_URL = normalizedApiUrl.endsWith('/api/v1')
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api/v1`;

export const WS_URL =
  process.env.EXPO_PUBLIC_WS_URL ||
  (Constants.expoConfig?.extra?.wsUrl as string) ||
  API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export const FILE_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');


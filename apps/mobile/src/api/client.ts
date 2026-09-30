import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../utils/env';
import { AuthService } from '../services/auth.service';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (error: any) => void;
}[] = [];

let forceLogoutHandler: (() => Promise<void>) | null = null;

export function setForceLogoutHandler(handler: () => Promise<void>) {
  forceLogoutHandler = handler;
}

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes('/auth/driver/login') ||
    url.includes('/auth/driver/invitation') ||
    url.includes('/auth/driver/activate') ||
    url.includes('/auth/driver/password-reset/') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout')
  );
}

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (!isAuthEndpoint(config.url)) {
      const token = await AuthService.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AuthService.getRefreshToken();
        if (!refreshToken) {
          // Aucune session n'existe : il n'y a donc rien à fermer de force. Une requête protégée
          // sans jeton (ex. la synchronisation GPS qui vide la file SQLite d'un ancien chauffeur
          // pendant qu'un nouveau s'inscrit) doit simplement échouer. Déclencher la déconnexion
          // forcée ici effaçait l'identifiant et le mot de passe de l'inscription en cours, et le
          // bouton « Valider » devenait un no-op silencieux (défaut constaté en conditions réelles).
          processQueue(error, null);
          return Promise.reject(error);
        }

        const response = await refreshClient.post<{
          accessToken: string;
          refreshToken: string;
        }>('/auth/refresh', { refreshToken });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        await AuthService.saveTokens(accessToken, newRefreshToken);

        apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await AuthService.clearTokens();
        if (forceLogoutHandler) {
          await forceLogoutHandler();
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

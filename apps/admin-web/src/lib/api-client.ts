import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';

export const http: AxiosInstance = axios.create({ baseURL: API_BASE_URL });

export type TokenFetcher = (forceRefresh?: boolean) => Promise<string | null>;

/** Récupère le token d'accès courant auprès de la route Next.js `/api/auth/token` (jamais stocké). */
export async function fetchAccessToken(forceRefresh = false): Promise<string | null> {
  const res = await fetch(`/api/auth/token${forceRefresh ? '?refresh=1' : ''}`, {
    credentials: 'include',
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.accessToken ?? null;
}

function defaultOnAuthFailure() {
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

/**
 * Exécute une requête axios avec le Bearer courant, et retente UNE fois via refresh en cas de
 * 401. Si le refresh échoue aussi, déclenche `onAuthFailure` (déconnexion forcée) et propage
 * l'erreur. Exportée en tant que fonction autonome (pas seulement un intercepteur axios) pour
 * rester testable sans réseau réel.
 */
export async function requestWithAuth<T = unknown>(
  instance: Pick<AxiosInstance, 'request'>,
  config: AxiosRequestConfig,
  tokenFetcher: TokenFetcher = fetchAccessToken,
  onAuthFailure: () => void = defaultOnAuthFailure,
): Promise<AxiosResponse<T>> {
  const withAuth = (token: string | null): AxiosRequestConfig => ({
    ...config,
    headers: {
      ...config.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const token = await tokenFetcher(false);

  try {
    return await instance.request<T>(withAuth(token));
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const refreshed = await tokenFetcher(true);
      if (refreshed) {
        return await instance.request<T>(withAuth(refreshed));
      }
      onAuthFailure();
    }
    throw error;
  }
}

export const apiClient = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    requestWithAuth<T>(http, { ...config, url, method: 'GET' }),
  post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    requestWithAuth<T>(http, { ...config, url, method: 'POST', data }),
  patch: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    requestWithAuth<T>(http, { ...config, url, method: 'PATCH', data }),
};

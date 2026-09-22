const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001/api/v1';

export interface RefreshedSession {
  accessToken: string;
  refreshToken: string;
}

const inFlight = new Map<string, Promise<RefreshedSession | null>>();

/** Une seule rotation par refresh token dans le processus Next.js. */
export function refreshAdminSession(refreshToken: string): Promise<RefreshedSession | null> {
  const existing = inFlight.get(refreshToken);
  if (existing) return existing;

  const pending = (async () => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object') return null;
    const tokens = data as Partial<RefreshedSession>;
    return typeof tokens.accessToken === 'string' && typeof tokens.refreshToken === 'string'
      ? { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
      : null;
  })();
  inFlight.set(refreshToken, pending);
  // Les requêtes parties avec l'ancien cookie peuvent arriver juste après la première réponse.
  // Une courte fenêtre leur renvoie la même paire, sans rejouer la rotation côté API.
  void pending.then((result) => {
    if (result) setTimeout(() => inFlight.delete(refreshToken), 3_000);
    else inFlight.delete(refreshToken);
  }).catch(() => inFlight.delete(refreshToken));
  return pending;
}

import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSessionCookies, isTokenExpired, setSessionCookies } from '@/lib/session';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';

/**
 * Expose le token d'accès courant au JS client (mémoire uniquement, jamais stocké) — nécessaire
 * pour l'en-tête Authorization des appels REST directs et pour l'auth du WebSocket Socket.IO.
 * Le refresh token, lui, ne quitte jamais son cookie httpOnly.
 *
 * `?refresh=1` force un renouvellement via /auth/refresh (utilisé par le client API après un 401).
 */
export async function GET(req: NextRequest) {
  const forceRefresh = req.nextUrl.searchParams.get('refresh') === '1';
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  if (!forceRefresh && accessToken && !isTokenExpired(accessToken)) {
    return NextResponse.json({ accessToken });
  }

  if (!refreshToken) {
    const res = NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
    clearSessionCookies(res);
    return res;
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return NextResponse.json({ message: "Impossible de joindre le serveur" }, { status: 502 });
  }

  if (!upstream.ok) {
    const res = NextResponse.json({ message: 'Session expirée' }, { status: 401 });
    clearSessionCookies(res);
    return res;
  }

  const data = await upstream.json();
  const res = NextResponse.json({ accessToken: data.accessToken });
  setSessionCookies(res, data.accessToken, data.refreshToken);
  return res;
}

import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSessionCookies, isTokenExpired, setSessionCookies } from '@/lib/session';
import { refreshAdminSession } from '@/lib/refresh-session';

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

  let data;
  try {
    data = await refreshAdminSession(refreshToken);
  } catch {
    return NextResponse.json({ message: "Impossible de joindre le serveur" }, { status: 502 });
  }

  if (!data) {
    // Une réponse concurrente peut déjà avoir posé les nouveaux cookies.
    // Ne pas écraser ces cookies avec une suppression provenant de l'ancien jeton.
    return NextResponse.json({ message: 'Session expirée' }, { status: 401 });
  }

  const res = NextResponse.json({ accessToken: data.accessToken });
  setSessionCookies(res, data.accessToken, data.refreshToken);
  return res;
}

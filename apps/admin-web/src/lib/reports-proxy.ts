import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSessionCookies, isTokenExpired, setSessionCookies } from '@/lib/session';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';

interface ResolvedToken {
  token: string;
  refreshed?: { accessToken: string; refreshToken: string };
}

/** Même logique de refresh que `src/app/api/auth/token/route.ts`, réutilisée ici pour les
 * téléchargements de rapports (voir `src/features/reports/api.ts` pour le pourquoi du proxy). */
async function resolveAccessToken(req: NextRequest): Promise<ResolvedToken | null> {
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  if (accessToken && !isTokenExpired(accessToken)) {
    return { token: accessToken };
  }

  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return null;
  }

  if (!upstream.ok) return null;

  const data = await upstream.json();
  return { token: data.accessToken, refreshed: { accessToken: data.accessToken, refreshToken: data.refreshToken } };
}

/**
 * Proxifie un téléchargement de rapport (`GET /reports/:type?...&format=csv|xlsx|pdf`) : résout
 * le token d'accès depuis les cookies de session (avec refresh si besoin), relaie la requête au
 * backend avec l'en-tête `Authorization`, puis retransmet le fichier tel quel (`Content-Type` et
 * `Content-Disposition: attachment` d'origine) — le navigateur déclenche le téléchargement natif
 * suite à la navigation `<a href>`.
 */
export async function proxyReportDownload(req: NextRequest, upstreamPath: string): Promise<NextResponse> {
  const resolved = await resolveAccessToken(req);
  if (!resolved) {
    const res = NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
    clearSessionCookies(res);
    return res;
  }

  const search = req.nextUrl.searchParams.toString();
  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}${upstreamPath}${search ? `?${search}` : ''}`, {
      headers: { Authorization: `Bearer ${resolved.token}` },
    });
  } catch {
    return NextResponse.json({ message: 'Impossible de joindre le serveur' }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json({ message: 'Erreur lors de la génération du rapport' }, { status: upstream.status });
  }

  const body = await upstream.arrayBuffer();
  const headers: Record<string, string> = {
    'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
  };
  const disposition = upstream.headers.get('content-disposition');
  if (disposition) headers['Content-Disposition'] = disposition;

  const res = new NextResponse(body, { status: 200, headers });
  if (resolved.refreshed) {
    setSessionCookies(res, resolved.refreshed.accessToken, resolved.refreshed.refreshToken);
  }
  return res;
}

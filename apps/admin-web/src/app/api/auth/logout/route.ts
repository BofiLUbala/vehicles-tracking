import { NextRequest, NextResponse } from 'next/server';
import { REFRESH_COOKIE, clearSessionCookies } from '@/lib/session';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';

/** Déconnexion idempotente : révoque la session côté API si possible, efface les cookies dans tous les cas. */
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // On efface les cookies localement même si l'API est injoignable.
    }
  }

  const res = NextResponse.json({ message: 'Déconnecté' });
  clearSessionCookies(res);
  return res;
}

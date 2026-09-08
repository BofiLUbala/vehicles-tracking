import { NextRequest, NextResponse } from 'next/server';
import { setSessionCookies } from '@/lib/session';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';

/**
 * Proxy vers POST /auth/admin/login. Le navigateur ne voit jamais les tokens bruts : en cas de
 * succès ils sont posés en cookies httpOnly par cette route ; si un OTP est requis (nouvel
 * appareil), seule l'information `requiresOtp` est renvoyée.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Requête invalide' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ message: "Impossible de joindre le serveur" }, { status: 502 });
  }

  const data = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  if (data.requiresOtp) {
    return NextResponse.json({ requiresOtp: true, message: data.message });
  }

  const res = NextResponse.json({ requiresOtp: false });
  setSessionCookies(res, data.accessToken, data.refreshToken);
  return res;
}

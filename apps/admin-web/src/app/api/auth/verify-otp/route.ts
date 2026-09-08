import { NextRequest, NextResponse } from 'next/server';
import { setSessionCookies } from '@/lib/session';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';

/** Proxy vers POST /auth/admin/verify-otp. Pose les cookies de session en cas de succès. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Requête invalide' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/auth/admin/verify-otp`, {
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

  const res = NextResponse.json({ requiresOtp: false });
  setSessionCookies(res, data.accessToken, data.refreshToken);
  return res;
}

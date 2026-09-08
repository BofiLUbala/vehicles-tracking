import { NextResponse } from 'next/server';
import { decodeJwt } from 'jose';

export const ACCESS_COOKIE = 'tv_access_token';
export const REFRESH_COOKIE = 'tv_refresh_token';

/** Petite marge pour éviter d'utiliser un token à quelques secondes de l'expiration. */
const EXPIRY_SKEW_MS = 10_000;

export interface AccessTokenClaims {
  sub: string;
  type: 'user' | 'driver';
  role: string;
  organizationId: string;
  deviceId?: string;
  exp?: number;
}

export function decodeAccessToken(token: string): AccessTokenClaims | null {
  try {
    return decodeJwt(token) as unknown as AccessTokenClaims;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const claims = decodeAccessToken(token);
  if (!claims?.exp) return true;
  return claims.exp * 1000 - EXPIRY_SKEW_MS < Date.now();
}

const isProd = process.env.NODE_ENV === 'production';
const cookieDefaults = { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/' };

export function setSessionCookies(res: NextResponse, accessToken: string, refreshToken: string) {
  res.cookies.set(ACCESS_COOKIE, accessToken, { ...cookieDefaults, maxAge: 15 * 60 });
  res.cookies.set(REFRESH_COOKIE, refreshToken, { ...cookieDefaults, maxAge: 30 * 24 * 60 * 60 });
}

export function clearSessionCookies(res: NextResponse) {
  res.cookies.set(ACCESS_COOKIE, '', { ...cookieDefaults, maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, '', { ...cookieDefaults, maxAge: 0 });
}

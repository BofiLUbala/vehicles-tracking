import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/session';

// Toutes les routes du groupe (dashboard) nécessitent une session. La liste est explicite
// (plutôt qu'un matcher générique) pour rester lisible à mesure que de nouveaux écrans arrivent.
const PROTECTED_PREFIXES = [
  '/tracking',
  '/missions',
  '/drivers',
  '/vehicles',
  '/locations',
  '/fuel',
  '/alerts',
  '/reports',
  '/users',
  '/settings',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!isProtected) {
    return NextResponse.next();
  }

  const hasSession = req.cookies.has(ACCESS_COOKIE) || req.cookies.has(REFRESH_COOKIE);
  if (!hasSession) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/tracking/:path*',
    '/missions/:path*',
    '/drivers/:path*',
    '/vehicles/:path*',
    '/locations/:path*',
    '/fuel/:path*',
    '/alerts/:path*',
    '/reports/:path*',
    '/users/:path*',
    '/settings/:path*',
  ],
};

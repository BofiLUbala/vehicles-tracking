import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, decodeAccessToken } from '@/lib/session';

/**
 * Expose au JS client les informations non sensibles de l'utilisateur courant (rôle, id,
 * organisation), décodées depuis le cookie httpOnly `tv_access_token` côté serveur — le token
 * lui-même ne quitte jamais son cookie via cette route. Utilisé pour le gating d'UI côté client
 * (ex. actions réservées à SUPER_ADMIN dans l'écran Utilisateurs) ; l'application réelle de ces
 * règles reste du ressort de l'API (`@Roles(...)` côté NestJS).
 */
export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
  }

  const claims = decodeAccessToken(accessToken);
  if (!claims) {
    return NextResponse.json({ message: 'Session invalide' }, { status: 401 });
  }

  return NextResponse.json({
    id: claims.sub,
    role: claims.role,
    organizationId: claims.organizationId,
  });
}

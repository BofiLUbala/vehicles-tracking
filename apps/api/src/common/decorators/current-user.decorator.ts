import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedPrincipal {
  sub: string;
  type: 'user' | 'driver';
  role?: string;
  organizationId?: string;
  deviceId?: string;
}

/** Extrait le principal authentifié (admin/user) posé par JwtAuthGuard sur req.user. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthenticatedPrincipal => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});

/** Idem, mais pour les endpoints réservés aux chauffeurs (garantit type === 'driver' en amont). */
export const CurrentDriver = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthenticatedPrincipal => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});

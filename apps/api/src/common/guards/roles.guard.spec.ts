import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function makeContext(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it("refuse l'accès à un rôle non autorisé", () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([RoleName.SUPER_ADMIN]);
    const guard = new RolesGuard(reflector);
    const ctx = makeContext({ sub: 'u1', role: RoleName.DRIVER });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('autorise un rôle listé dans @Roles(...)', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([RoleName.ADMIN, RoleName.SUPER_ADMIN]);
    const guard = new RolesGuard(reflector);
    const ctx = makeContext({ sub: 'u2', role: RoleName.ADMIN });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("laisse passer si aucun rôle n'est requis sur la route", () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const guard = new RolesGuard(reflector);
    const ctx = makeContext(undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });
});

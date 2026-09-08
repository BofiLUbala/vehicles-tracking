import { SetMetadata } from '@nestjs/common';
import { RoleName } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Restreint un endpoint aux rôles listés (lu depuis le payload JWT par RolesGuard). */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);

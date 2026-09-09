/**
 * Contrat REST du module utilisateurs (`apps/api/src/users`). À la date d'écriture, le backend
 * est un bootstrap minimal en lecture seule (voir `apps/api/src/users/users.service.ts` :
 * "Bootstrap minimal (lecture seule) — suffisant pour l'auth admin en Phase 1. CRUD complet en
 * Phase 2+.") : seuls `GET /users` et `GET /users/:id` existent. Aucune création, aucun
 * changement de rôle, aucune désactivation ne sont exposés — voir `UsersPageClient` pour le
 * traitement honnête de ces actions absentes.
 */

export type UserRole = 'DRIVER' | 'ADMIN' | 'SUPER_ADMIN';

export interface UserRoleRef {
  id: string;
  name: UserRole;
  description: string | null;
}

/** Forme renvoyée par `GET /users` (un item). */
export interface AdminUserDto {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  role: UserRoleRef;
  createdAt: string;
}

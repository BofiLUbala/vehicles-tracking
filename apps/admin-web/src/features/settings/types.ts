/**
 * Contrat REST du module rôles (`apps/api/src/roles`) et types pour l'écran Paramètres. Comme
 * pour `features/users`, `apps/api/src/roles/roles.service.ts` est un "Bootstrap minimal —
 * suffisant pour l'auth admin en Phase 1. Gestion CRUD complète en Phase 2+." : seul
 * `GET /roles` existe (`@Roles(SUPER_ADMIN)`), sans édition de permissions.
 */

export type RoleName = 'DRIVER' | 'ADMIN' | 'SUPER_ADMIN';

/** Forme renvoyée par `GET /roles` (un item) — pas de permissions incluses (pas de `include` côté service). */
export interface RoleDto {
  id: string;
  name: RoleName;
  description: string | null;
  createdAt: string;
}

/** Seuil d'alerte configuré uniquement via variable d'environnement côté API (pas de stockage en base). */
export interface AlertThreshold {
  envVar: string;
  label: string;
  description: string;
  defaultValue: string;
  unit: string;
}

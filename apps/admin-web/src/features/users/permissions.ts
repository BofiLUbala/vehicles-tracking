import type { AdminRole } from '@/features/auth/current-user';

/**
 * Gating client de l'UI de gestion des utilisateurs : seul SUPER_ADMIN voit les actions de
 * gestion (création, changement de rôle, désactivation). Fonction pure, testable isolément.
 *
 * IMPORTANT : ceci ne fait qu'afficher/masquer des boutons. Ça ne remplace en rien l'autorisation
 * côté serveur (`@Roles(...)` sur les endpoints NestJS) — d'ailleurs aucun endpoint de gestion
 * n'existe encore côté API (voir `docs` dans `features/users/types.ts`), donc ces actions restent
 * désactivées dans tous les cas pour le moment.
 */
export function canManageUsers(role: AdminRole | null | undefined): boolean {
  return role === 'SUPER_ADMIN';
}

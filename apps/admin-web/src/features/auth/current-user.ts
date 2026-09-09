import { useQuery } from '@tanstack/react-query';

export type AdminRole = 'DRIVER' | 'ADMIN' | 'SUPER_ADMIN';

export interface CurrentUser {
  id: string;
  role: AdminRole;
  organizationId: string;
}

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const res = await fetch('/api/auth/me', { credentials: 'include' });
  if (!res.ok) return null;
  return (await res.json()) as CurrentUser;
}

/** Rôle de l'utilisateur connecté, dérivé du cookie de session côté serveur (voir `/api/auth/me`). */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'current-user'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });
}

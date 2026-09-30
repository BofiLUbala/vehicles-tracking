import { createHash, randomBytes } from 'crypto';

/** Durée de validité d'un lien d'invitation chauffeur (activation du compte). */
export const DRIVER_INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Durée de validité d'un lien de réinitialisation du mot de passe chauffeur. */
export const DRIVER_PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

/**
 * Hash d'un jeton de lien chauffeur (invitation ou réinitialisation). SHA-256 (et non argon2) : le
 * jeton fait 256 bits aléatoires, il ne peut pas être deviné, et le hash doit permettre une
 * recherche directe en base.
 */
export function hashDriverLinkToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Nouveau jeton de lien : la valeur en clair part dans l'e-mail, seul le hash est stocké. */
export function generateDriverLinkToken(ttlMs: number, now = new Date()) {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashDriverLinkToken(token),
    expiresAt: new Date(now.getTime() + ttlMs),
  };
}

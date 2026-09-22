/**
 * Mémorisation de l'ADRESSE E-MAIL de connexion uniquement.
 *
 * Le mot de passe n'est JAMAIS stocké ici (ni localStorage, ni sessionStorage, ni cookie) : il est
 * confié au gestionnaire de mots de passe du navigateur via les attributs `autocomplete`
 * (`username` / `current-password`) du formulaire. C'est le seul mécanisme sûr côté client.
 *
 * Tous les accès sont protégés : en navigation privée ou avec les données de site bloquées, l'accès
 * au stockage peut lever une exception — le formulaire doit rester utilisable dans ce cas.
 */
const REMEMBERED_EMAIL_KEY = 'tv_remembered_email';

export function loadRememberedEmail(): string {
  try {
    return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveRememberedEmail(email: string): void {
  try {
    const value = email.trim();
    if (value) window.localStorage.setItem(REMEMBERED_EMAIL_KEY, value);
  } catch {
    // Stockage indisponible : la mémorisation est un confort, jamais un prérequis.
  }
}

export function clearRememberedEmail(): void {
  try {
    window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  } catch {
    // idem
  }
}

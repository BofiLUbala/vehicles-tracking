import { getDatabase } from './db';

/**
 * Chauffeur actuellement connecté sur cet appareil — propriétaire de tout ce qui est mis en file
 * hors-ligne (positions GPS, validations d'étape, pleins) et du cache des missions.
 *
 * Invariant d'intégrité : une ligne en file appartient POUR TOUJOURS au chauffeur qui l'a
 * enregistrée. Elle n'est envoyée, comptée ou affichée que quand CE chauffeur est connecté. Si un
 * autre chauffeur se connecte sur le même appareil, les lignes du premier restent intactes (rien
 * n'est perdu, y compris après une déconnexion hors-ligne) mais lui sont invisibles et ne sont
 * jamais rejouées sous son jeton.
 *
 * Stocké dans SQLite (et non en mémoire / SecureStore) pour rester lisible de façon SYNCHRONE par les
 * dépôts et par la tâche GPS d'arrière-plan, qui s'exécute hors du contexte React.
 */
export const ActiveOwner = {
  get(): string | null {
    try {
      const row = getDatabase().getFirstSync<{ driver_id: string }>(`SELECT driver_id FROM active_driver WHERE id = 0`);
      return row?.driver_id || null;
    } catch {
      return null;
    }
  },

  set(driverId: string): void {
    if (!driverId) return;
    getDatabase().runSync(`INSERT OR REPLACE INTO active_driver (id, driver_id) VALUES (0, ?)`, [driverId]);
  },

  clear(): void {
    try {
      getDatabase().runSync(`DELETE FROM active_driver WHERE id = 0`);
    } catch {
      // base indisponible : rien à effacer
    }
  },
};

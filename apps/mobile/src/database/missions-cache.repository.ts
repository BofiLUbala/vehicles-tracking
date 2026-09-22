import { getDatabase } from './db';
import { ActiveOwner } from './active-owner';
import { Mission } from '../types/mission.types';

export const MissionsCacheRepository = {
  save(missions: Mission[]): void {
    // Le cache appartient au chauffeur connecté : un autre chauffeur sur le même appareil ne doit
    // jamais voir (même hors-ligne) les missions du précédent.
    const owner = ActiveOwner.get();
    if (!owner) return;
    const db = getDatabase();
    const json = JSON.stringify(missions);
    const nowIso = new Date().toISOString();

    db.runSync(
      `INSERT OR REPLACE INTO today_missions_cache (id, driver_id, response_json, fetched_at)
       VALUES (0, ?, ?, ?)`,
      [owner, json, nowIso]
    );
  },

  get(): Mission[] | null {
    try {
      const owner = ActiveOwner.get();
      if (!owner) return null;
      const db = getDatabase();
      const row = db.getFirstSync<{ response_json: string }>(
        `SELECT response_json FROM today_missions_cache WHERE id = 0 AND driver_id = ?`,
        [owner]
      );
      if (row?.response_json) {
        return JSON.parse(row.response_json);
      }
      return null;
    } catch {
      return null;
    }
  },
};

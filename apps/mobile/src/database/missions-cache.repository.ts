import { getDatabase } from './db';
import { Mission } from '../types/mission.types';

export const MissionsCacheRepository = {
  save(missions: Mission[]): void {
    const db = getDatabase();
    const json = JSON.stringify(missions);
    const nowIso = new Date().toISOString();

    db.runSync(
      `INSERT OR REPLACE INTO today_missions_cache (id, response_json, fetched_at)
       VALUES (0, ?, ?)`,
      [json, nowIso]
    );
  },

  get(): Mission[] | null {
    try {
      const db = getDatabase();
      const row = db.getFirstSync<{ response_json: string }>(
        `SELECT response_json FROM today_missions_cache WHERE id = 0`
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

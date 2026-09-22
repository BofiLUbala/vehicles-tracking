import { createRequire } from 'node:module';

// Vite 5 ne connaît pas `node:sqlite` comme module natif : on le charge via `require` pour éviter
// son analyse d'imports.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');

/**
 * Adaptateur minimal « API synchrone d'expo-sqlite » au-dessus de `node:sqlite` (SQLite réel, en
 * mémoire). Permet de tester les VRAIES requêtes SQL des dépôts — contrairement aux mocks qui ne
 * font que vérifier qu'une chaîne a été passée — ce qui est indispensable pour prouver l'isolation
 * entre chauffeurs (un filtre `WHERE driver_id = ?` oublié serait invisible avec un mock).
 */
export function createRealSqlite() {
  const db = new DatabaseSync(':memory:');
  const bind = (params?: unknown[]) => (params ?? []) as never[];
  return {
    raw: db,
    execSync: (sql: string) => {
      db.exec(sql);
    },
    runSync: (sql: string, params?: unknown[]) => {
      const r = db.prepare(sql).run(...bind(params));
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    getAllSync: <T>(sql: string, params?: unknown[]): T[] => db.prepare(sql).all(...bind(params)) as T[],
    getFirstSync: <T>(sql: string, params?: unknown[]): T | null => (db.prepare(sql).get(...bind(params)) as T) ?? null,
    closeSync: () => db.close(),
  };
}

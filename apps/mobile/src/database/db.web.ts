interface WebDBRow {
  [key: string]: unknown;
}

interface WebDBTables {
  pending_gps_positions: WebDBRow[];
  pending_validations: WebDBRow[];
  pending_fuel_records: WebDBRow[];
  today_missions_cache: WebDBRow[];
}

interface WebDatabase {
  execSync(sql: string): void;
  getAllSync<T = unknown>(sql: string, ...params: unknown[]): T[];
  getFirstSync<T = unknown>(sql: string, ...params: unknown[]): T | null;
  runSync(sql: string, ...params: unknown[]): { changes: number; lastInsertRowId: number };
  closeSync(): void;
}

function parseSQL(sql: string): { table: string; columns: string[]; values: unknown[] } | null {
  const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (insertMatch) {
    return {
      table: insertMatch[1],
      columns: insertMatch[2].split(',').map((c: string) => c.trim().replace(/['"]/g, '')),
      values: insertMatch[3].split(',').map((v: string) => {
        const t = v.trim();
        if (t === 'NULL' || t === 'null') return null;
        if (t === 'CURRENT_TIMESTAMP' || t === "datetime('now')") return new Date().toISOString();
        const n = Number(t);
        if (!isNaN(n) && t !== '') return n;
        return t.replace(/^['"]|['"]$/g, '');
      }),
    };
  }
  return null;
}

function createStore(name: string): WebDBTables {
  try {
    const raw = localStorage.getItem(`tv_db_${name}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    pending_gps_positions: [],
    pending_validations: [],
    pending_fuel_records: [],
    today_missions_cache: [],
  };
}

function saveStore(name: string, store: WebDBTables): void {
  try {
    localStorage.setItem(`tv_db_${name}`, JSON.stringify(store));
  } catch {}
}

const DB_NAME = 'tracking_vehicles';
let DB_INITIALIZED = false;
const WEB_DB: WebDBTables = createStore(DB_NAME);

export function getDatabase(): WebDatabase {
  if (!DB_INITIALIZED) {
    WEB_DB.pending_gps_positions = WEB_DB.pending_gps_positions || [];
    WEB_DB.pending_validations = WEB_DB.pending_validations || [];
    WEB_DB.pending_fuel_records = WEB_DB.pending_fuel_records || [];
    WEB_DB.today_missions_cache = WEB_DB.today_missions_cache || [];
    DB_INITIALIZED = true;
  }

  const db: WebDatabase = {
    execSync(_sql: string) {
      // Tables already created above
    },

    getFirstSync<T = unknown>(sql: string, ...params: unknown[]): T | null {
      const rows = db.getAllSync<T>(sql, ...params);
      return rows.length > 0 ? rows[0] : null;
    },

    getAllSync<T = unknown>(sql: string, ..._params: unknown[]): T[] {
      const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?(?:\s+OFFSET\s+(\d+))?/i);
      if (selectMatch) {
        const table = selectMatch[2] as keyof WebDBTables;
        const where = selectMatch[3];
        let rows = WEB_DB[table] || [];
        if (where) {
          const conditions = where.split(/\s+AND\s+/i);
          rows = rows.filter((row: WebDBRow) => {
            return conditions.every((cond: string) => {
              const [col, op, val] = cond.split(/\s*(=|!=|<|>|<=|>=|LIKE)\s*/);
              const key = col.trim().replace(/['"]/g, '');
              const v = val?.trim().replace(/^['"]|['"]$/g, '');
              const rv = row[key];
              if (op === '=' || op === '==') return String(rv) === String(v);
              if (op === '!=') return String(rv) !== String(v);
              if (op === '<') return Number(rv) < Number(v);
              if (op === '>') return Number(rv) > Number(v);
              if (op === '<=') return Number(rv) <= Number(v);
              if (op === '>=') return Number(rv) >= Number(v);
              return true;
            });
          });
        }
        return rows as T[];
      }
      return [];
    },

    runSync(sql: string, ...params: unknown[]): { changes: number; lastInsertRowId: number } {
      if (sql.includes('INSERT OR IGNORE INTO')) {
        const insertMatch = sql.match(/INSERT\s+OR\s+IGNORE\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
        if (insertMatch) {
          const table = insertMatch[1] as keyof WebDBTables;
          const columns = insertMatch[2].split(',').map((c: string) => c.trim().replace(/['"]/g, ''));
          const values = params.length > 0 ? params : insertMatch[3].split(',').map((v: string) => {
            const t = v.trim();
            if (t === 'NULL' || t === 'null') return null;
            const n = Number(t);
            if (!isNaN(n) && t !== '') return n;
            return t.replace(/^['"]|['"]$/g, '');
          });
          const row: WebDBRow = {};
          columns.forEach((col: string, i: number) => { row[col] = values[i]; });
          if (!WEB_DB[table]) WEB_DB[table] = [];
          WEB_DB[table].push(row);
          saveStore(DB_NAME, WEB_DB);
          return { changes: 1, lastInsertRowId: WEB_DB[table].length };
        }
      }

      if (sql.includes('INSERT INTO') || sql.includes('REPLACE INTO')) {
        const parsed = parseSQL(sql.replace(/REPLACE\s+INTO/, 'INSERT INTO'));
        if (parsed) {
          const { table: tableKey, columns, values } = parsed;
          const table = tableKey as keyof WebDBTables;
          const row: WebDBRow = {};
          columns.forEach((col, i) => { row[col] = values[i]; });
          if (!WEB_DB[table]) WEB_DB[table] = [];
          WEB_DB[table].push(row);
          saveStore(DB_NAME, WEB_DB);
          return { changes: 1, lastInsertRowId: WEB_DB[table].length };
        }
      }

      if (sql.includes('DELETE FROM')) {
        const delMatch = sql.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?/i);
        if (delMatch) {
          const table = delMatch[1] as keyof WebDBTables;
          const before = (WEB_DB[table] || []).length;
          WEB_DB[table] = [];
          saveStore(DB_NAME, WEB_DB);
          return { changes: before, lastInsertRowId: 0 };
        }
      }

      if (sql.includes('UPDATE')) {
        const updMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?/i);
        if (updMatch) {
          const table = updMatch[1] as keyof WebDBTables;
          const setClause = updMatch[2];
          const where = updMatch[3];
          let rows = WEB_DB[table] || [];
          let updated = 0;
          const setParts = setClause.split(',').map((s: string) => {
            const [col, val] = s.split('=').map((x: string) => x.trim());
            return { col: col.replace(/['"]/g, ''), val };
          });
          rows = rows.map((row: WebDBRow) => {
            const shouldUpdate = !where || where.split(/\s+AND\s+/).every((c: string) => {
              const [col, , val] = c.split(/\s*(=)\s*/);
              return String(row[col.trim()]) === String(val.trim().replace(/^['"]|['"]$/g, ''));
            });
            if (shouldUpdate) {
              updated++;
              const newRow = { ...row };
              setParts.forEach(({ col, val }: { col: string; val: string }) => {
                const v = val.trim().replace(/^['"]|['"]$/g, '');
                newRow[col] = isNaN(Number(v)) ? v : Number(v);
              });
              return newRow;
            }
            return row;
          });
          WEB_DB[table] = rows;
          saveStore(DB_NAME, WEB_DB);
          return { changes: updated, lastInsertRowId: 0 };
        }
      }

      return { changes: 0, lastInsertRowId: 0 };
    },

    closeSync() {},
  };
  return db;
}

export function setDatabaseInstanceForTest(_db: unknown): void {
  // No-op on web
}
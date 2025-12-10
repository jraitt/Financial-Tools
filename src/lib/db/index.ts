import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

// Database file path - uses environment variable or default
// Remove 'file:' prefix if present (for compatibility with different formats)
const getDatabasePath = () => {
  const dbUrl = process.env.DATABASE_URL || './data/app.db';
  return dbUrl.replace(/^file:/, '');
};

let sqliteInstance: Database.Database | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

// Lazy initialization of database connection
const initDb = () => {
  if (!sqliteInstance) {
    const dbPath = getDatabasePath();
    sqliteInstance = new Database(dbPath);
    // Enable WAL mode for better concurrent access
    sqliteInstance.pragma('journal_mode = WAL');
    dbInstance = drizzle(sqliteInstance, { schema });
  }
  return { sqlite: sqliteInstance, db: dbInstance! };
};

// Export lazy getters
export const getDb = () => initDb().db;
export const getSqlite = () => initDb().sqlite;

// Export as db for backward compatibility
// This will be initialized on first access
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get: (target, prop) => {
    const { db: realDb } = initDb();
    return (realDb as any)[prop];
  },
});

// Export sqlite for backward compatibility
export const sqlite = new Proxy({} as Database.Database, {
  get: (target, prop) => {
    const { sqlite: realSqlite } = initDb();
    return (realSqlite as any)[prop];
  },
});

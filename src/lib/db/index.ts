import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

// Database file path - uses environment variable or default
const dbPath = process.env.DATABASE_URL || './data/app.db';

// Create better-sqlite3 connection
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent access
sqlite.pragma('journal_mode = WAL');

// Create Drizzle ORM instance
export const db = drizzle(sqlite, { schema });

// Export for direct access if needed
export { sqlite };

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

// Create SQLite database connection
const sqlite = new Database(process.env.DATABASE_URL?.replace('file:', '') || './dev.db');

// Create drizzle instance with schema
export const db = drizzle(sqlite, { schema });

export type DrizzleDB = typeof db;

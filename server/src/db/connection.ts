import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from '../config.js';
import { SCHEMA_SQL } from './schema.js';

export type DB = Database.Database;

/**
 * Open a SQLite database and apply the schema. Pass `:memory:` for tests to get
 * an isolated, fast, deterministic database per run.
 */
export function openDatabase(databasePath: string = config.databasePath): DB {
  if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }
  const db = new Database(databasePath);
  // WAL improves concurrent read throughput for the list/analytics endpoints.
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);
  return db;
}

// A lazily-created process-wide connection for the running server.
let singleton: DB | null = null;

export function getDatabase(): DB {
  if (!singleton) {
    singleton = openDatabase();
  }
  return singleton;
}

export function closeDatabase(): void {
  if (singleton) {
    singleton.close();
    singleton = null;
  }
}

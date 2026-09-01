import { mkdirSync } from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

const DIR = process.env.VERCEL
  ? path.join("/tmp", "heungtime-data")
  : path.join(process.cwd(), "data");

export const DATA_DIR = DIR;
export const DB_PATH = process.env.DATABASE_PATH ?? path.join(DIR, "heungtime.sqlite");

let db: DatabaseSync | null = null;

export function getDb() {
  if (db) return db;
  mkdirSync(DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS inventory (
      restaurant_id TEXT PRIMARY KEY,
      seats INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      confirmation_code TEXT UNIQUE NOT NULL,
      restaurant_id TEXT NOT NULL,
      json TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cpa_ledger (
      id TEXT PRIMARY KEY,
      booking_id TEXT UNIQUE NOT NULL,
      restaurant_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS oauth (
      sid TEXT PRIMARY KEY,
      access TEXT NOT NULL,
      refresh TEXT,
      exp INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_profiles (
      sync_key TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS walk_cache (
      cache_key TEXT PRIMARY KEY,
      minutes INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

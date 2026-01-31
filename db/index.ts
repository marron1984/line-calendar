import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'sync.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);

// Create table if not exists
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS event_maps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lw_event_id TEXT NOT NULL UNIQUE,
    google_event_id TEXT NOT NULL,
    lw_updated_at TEXT NOT NULL,
    last_synced_at INTEGER NOT NULL
  )
`);

export const db = drizzle(sqlite, { schema });

export async function getEventMap(lwEventId: string) {
  const results = await db
    .select()
    .from(schema.eventMaps)
    .where(eq(schema.eventMaps.lwEventId, lwEventId));
  return results[0] || null;
}

export async function upsertEventMap(
  lwEventId: string,
  googleEventId: string,
  lwUpdatedAt: string
) {
  const existing = await getEventMap(lwEventId);

  if (existing) {
    await db
      .update(schema.eventMaps)
      .set({
        googleEventId,
        lwUpdatedAt,
        lastSyncedAt: new Date(),
      })
      .where(eq(schema.eventMaps.lwEventId, lwEventId));
  } else {
    await db.insert(schema.eventMaps).values({
      lwEventId,
      googleEventId,
      lwUpdatedAt,
      lastSyncedAt: new Date(),
    });
  }
}

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import * as schema from './schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

// Initialize table (run once on first deployment)
export async function initializeDatabase() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS event_maps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lw_event_id TEXT NOT NULL UNIQUE,
      google_event_id TEXT NOT NULL,
      lw_updated_at TEXT NOT NULL,
      last_synced_at INTEGER NOT NULL
    )
  `);
}

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

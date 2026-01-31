import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const eventMaps = sqliteTable('event_maps', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  lwEventId: text('lw_event_id').notNull().unique(),
  googleEventId: text('google_event_id').notNull(),
  lwUpdatedAt: text('lw_updated_at').notNull(),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }).notNull(),
});

export type EventMap = typeof eventMaps.$inferSelect;
export type NewEventMap = typeof eventMaps.$inferInsert;

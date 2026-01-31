import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

export interface ScheduleMapping {
  scheduleId: string;
  googleEventId: string;
  updatedTime: string;
  createdAt: string;
}

class SyncDatabase {
  private db: Database.Database;

  constructor() {
    const dbDir = path.dirname(config.db.path);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(config.db.path);
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schedule_mappings (
        schedule_id TEXT PRIMARY KEY,
        google_event_id TEXT NOT NULL,
        updated_time TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  getMapping(scheduleId: string): ScheduleMapping | undefined {
    const stmt = this.db.prepare(`
      SELECT
        schedule_id as scheduleId,
        google_event_id as googleEventId,
        updated_time as updatedTime,
        created_at as createdAt
      FROM schedule_mappings
      WHERE schedule_id = ?
    `);
    return stmt.get(scheduleId) as ScheduleMapping | undefined;
  }

  getAllMappings(): ScheduleMapping[] {
    const stmt = this.db.prepare(`
      SELECT
        schedule_id as scheduleId,
        google_event_id as googleEventId,
        updated_time as updatedTime,
        created_at as createdAt
      FROM schedule_mappings
    `);
    return stmt.all() as ScheduleMapping[];
  }

  upsertMapping(scheduleId: string, googleEventId: string, updatedTime: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO schedule_mappings (schedule_id, google_event_id, updated_time)
      VALUES (?, ?, ?)
      ON CONFLICT(schedule_id) DO UPDATE SET
        google_event_id = excluded.google_event_id,
        updated_time = excluded.updated_time
    `);
    stmt.run(scheduleId, googleEventId, updatedTime);
  }

  deleteMapping(scheduleId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM schedule_mappings WHERE schedule_id = ?
    `);
    stmt.run(scheduleId);
  }

  close(): void {
    this.db.close();
  }
}

export const syncDb = new SyncDatabase();

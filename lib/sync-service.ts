import { prisma } from './prisma';
import { getConfig } from './config';
import { fetchLineWorksSchedules, LineWorksSchedule } from './lineworks-client';
import { createGoogleEvent, updateGoogleEvent, GoogleEventInput } from './google-client';

const LW_PREFIX = '[LW] ';

export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails: string[];
}

function toJST(date: Date): Date {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + 9 * 60 * 60 * 1000);
}

function getSyncDateRange(pastDays: number, futureDays: number): { fromDate: Date; toDate: Date } {
  const now = toJST(new Date());

  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - pastDays);
  fromDate.setHours(0, 0, 0, 0);

  const toDate = new Date(now);
  toDate.setDate(toDate.getDate() + futureDays);
  toDate.setHours(23, 59, 59, 999);

  return { fromDate, toDate };
}

function convertToGoogleEvent(schedule: LineWorksSchedule): GoogleEventInput {
  return {
    summary: `${LW_PREFIX}${schedule.summary || '(無題)'}`,
    description: schedule.description,
    start: schedule.start,
    end: schedule.end,
    location: schedule.location,
  };
}

export async function runSync(): Promise<SyncResult> {
  const config = getConfig();
  const { fromDate, toDate } = getSyncDateRange(config.sync.pastDays, config.sync.futureDays);

  console.log(`[SYNC] Starting sync...`);
  console.log(`[SYNC] Date range: ${fromDate.toISOString()} to ${toDate.toISOString()}`);

  const schedules = await fetchLineWorksSchedules(fromDate, toDate);
  console.log(`[SYNC] Fetched ${schedules.length} schedules from LINE WORKS`);

  if (schedules.length > config.sync.maxUpsert) {
    console.log(`[SYNC] Limiting to ${config.sync.maxUpsert} schedules (max upsert limit)`);
    schedules.splice(config.sync.maxUpsert);
  }

  const result: SyncResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  };

  for (const schedule of schedules) {
    try {
      const lwEventId = schedule.eventId;

      if (!lwEventId) {
        console.log(`[SYNC] Skipping schedule without eventId`);
        result.skipped++;
        continue;
      }

      const existingMapping = await prisma.eventMap.findUnique({
        where: { lwEventId },
      });

      if (!existingMapping) {
        const googleEvent = convertToGoogleEvent(schedule);
        const googleEventId = await createGoogleEvent(googleEvent, lwEventId);

        await prisma.eventMap.create({
          data: {
            lwEventId,
            googleEventId,
            lwUpdatedAt: schedule.updatedTime || new Date().toISOString(),
            lastSyncedAt: new Date(),
          },
        });

        console.log(`[SYNC] Created: ${schedule.summary} (${lwEventId})`);
        result.created++;
      } else if (schedule.updatedTime && schedule.updatedTime > existingMapping.lwUpdatedAt) {
        const googleEvent = convertToGoogleEvent(schedule);
        await updateGoogleEvent(existingMapping.googleEventId, googleEvent, lwEventId);

        await prisma.eventMap.update({
          where: { lwEventId },
          data: {
            lwUpdatedAt: schedule.updatedTime,
            lastSyncedAt: new Date(),
          },
        });

        console.log(`[SYNC] Updated: ${schedule.summary} (${lwEventId})`);
        result.updated++;
      } else {
        result.skipped++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[SYNC] Error syncing schedule ${schedule.eventId}:`, errorMessage);
      result.errors++;
      result.errorDetails.push(`${schedule.eventId}: ${errorMessage}`);
    }
  }

  console.log(`[SYNC] Completed: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors`);

  return result;
}

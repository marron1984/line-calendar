import { lineWorksClient, LineWorksSchedule } from '../lineworks/client';
import { googleCalendarClient, GoogleEventInput } from '../google/client';
import { syncDb } from '../db';
import { config } from '../config';

const LW_PREFIX = '[LW] ';

function convertToGoogleEvent(schedule: LineWorksSchedule): GoogleEventInput {
  return {
    summary: `${LW_PREFIX}${schedule.summary}`,
    description: schedule.description,
    start: schedule.start,
    end: schedule.end,
    location: schedule.location,
  };
}

function getSyncDateRange(): { fromDate: Date; toDate: Date } {
  const now = new Date();

  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - config.sync.daysBack);
  fromDate.setHours(0, 0, 0, 0);

  const toDate = new Date(now);
  toDate.setDate(toDate.getDate() + config.sync.daysForward);
  toDate.setHours(23, 59, 59, 999);

  return { fromDate, toDate };
}

export async function runSync(): Promise<void> {
  const startTime = new Date();
  console.log(`[${startTime.toISOString()}] Starting sync...`);

  try {
    const { fromDate, toDate } = getSyncDateRange();
    console.log(`Sync range: ${fromDate.toISOString()} to ${toDate.toISOString()}`);

    // Fetch schedules from LINE WORKS
    const schedules = await lineWorksClient.getSchedules(fromDate, toDate);
    console.log(`Fetched ${schedules.length} schedules from LINE WORKS`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const schedule of schedules) {
      try {
        const mapping = syncDb.getMapping(schedule.scheduleId);

        if (!mapping) {
          // New schedule - create in Google Calendar
          const googleEvent = convertToGoogleEvent(schedule);
          const googleEventId = await googleCalendarClient.createEvent(googleEvent);
          syncDb.upsertMapping(schedule.scheduleId, googleEventId, schedule.updatedTime);
          console.log(`Created: ${schedule.summary} (${schedule.scheduleId})`);
          created++;
        } else if (schedule.updatedTime > mapping.updatedTime) {
          // Updated schedule - update in Google Calendar
          const googleEvent = convertToGoogleEvent(schedule);
          await googleCalendarClient.updateEvent(mapping.googleEventId, googleEvent);
          syncDb.upsertMapping(schedule.scheduleId, mapping.googleEventId, schedule.updatedTime);
          console.log(`Updated: ${schedule.summary} (${schedule.scheduleId})`);
          updated++;
        } else {
          // No changes
          skipped++;
        }
      } catch (error) {
        console.error(`Error syncing schedule ${schedule.scheduleId}:`, error);
        errors++;
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    console.log(`[${endTime.toISOString()}] Sync completed in ${duration}ms`);
    console.log(`Results: ${created} created, ${updated} updated, ${skipped} skipped, ${errors} errors`);
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

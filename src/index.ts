import cron from 'node-cron';
import { config } from './config';
import { runSync } from './sync/scheduler';

const isOnce = process.argv.includes('--once');

async function main(): Promise<void> {
  console.log('LINE WORKS to Google Calendar Sync');
  console.log('===================================');

  if (isOnce) {
    console.log('Running single sync...');
    await runSync();
    process.exit(0);
  }

  console.log(`Starting cron scheduler: ${config.sync.cronSchedule}`);
  console.log('Press Ctrl+C to stop\n');

  // Run immediately on startup
  await runSync();

  // Schedule periodic sync
  cron.schedule(config.sync.cronSchedule, async () => {
    await runSync();
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

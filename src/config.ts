import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  // LINE WORKS
  lineworks: {
    clientId: requireEnv('LINEWORKS_CLIENT_ID'),
    clientSecret: requireEnv('LINEWORKS_CLIENT_SECRET'),
    serviceAccount: requireEnv('LINEWORKS_SERVICE_ACCOUNT'),
    privateKey: requireEnv('LINEWORKS_PRIVATE_KEY').replace(/\\n/g, '\n'),
    botId: requireEnv('LINEWORKS_BOT_ID'),
    domainId: requireEnv('LINEWORKS_DOMAIN_ID'),
    targetUserId: requireEnv('LINEWORKS_TARGET_USER_ID'),
  },

  // Google Calendar
  google: {
    serviceAccountEmail: requireEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
    privateKey: requireEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    calendarId: requireEnv('GOOGLE_CALENDAR_ID'),
  },

  // Sync settings
  sync: {
    daysBack: 30,
    daysForward: 180,
    cronSchedule: '*/10 * * * *', // Every 10 minutes
  },

  // Database
  db: {
    path: process.env.DB_PATH || path.join(process.cwd(), 'data', 'sync.db'),
  },
};

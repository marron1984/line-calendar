function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function parsePrivateKey(key: string): string {
  return key.replace(/\\n/g, '\n');
}

function decodeBase64Json<T>(base64: string): T {
  const json = Buffer.from(base64, 'base64').toString('utf-8');
  return JSON.parse(json) as T;
}

interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
}

export function getConfig() {
  const googleServiceAccountJson = getEnvOrThrow('GOOGLE_SERVICE_ACCOUNT_JSON_B64');
  const googleServiceAccount = decodeBase64Json<GoogleServiceAccount>(googleServiceAccountJson);

  return {
    lineworks: {
      accessToken: getEnvOrThrow('LW_ACCESS_TOKEN'),
      userId: getEnvOrDefault('LW_USER_ID', 'me'),
    },
    google: {
      serviceAccountEmail: googleServiceAccount.client_email,
      privateKey: parsePrivateKey(googleServiceAccount.private_key),
      calendarId: getEnvOrThrow('GOOGLE_CALENDAR_ID'),
    },
    sync: {
      pastDays: parseInt(getEnvOrDefault('SYNC_PAST_DAYS', '30'), 10),
      futureDays: parseInt(getEnvOrDefault('SYNC_FUTURE_DAYS', '180'), 10),
      maxUpsert: parseInt(getEnvOrDefault('SYNC_MAX_UPSERT', '500'), 10),
    },
    cron: {
      secret: getEnvOrThrow('CRON_SECRET'),
    },
  };
}

export type Config = ReturnType<typeof getConfig>;

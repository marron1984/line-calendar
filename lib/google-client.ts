import { google, calendar_v3 } from 'googleapis';
import { getConfig } from './config';

export interface GoogleEventInput {
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

function getCalendarClient(): { calendar: calendar_v3.Calendar; calendarId: string } {
  const config = getConfig();

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config.google.serviceAccountEmail,
      private_key: config.google.privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  const calendar = google.calendar({ version: 'v3', auth });

  return { calendar, calendarId: config.google.calendarId };
}

export async function createGoogleEvent(
  event: GoogleEventInput,
  lwEventId: string
): Promise<string> {
  const { calendar, calendarId } = getCalendarClient();

  const response = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: event.start,
      end: event.end,
      location: event.location,
      extendedProperties: {
        private: {
          lwEventId,
        },
      },
    },
  });

  if (!response.data.id) {
    throw new Error('Failed to create event: no event ID returned');
  }

  return response.data.id;
}

export async function updateGoogleEvent(
  googleEventId: string,
  event: GoogleEventInput,
  lwEventId: string
): Promise<void> {
  const { calendar, calendarId } = getCalendarClient();

  await calendar.events.patch({
    calendarId,
    eventId: googleEventId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: event.start,
      end: event.end,
      location: event.location,
      extendedProperties: {
        private: {
          lwEventId,
        },
      },
    },
  });
}

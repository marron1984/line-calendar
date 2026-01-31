import { google, calendar_v3 } from 'googleapis';
import { config } from '../config';

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
}

class GoogleCalendarClient {
  private calendar: calendar_v3.Calendar;
  private calendarId: string;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: config.google.serviceAccountEmail,
        private_key: config.google.privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    this.calendar = google.calendar({ version: 'v3', auth });
    this.calendarId = config.google.calendarId;
  }

  async createEvent(event: GoogleEventInput): Promise<string> {
    const response = await this.calendar.events.insert({
      calendarId: this.calendarId,
      requestBody: {
        summary: event.summary,
        description: event.description,
        start: event.start,
        end: event.end,
        location: event.location,
      },
    });

    if (!response.data.id) {
      throw new Error('Failed to create event: no event ID returned');
    }

    return response.data.id;
  }

  async updateEvent(eventId: string, event: GoogleEventInput): Promise<void> {
    await this.calendar.events.update({
      calendarId: this.calendarId,
      eventId,
      requestBody: {
        summary: event.summary,
        description: event.description,
        start: event.start,
        end: event.end,
        location: event.location,
      },
    });
  }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId,
      });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 404) {
        // Event already deleted, ignore
        return;
      }
      throw error;
    }
  }

  async getEvent(eventId: string): Promise<calendar_v3.Schema$Event | null> {
    try {
      const response = await this.calendar.events.get({
        calendarId: this.calendarId,
        eventId,
      });
      return response.data;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 404) {
        return null;
      }
      throw error;
    }
  }
}

export const googleCalendarClient = new GoogleCalendarClient();

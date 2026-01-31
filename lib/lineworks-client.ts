import { getConfig } from './config';

export interface LineWorksSchedule {
  eventId: string;
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
  updatedTime?: string;
}

interface ScheduleApiResponse {
  events?: LineWorksSchedule[];
  schedules?: LineWorksSchedule[];
  responseList?: LineWorksSchedule[];
}

function formatDateTimeWithOffset(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
}

export async function fetchLineWorksSchedules(
  fromDate: Date,
  toDate: Date
): Promise<LineWorksSchedule[]> {
  const config = getConfig();
  const userId = config.lineworks.userId;
  const accessToken = config.lineworks.accessToken;

  const fromDateTime = formatDateTimeWithOffset(fromDate);
  const untilDateTime = formatDateTimeWithOffset(toDate);

  const params = new URLSearchParams({
    fromDateTime,
    untilDateTime,
  });

  const url = `https://www.worksapis.com/v1.0/users/${userId}/calendar/events?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LINE WORKS API error: ${response.status} - ${errorText}`);
  }

  const data: ScheduleApiResponse = await response.json();

  const schedules = data.events || data.schedules || data.responseList || [];

  return schedules;
}

import axios, { AxiosInstance } from 'axios';
import * as jose from 'jose';
import { config } from '../config';

export interface LineWorksSchedule {
  scheduleId: string;
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
  updatedTime: string;
  createdTime: string;
  organizer?: {
    userId: string;
    name?: string;
  };
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

class LineWorksClient {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://www.worksapis.com/v1.0',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async generateJWT(): Promise<string> {
    const privateKey = await jose.importPKCS8(config.lineworks.privateKey, 'RS256');

    const now = Math.floor(Date.now() / 1000);
    const jwt = await new jose.SignJWT({
      iss: config.lineworks.clientId,
      sub: config.lineworks.serviceAccount,
      iat: now,
      exp: now + 3600,
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .sign(privateKey);

    return jwt;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const jwt = await this.generateJWT();

    const params = new URLSearchParams();
    params.append('assertion', jwt);
    params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
    params.append('client_id', config.lineworks.clientId);
    params.append('client_secret', config.lineworks.clientSecret);
    params.append('scope', 'calendar');

    const response = await axios.post<TokenResponse>(
      'https://auth.worksmobile.com/oauth2/v2.0/token',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    this.accessToken = response.data.access_token;
    this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 60) * 1000);

    return this.accessToken;
  }

  async getSchedules(fromDate: Date, toDate: Date): Promise<LineWorksSchedule[]> {
    const token = await this.getAccessToken();
    const userId = config.lineworks.targetUserId;

    const fromDateStr = fromDate.toISOString().split('T')[0];
    const toDateStr = toDate.toISOString().split('T')[0];

    const schedules: LineWorksSchedule[] = [];
    let cursor: string | undefined;

    do {
      const params: Record<string, string> = {
        fromDate: fromDateStr,
        toDate: toDateStr,
        limit: '100',
      };

      if (cursor) {
        params.cursor = cursor;
      }

      const response = await this.client.get<{
        schedules: LineWorksSchedule[];
        nextCursor?: string;
      }>(`/users/${userId}/calendar/schedules`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      });

      schedules.push(...response.data.schedules);
      cursor = response.data.nextCursor;
    } while (cursor);

    return schedules;
  }
}

export const lineWorksClient = new LineWorksClient();

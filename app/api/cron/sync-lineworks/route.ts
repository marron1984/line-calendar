import { NextRequest, NextResponse } from 'next/server';
import { runSync } from '@/lib/sync-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validateCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[AUTH] CRON_SECRET is not configured');
    return false;
  }

  const headerSecret = request.headers.get('x-cron-secret');
  if (headerSecret === cronSecret) {
    return true;
  }

  const url = new URL(request.url);
  const querySecret = url.searchParams.get('secret');
  if (querySecret === cronSecret) {
    return true;
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  if (!validateCronSecret(request)) {
    console.log('[AUTH] Unauthorized access attempt');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    console.log('[CRON] Starting LINE WORKS to Google Calendar sync');

    const result = await runSync();

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      result: {
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors,
      },
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[CRON] Sync failed:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

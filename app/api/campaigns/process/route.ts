import { NextRequest, NextResponse } from 'next/server';
import { processAllCampaigns, processCampaign } from '@/lib/campaign-processor';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorizedCron } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Campaign processing trigger.
 *
 * Authorized callers:
 *   1. A scheduler presenting CRON_SECRET (see lib/cron-auth.ts), or
 *   2. A logged-in user session (the dashboard).
 *
 * The old "x-internal-trigger: true" header bypass is removed; that
 * header was guessable by anyone on the internet.
 */
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const campaignId = url.searchParams.get('campaignId');

  if (!isAuthorizedCron(req)) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    if (campaignId) {
      const result = await processCampaign(campaignId);
      return NextResponse.json(result);
    }

    const results = await processAllCampaigns();
    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Process campaigns error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Allow GET for easier cron triggers (?secret=... in the URL works)
  return POST(req);
}
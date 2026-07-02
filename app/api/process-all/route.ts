import { NextRequest, NextResponse } from 'next/server';
import { processAllCampaigns } from '@/lib/campaign-processor';
import { processDripSequences } from '@/lib/drip-processor';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorizedCron } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Combined endpoint that processes both campaigns and drip sequences.
 * This is the endpoint your scheduled cron job should call.
 *
 * SECURITY: This route previously had NO authentication at all, so any
 * stranger could trigger your sending machinery. It now requires either
 * CRON_SECRET (for the scheduler) or a logged-in session (for you).
 *
 * Cron setup example (every 2 minutes):
 *   GET https://yourapp.example.com/api/process-all?secret=YOUR_CRON_SECRET
 * or with a header, which keeps the secret out of URL logs:
 *   Authorization: Bearer YOUR_CRON_SECRET
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const [campaignResults, dripResults] = await Promise.all([
      processAllCampaigns(),
      processDripSequences(),
    ]);

    return NextResponse.json({
      campaigns: campaignResults,
      drips: dripResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Process all error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
import { NextRequest, NextResponse } from 'next/server';
import { processDripSequences } from '@/lib/drip-processor';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorizedCron } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Drip sequence processing trigger. Same authorization model as
 * /api/campaigns/process: a scheduler with CRON_SECRET, or a logged-in
 * session. The guessable "x-internal-trigger" bypass is removed.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const results = await processDripSequences();
    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Process drip sequences error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
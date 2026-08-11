/** Route 9: GET /api/mcp/stats/bounces — Recent bounce records */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateMcpRequest } from '@/lib/mcp-auth';

export async function GET(req: NextRequest) {
  const auth = validateMcpRequest(req);
  if (!auth.ok) return auth.error!;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

  const bouncedLogs = await prisma.emailLog.findMany({
    where: { status: 'BOUNCED' },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    include: {
      campaign: { select: { id: true, name: true } },
    },
  });

  // Also get bounced emails from the BouncedEmail table
  const bouncedEmails = await prisma.bouncedEmail.findMany({
    orderBy: { lastBounceAt: 'desc' },
    take: limit,
    select: { email: true, bounceCount: true, lastBounceAt: true, reason: true, isBlacklisted: true },
  });

  return NextResponse.json({
    bounces: bouncedLogs.map((log) => ({
      email: log.recipientEmail,
      campaign_id: log.campaignId || '',
      campaign_name: log.campaign?.name || '',
      bounce_type: 'hard',
      reason: log.error || 'Unknown',
      bounced_at: log.updatedAt.toISOString(),
    })),
    suppressed: bouncedEmails.map((b) => ({
      email: b.email,
      bounce_count: b.bounceCount,
      last_bounce: b.lastBounceAt.toISOString(),
      reason: b.reason || 'Unknown',
      blacklisted: b.isBlacklisted,
    })),
    total: bouncedLogs.length,
  });
}

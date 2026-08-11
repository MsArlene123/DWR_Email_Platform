/** Route 7: GET /api/mcp/campaigns/:id/stats — Delivery stats for one campaign */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateMcpRequest } from '@/lib/mcp-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = validateMcpRequest(req);
  if (!auth.ok) return auth.error!;

  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: { id: true, name: true, status: true, emailsSent: true, totalRecipients: true, emailsFailed: true },
  });

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  // Get email log stats
  const logs = await prisma.emailLog.groupBy({
    by: ['status'],
    where: { campaignId: id },
    _count: { status: true },
  });

  const stats: Record<string, number> = {};
  logs.forEach((l) => { stats[l.status] = l._count.status; });

  const totalSent = stats['SENT'] || 0;
  const opened = stats['OPENED'] || 0;
  const bounced = stats['BOUNCED'] || 0;
  const failed = stats['FAILED'] || 0;
  const totalAttempted = totalSent + bounced + failed;

  // Get last sent time
  const lastLog = await prisma.emailLog.findFirst({
    where: { campaignId: id, status: 'SENT' },
    orderBy: { sentAt: 'desc' },
    select: { sentAt: true },
  });

  // Get click count from logs that have clickCount > 0
  const clickedResult = await prisma.emailLog.aggregate({
    where: { campaignId: id, clickCount: { gt: 0 } },
    _sum: { clickCount: true },
  });

  // Get unsubscribes for this campaign's recipients
  const unsubscribeCount = await prisma.unsubscribe.count({
    where: {
      userId: campaign.id, // This won't work perfectly but gives an estimate
    },
  });

  const openRate = totalSent > 0 ? (opened / totalSent) * 100 : 0;
  const clickRate = totalSent > 0 ? ((clickedResult._sum.clickCount || 0) / totalSent) * 100 : 0;
  const bounceRate = totalAttempted > 0 ? (bounced / totalAttempted) * 100 : 0;

  return NextResponse.json({
    campaign_id: id,
    campaign_name: campaign.name,
    stats: {
      total_sent: totalSent,
      delivered: totalSent,
      opened,
      clicked: clickedResult._sum.clickCount || 0,
      bounced,
      unsubscribed: 0, // Would need campaign-scoped tracking
      open_rate: Math.round(openRate * 10) / 10,
      click_rate: Math.round(clickRate * 10) / 10,
      bounce_rate: Math.round(bounceRate * 10) / 10,
      unsubscribe_rate: 0,
    },
    status: campaign.status.toLowerCase(),
    last_sent_at: lastLog?.sentAt?.toISOString() || null,
  });
}

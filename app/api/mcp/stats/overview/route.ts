/** Route 8: GET /api/mcp/stats/overview — Aggregate stats across all campaigns */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateMcpRequest } from '@/lib/mcp-auth';

export async function GET(req: NextRequest) {
  const auth = validateMcpRequest(req);
  if (!auth.ok) return auth.error!;

  const [totalCampaigns, activeCampaigns, allLogs] = await Promise.all([
    prisma.campaign.count(),
    prisma.campaign.count({ where: { status: 'RUNNING' } }),
    prisma.emailLog.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
  ]);

  const stats: Record<string, number> = {};
  allLogs.forEach((l) => { stats[l.status] = l._count.status; });

  const totalSent = stats['SENT'] || 0;
  const opened = stats['OPENED'] || 0;
  const bounced = stats['BOUNCED'] || 0;
  const totalAttempted = totalSent + bounced + (stats['FAILED'] || 0);

  const openRate = totalSent > 0 ? (opened / totalSent) * 100 : 0;
  const bounceRate = totalAttempted > 0 ? (bounced / totalAttempted) * 100 : 0;

  let senderHealth = 'good';
  if (bounceRate >= 5) senderHealth = 'critical';
  else if (bounceRate >= 3) senderHealth = 'warning';

  return NextResponse.json({
    total_campaigns: totalCampaigns,
    active_campaigns: activeCampaigns,
    total_sent: totalSent,
    total_delivered: totalSent,
    total_opened: opened,
    total_bounced: bounced,
    overall_open_rate: Math.round(openRate * 10) / 10,
    overall_bounce_rate: Math.round(bounceRate * 10) / 10,
    sender_health: senderHealth,
    last_updated: new Date().toISOString(),
  });
}

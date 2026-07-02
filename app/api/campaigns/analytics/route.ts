export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const campaigns = await prisma.campaign.findMany({
    where: { userId: session.user.id },
    include: {
      emailAccount: { select: { email: true } },
      template: { select: { name: true } },
      _count: { select: { emailLogs: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const results = await Promise.all(
    campaigns.map(async (c) => {
      const stats = await prisma.emailLog.groupBy({
        by: ['status'],
        where: { campaignId: c.id },
        _count: true,
      });

      const clickedCount = await prisma.emailLog.count({
        where: { campaignId: c.id, clickCount: { gt: 0 } },
      });

      const statusMap: Record<string, number> = {};
      for (const s of stats) {
        statusMap[s.status] = s._count;
      }

      const totalSent = (statusMap['SENT'] || 0) + (statusMap['OPENED'] || 0);
      const totalOpened = statusMap['OPENED'] || 0;
      const totalFailed = statusMap['FAILED'] || 0;
      const totalPending = (statusMap['PENDING'] || 0) + (statusMap['RETRY'] || 0);
      const totalBounced = statusMap['BOUNCED'] || 0;
      const totalRecipients = c._count.emailLogs;

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        createdAt: c.createdAt,
        actualStart: c.actualStart,
        completedAt: c.completedAt,
        emailAccount: c.emailAccount?.email || 'N/A',
        template: c.template?.name || 'N/A',
        totalRecipients,
        totalSent,
        totalOpened,
        totalClicked: clickedCount,
        totalFailed,
        totalPending,
        totalBounced,
        openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
        clickRate: totalSent > 0 ? Math.round((clickedCount / totalSent) * 100) : 0,
      };
    })
  );

  return NextResponse.json({ campaigns: results });
}

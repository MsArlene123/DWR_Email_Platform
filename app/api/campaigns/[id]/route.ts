import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      emailAccount: true,
      googleSheet: true,
      template: true,
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const logs = await prisma.emailLog.findMany({
    where: { campaignId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const stats = await prisma.emailLog.groupBy({
    by: ['status'],
    where: { campaignId: params.id },
    _count: true,
  });

  return NextResponse.json({ campaign, logs, stats });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  await prisma.campaign.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

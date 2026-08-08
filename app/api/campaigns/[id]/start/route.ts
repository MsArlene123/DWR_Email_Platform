import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { internalTriggerHeaders } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

export async function POST(
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

  if (campaign.status === 'COMPLETED') {
    return NextResponse.json(
      { error: 'Campaign already completed' },
      { status: 400 }
    );
  }

  const updated = await prisma.campaign.update({
    where: { id: params.id },
    data: {
      status: 'RUNNING',
      actualStart: campaign.actualStart || new Date(),
    },
  });

  // Trigger an immediate processing pass, authenticated with CRON_SECRET
  // instead of the old guessable x-internal-trigger header. If CRON_SECRET
  // is not configured, this call gets a 401 and the next scheduled cron
  // run sends the first email instead, so the campaign still proceeds.
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    fetch(`${baseUrl}/api/campaigns/process?campaignId=${params.id}`, {
      method: 'POST',
      headers: internalTriggerHeaders(),
    }).catch(() => {});
  } catch (e) {
    // ignore
  }

  return NextResponse.json({ campaign: updated });
}
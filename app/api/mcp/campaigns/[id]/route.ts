/** Route 6: PATCH /api/mcp/campaigns/:id — Pause, resume, or reschedule */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateMcpRequest } from '@/lib/mcp-auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = validateMcpRequest(req);
  if (!auth.ok) return auth.error!;

  const { id } = await params;
  const { action, schedule } = await req.json();

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  let newStatus = campaign.status;
  let scheduledStart = campaign.scheduledStart;

  switch (action) {
    case 'pause':
      newStatus = 'PAUSED';
      break;
    case 'resume':
      newStatus = 'RUNNING';
      break;
    case 'reschedule':
      if (!schedule) {
        return NextResponse.json({ error: 'schedule is required for reschedule' }, { status: 400 });
      }
      scheduledStart = new Date(schedule);
      newStatus = 'SCHEDULED';
      break;
    default:
      return NextResponse.json({ error: `Invalid action: ${action}. Use pause, resume, or reschedule.` }, { status: 400 });
  }

  await prisma.campaign.update({
    where: { id },
    data: { status: newStatus, scheduledStart },
  });

  return NextResponse.json({
    id,
    status: newStatus.toLowerCase(),
    message: `Campaign ${action}ed successfully`,
  });
}

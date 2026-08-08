import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDataScope } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scope = await getDataScope();

  const sequences = await prisma.dripSequence.findMany({
    where: scope,
    orderBy: { createdAt: 'desc' },
    include: {
      emailAccount: true,
      steps: {
        orderBy: { stepOrder: 'asc' },
        include: { template: true },
      },
    },
  });

  return NextResponse.json({ sequences });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scope = await getDataScope();

  try {
    const body = await req.json();
    const { name, description, googleSheetId, emailAccountId, steps, sendingIntervalMinutes } = body;

    if (!name || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { error: 'Name and at least one step are required' },
        { status: 400 }
      );
    }

    // Validate all steps have templateId and subject
    for (const step of steps) {
      if (!step.templateId || !step.subject) {
        return NextResponse.json(
          { error: 'All steps must have templateId and subject' },
          { status: 400 }
        );
      }
    }

    const sequence = await prisma.dripSequence.create({
      data: {
        userId: session.user.id,
        name,
        description: description || null,
        emailAccountId: emailAccountId || null,
        googleSheetId: googleSheetId || null,
        sendingIntervalMinutes: sendingIntervalMinutes || 5,
        isActive: false,
        steps: {
          create: steps.map((step: any, idx: number) => ({
            stepOrder: idx + 1,
            templateId: step.templateId,
            subject: step.subject,
            delayDays: step.delayDays || 0,
            delayHours: step.delayHours || 0,
          })),
        },
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    return NextResponse.json({ sequence });
  } catch (error: any) {
    console.error('Create sequence error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create sequence' },
      { status: 500 }
    );
  }
}

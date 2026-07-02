import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseGoogleSheet } from '@/lib/sheets-parser';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sequence = await prisma.dripSequence.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      emailAccount: true,
      steps: {
        orderBy: { stepOrder: 'asc' },
        include: { template: true },
      },
      progress: {
        orderBy: [{ completed: 'asc' }, { nextEmailDue: 'asc' }],
      },
      _count: {
        select: { progress: true },
      },
    },
  });

  if (!sequence) {
    return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
  }

  return NextResponse.json({ sequence });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sequence = await prisma.dripSequence.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!sequence) {
    return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
  }

  await prisma.dripSequence.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sequence = await prisma.dripSequence.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { steps: true, progress: true },
  });

  if (!sequence) {
    return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
  }

  const body = await req.json();
  const { isActive, name, description, googleSheetId, emailAccountId, sendingIntervalMinutes } = body;

  const updated = await prisma.dripSequence.update({
    where: { id: params.id },
    data: {
      ...(isActive !== undefined && { isActive }),
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(googleSheetId !== undefined && { googleSheetId }),
      ...(emailAccountId !== undefined && { emailAccountId: emailAccountId || null }),
      ...(sendingIntervalMinutes !== undefined && { sendingIntervalMinutes }),
    },
  });

  let enrollResult = null;

  // If activating the sequence, auto-enroll recipients if none exist
  if (isActive === true && sequence.googleSheetId && sequence.steps.length > 0 && sequence.progress.length === 0) {
    try {
      enrollResult = await autoEnrollRecipients(params.id, sequence.googleSheetId);
    } catch (e: any) {
      console.error('Auto-enroll error:', e);
      enrollResult = { error: e.message };
    }
  }

  // If sequence was just activated (and has enrolled recipients), trigger processing
  if (isActive === true) {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      fetch(`${baseUrl}/api/drip-sequences/process`, {
        method: 'POST',
        headers: { 'x-internal-trigger': 'true' },
      }).catch(() => {});
    } catch (e) {
      // ignore
    }
  }

  return NextResponse.json({ sequence: updated, enrollResult });
}

/**
 * Auto-enroll all recipients from the assigned Google Sheet
 */
async function autoEnrollRecipients(sequenceId: string, sheetId: string) {
  const sheet = await prisma.googleSheet.findUnique({ where: { id: sheetId } });
  if (!sheet) return { error: 'Sheet not found' };

  const parsed = await parseGoogleSheet(sheet.sheetUrl);
  if (parsed.error || !parsed.emailColumn) {
    return { error: parsed.error || 'No email column found in sheet' };
  }

  const validEmails = parsed.rows
    .map((r) => (r[parsed.emailColumn!] || '').trim().toLowerCase())
    .filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  const uniqueEmails = Array.from(new Set(validEmails));

  if (uniqueEmails.length === 0) {
    return { enrolled: 0, message: 'No valid emails found in sheet' };
  }

  const existing = await prisma.recipientProgress.findMany({
    where: { dripSequenceId: sequenceId, recipientEmail: { in: uniqueEmails } },
    select: { recipientEmail: true },
  });
  const existingEmails = new Set(existing.map((e) => e.recipientEmail));
  const newEmails = uniqueEmails.filter((e) => !existingEmails.has(e));

  if (newEmails.length === 0) {
    return { enrolled: 0, alreadyEnrolled: existingEmails.size, message: 'All recipients already enrolled' };
  }

  const now = new Date();
  await prisma.recipientProgress.createMany({
    data: newEmails.map((email) => ({
      dripSequenceId: sequenceId,
      recipientEmail: email,
      currentStep: 0,
      completed: false,
      nextEmailDue: now,
    })),
  });

  return { enrolled: newEmails.length, alreadyEnrolled: existingEmails.size };
}

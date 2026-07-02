import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { enrollFromSheet } from '@/lib/drip-enrollment';

export const dynamic = 'force-dynamic';

/**
 * POST /api/drip-sequences/[id]/enroll
 *
 * Reads the assigned Google Sheet and enrolls all new contacts
 * into the drip sequence. Skips contacts already enrolled,
 * unsubscribed, or blacklisted.
 *
 * Can be called multiple times safely. Each call picks up only
 * new contacts added to the sheet since the last enrollment.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify the sequence belongs to this user
  const sequence = await prisma.dripSequence.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!sequence) {
    return NextResponse.json({ error: 'Drip sequence not found' }, { status: 404 });
  }

  try {
    const result = await enrollFromSheet(params.id);

    return NextResponse.json({
      success: true,
      enrolled: result.enrolled,
      skipped: result.skipped,
      errors: result.errors,
      message: result.enrolled > 0
        ? `Enrolled ${result.enrolled} new contacts (${result.skipped} skipped)`
        : `No new contacts to enroll (${result.skipped} already enrolled or excluded)`,
    });
  } catch (error: any) {
    console.error('Drip enrollment error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to enroll contacts' },
      { status: 500 }
    );
  }
}
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

  const bouncedEmails = await prisma.bouncedEmail.findMany({
    where: scope,
    orderBy: { lastBounceAt: 'desc' },
  });

  return NextResponse.json({ bouncedEmails });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scope = await getDataScope();

  const body = await req.json();

  // Clear all bounce records for this user
  if (body.clearAll) {
    const result = await prisma.bouncedEmail.deleteMany({
      where: scope,
    });
    return NextResponse.json({ success: true, deleted: result.count });
  }

  // Delete a single record
  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  const record = await prisma.bouncedEmail.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!record) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.bouncedEmail.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scope = await getDataScope();

  const { id, isBlacklisted } = await req.json();
  if (!id || isBlacklisted === undefined) {
    return NextResponse.json({ error: 'ID and isBlacklisted are required' }, { status: 400 });
  }

  const record = await prisma.bouncedEmail.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!record) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updated = await prisma.bouncedEmail.update({
    where: { id },
    data: { isBlacklisted },
  });

  return NextResponse.json({ bouncedEmail: updated });
}

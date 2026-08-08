import { NextResponse } from 'next/server';
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

  const unsubscribes = await prisma.unsubscribe.findMany({
    where: scope,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ unsubscribes });
}
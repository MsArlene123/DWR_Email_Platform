import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const templates = await prisma.emailTemplate.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isSample: 'desc' }, { category: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, category, subject, htmlContent, plainText } = body;

    if (!name || !category || !subject || !htmlContent) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, subject, htmlContent' },
        { status: 400 }
      );
    }

    const template = await prisma.emailTemplate.create({
      data: {
        userId: session.user.id,
        name,
        category,
        subject,
        htmlContent,
        plainText: plainText || null,
        isSample: false,
      },
    });

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error('Create template error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create template' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const template = await prisma.emailTemplate.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const duplicated = await prisma.emailTemplate.create({
    data: {
      userId: session.user.id,
      name: `${template.name} (Copy)`,
      category: template.category,
      subject: template.subject,
      htmlContent: template.htmlContent,
      plainText: template.plainText,
      isSample: false,
    },
  });

  return NextResponse.json({ template: duplicated });
}

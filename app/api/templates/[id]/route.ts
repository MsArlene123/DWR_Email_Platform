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

  const template = await prisma.emailTemplate.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  return NextResponse.json({ template });
}

export async function PATCH(
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

  try {
    const body = await req.json();
    const { name, category, subject, htmlContent, plainText } = body;

    const updated = await prisma.emailTemplate.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(subject !== undefined && { subject }),
        ...(htmlContent !== undefined && { htmlContent }),
        ...(plainText !== undefined && { plainText }),
        // If editing a sample, create a custom copy (handled in UI by creating new)
        // Here we just update whatever is editable
      },
    });

    return NextResponse.json({ template: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

  // Check if template is used in any campaigns or drip steps
  const [campaignCount, stepCount] = await Promise.all([
    prisma.campaign.count({ where: { templateId: params.id } }),
    prisma.dripSequenceStep.count({ where: { templateId: params.id } }),
  ]);

  if (campaignCount > 0 || stepCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete template - it is used in ${campaignCount} campaign(s) and ${stepCount} drip step(s)`,
      },
      { status: 400 }
    );
  }

  await prisma.emailTemplate.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

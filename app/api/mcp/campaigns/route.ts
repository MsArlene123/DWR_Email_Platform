/** Route 4: GET /api/mcp/campaigns — Return all campaigns */
/** Route 5: POST /api/mcp/campaigns — Create a new campaign */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateMcpRequest } from '@/lib/mcp-auth';

export async function GET(req: NextRequest) {
  const auth = validateMcpRequest(req);
  if (!auth.ok) return auth.error!;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status')?.toUpperCase();

  const campaigns = await prisma.campaign.findMany({
    where: status ? { status: status as any } : {},
    orderBy: { createdAt: 'desc' },
    include: {
      googleSheet: { select: { id: true, name: true } },
      emailAccount: { select: { email: true, displayName: true } },
      template: { select: { name: true } },
    },
  });

  return NextResponse.json({
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status.toLowerCase(),
      subject: c.subject,
      sender_name: c.emailAccount?.displayName || '',
      sender_email: c.emailAccount?.email || '',
      list_id: c.googleSheet?.id || '',
      list_name: c.googleSheet?.name || '',
      template_name: c.template?.name || '',
      scheduled_at: c.scheduledStart?.toISOString() || null,
      sent_count: c.emailsSent,
      total_recipients: c.totalRecipients,
      created_at: c.createdAt.toISOString(),
    })),
    total: campaigns.length,
  });
}

export async function POST(req: NextRequest) {
  const auth = validateMcpRequest(req);
  if (!auth.ok) return auth.error!;

  const { name, subject, body, sender_name, sender_email, list_id, schedule } = await req.json();

  if (!name || !subject || !list_id) {
    return NextResponse.json({ error: 'name, subject, and list_id are required' }, { status: 400 });
  }

  const userId = await getFirstUserId();

  // Find the email account
  const account = await prisma.emailAccount.findFirst({
    where: { email: sender_email, userId },
    select: { id: true },
  });
  if (!account) {
    return NextResponse.json({ error: `Email account not found: ${sender_email}` }, { status: 404 });
  }

  // Find or create a template
  let template = await prisma.emailTemplate.findFirst({
    where: { userId, name },
    select: { id: true },
  });
  if (!template) {
    template = await prisma.emailTemplate.create({
      data: {
        userId,
        name,
        category: 'CUSTOM',
        subject,
        htmlContent: body || `<p>${subject}</p>`,
        plainText: body?.replace(/<[^>]+>/g, '') || subject,
        isSample: false,
      },
    });
  }

  // Verify list exists
  const sheet = await prisma.googleSheet.findUnique({ where: { id: list_id }, select: { id: true, recipientCount: true } });
  if (!sheet) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  // Create campaign
  const scheduledDate = schedule ? new Date(schedule) : null;
  const campaign = await prisma.campaign.create({
    data: {
      userId,
      name,
      status: scheduledDate ? 'SCHEDULED' : 'DRAFT',
      emailAccountId: account.id,
      googleSheetId: sheet.id,
      templateId: template.id,
      subject,
      sendingRate: 3,
      scheduledStart: scheduledDate,
      totalRecipients: sheet.recipientCount,
    },
  });

  return NextResponse.json({
    id: campaign.id,
    name: campaign.name,
    status: campaign.status.toLowerCase(),
    subject: campaign.subject,
    sender_name,
    sender_email,
    list_id: sheet.id,
    scheduled_at: campaign.scheduledStart?.toISOString() || null,
    created_at: campaign.createdAt.toISOString(),
  }, { status: 201 });
}

async function getFirstUserId(): Promise<string> {
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
  if (!user) {
    const anyUser = await prisma.user.findFirst({ select: { id: true } });
    if (!anyUser) throw new Error('No users found');
    return anyUser.id;
  }
  return user.id;
}

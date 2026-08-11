/** Route 10: GET /api/mcp/contacts/search — Find a contact across all lists */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateMcpRequest } from '@/lib/mcp-auth';

export async function GET(req: NextRequest) {
  const auth = validateMcpRequest(req);
  if (!auth.ok) return auth.error!;

  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'email parameter is required' }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Find the contact
  const contact = await prisma.contact.findFirst({
    where: { email: normalizedEmail },
    include: {
      // Find which lists (GoogleSheets) this contact is on
    },
  });

  if (!contact) {
    return NextResponse.json({
      email: normalizedEmail,
      found: false,
      lists: [],
      send_history: null,
    });
  }

  // Find which lists this contact belongs to (by listName/sourceSheetId)
  const lists = await prisma.googleSheet.findMany({
    where: {
      OR: [
        { id: contact.sourceSheetId || '' },
        { name: contact.listName || '' },
      ],
    },
    select: { id: true, name: true },
  });

  // Get send history from email logs
  const emailLogs = await prisma.emailLog.findMany({
    where: { recipientEmail: normalizedEmail },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { status: true, sentAt: true, openedAt: true, openCount: true, clickCount: true, campaignId: true },
  });

  const totalSent = emailLogs.filter((l) => l.status === 'SENT' || l.status === 'OPENED').length;
  const lastOpened = emailLogs.find((l) => l.openedAt)?.openedAt;

  return NextResponse.json({
    email: normalizedEmail,
    found: true,
    lists: lists.map((l) => ({
      list_id: l.id,
      list_name: l.name,
      added_at: contact.importedAt?.toISOString() || contact.createdAt.toISOString(),
    })),
    send_history: {
      total_sent: totalSent,
      last_opened: lastOpened?.toISOString() || null,
      status: contact.status.toLowerCase(),
    },
  });
}

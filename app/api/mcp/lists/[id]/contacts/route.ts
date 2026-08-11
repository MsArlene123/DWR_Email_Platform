/** Route 3: POST /api/mcp/lists/:id/contacts — Add contacts to a list */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateMcpRequest } from '@/lib/mcp-auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = validateMcpRequest(req);
  if (!auth.ok) return auth.error!;

  const { id } = await params;
  const { contacts } = await req.json();

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json({ error: 'contacts array is required' }, { status: 400 });
  }

  // Verify list exists
  const sheet = await prisma.googleSheet.findUnique({ where: { id }, select: { id: true, name: true, recipientCount: true } });
  if (!sheet) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  const userId = await getFirstUserId();
  let added = 0;
  let skipped = 0;
  const errors: Array<{ email: string; reason: string }> = [];

  for (const contact of contacts) {
    const email = String(contact.email || '').toLowerCase().trim();
    if (!email || !email.includes('@')) {
      errors.push({ email: contact.email || '(empty)', reason: 'Invalid email format' });
      continue;
    }

    // Check for duplicate
    const existing = await prisma.contact.findFirst({ where: { userId, email }, select: { id: true } });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.contact.create({
      data: {
        userId,
        email,
        firstName: contact.first_name || contact.firstName || null,
        lastName: contact.last_name || contact.lastName || null,
        companyName: contact.organization || contact.companyName || null,
        status: 'ACTIVE',
        listName: sheet.name,
        sourceSheetId: sheet.id,
        sourceSheetName: sheet.name,
      },
    });
    added++;
  }

  // Update count
  const newTotal = (sheet.recipientCount || 0) + added;
  await prisma.googleSheet.update({ where: { id }, data: { recipientCount: newTotal } });

  return NextResponse.json({
    added,
    skipped,
    errors,
    list_id: id,
    new_total: newTotal,
  });
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

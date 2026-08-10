/**
 * /api/contacts/bulk-add
 *
 * Add contacts to a specific contact list (Google Sheet).
 * Accepts an array of contacts with email, firstName, lastName, companyName,
 * and a target listId.
 *
 * Also creates Contact records in the internal contacts database,
 * linked to the Google Sheet via sourceSheetId.
 *
 * POST /api/contacts/bulk-add
 *   {
 *     "listId": "abc123",
 *     "contacts": [
 *       { "email": "john@example.com", "firstName": "John", "lastName": "Smith", "companyName": "Smith Law" },
 *       { "email": "jane@example.com", "firstName": "Jane", "lastName": "Doe", "companyName": "Doe Legal" }
 *     ]
 *   }
 *
 * Returns: { created, skipped, errors, total }
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listId, contacts } = await req.json();

    if (!listId) {
      return NextResponse.json({ error: 'listId is required' }, { status: 400 });
    }
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: 'contacts must be a non-empty array' }, { status: 400 });
    }
    if (contacts.length > 5000) {
      return NextResponse.json({ error: 'Maximum 5,000 contacts per request' }, { status: 400 });
    }

    // Verify the list exists and belongs to the user
    const sheet = await prisma.googleSheet.findFirst({
      where: { id: listId, userId: session.user.id },
      select: { id: true, name: true, recipientCount: true },
    });

    if (!sheet) {
      return NextResponse.json({ error: 'Contact list not found' }, { status: 404 });
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process in batches of 100 for performance
    for (let i = 0; i < contacts.length; i += 100) {
      const batch = contacts.slice(i, i + 100);
      const batchPromises = batch.map(async (contact: any) => {
        const email = String(contact.email || '').toLowerCase().trim();
        if (!email || !email.includes('@')) {
          errors.push(`Invalid email: ${contact.email || '(empty)'}`);
          return { created: false };
        }

        try {
          // Check if contact already exists for this user
          const existing = await prisma.contact.findFirst({
            where: { userId: session.user.id, email },
            select: { id: true },
          });

          if (existing) {
            // Update the existing contact's listName if different
            await prisma.contact.update({
              where: { id: existing.id },
              data: {
                listName: sheet.name,
                sourceSheetId: sheet.id,
                sourceSheetName: sheet.name,
                firstName: contact.firstName || undefined,
                lastName: contact.lastName || undefined,
                companyName: contact.companyName || undefined,
                title: contact.title || undefined,
                phone: contact.phone || undefined,
              },
            });
            return { created: false, skipped: true };
          }

          // Create new contact
          await prisma.contact.create({
            data: {
              userId: session.user.id,
              email,
              firstName: contact.firstName || null,
              lastName: contact.lastName || null,
              companyName: contact.companyName || null,
              title: contact.title || null,
              phone: contact.phone || null,
              status: 'ACTIVE',
              listName: sheet.name,
              sourceSheetId: sheet.id,
              sourceSheetName: sheet.name,
            },
          });
          return { created: true };
        } catch (e) {
          errors.push(`Failed to add ${email}: ${(e as Error).message}`);
          return { created: false };
        }
      });

      const results = await Promise.all(batchPromises);
      results.forEach((r) => {
        if (r.created) created++;
        else if (r.skipped) skipped++;
      });
    }

    // Update the Google Sheet's recipient count
    const newCount = (sheet.recipientCount || 0) + created;
    await prisma.googleSheet.update({
      where: { id: listId },
      data: { recipientCount: newCount },
    });

    return NextResponse.json({
      success: true,
      created,
      skipped,
      errors: errors.slice(0, 20), // limit error messages
      total: contacts.length,
      listName: sheet.name,
      newCount,
    });
  } catch (error) {
    console.error('Bulk add contacts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add contacts' },
      { status: 500 }
    );
  }
}

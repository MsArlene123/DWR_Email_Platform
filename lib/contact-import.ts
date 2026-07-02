import { prisma } from './prisma';
import { parseGoogleSheet } from './sheets-parser';
import { normalizeVarName } from './template-renderer';

/**
 * Import contacts from a Google Sheet into the internal Contact database.
 *
 * Matches contacts by email address (case-insensitive). If a contact
 * already exists, it is skipped (not overwritten) to preserve any
 * engagement data or status changes that have occurred since the
 * original import.
 *
 * Tags and listName allow segmentation. For example, importing from
 * "Verified-WS-Legal-Resource" would set listName to
 * "WomenShield-Legal-Resource" and add relevant tags.
 */
export async function importContactsFromSheet(
  userId: string,
  sheetId: string,
  options?: {
    listName?: string;
    tags?: string;
  }
): Promise<{
  imported: number;
  skipped: number;
  errors: string[];
}> {
  // Look up the sheet
  const sheet = await prisma.googleSheet.findFirst({
    where: { id: sheetId, userId },
  });

  if (!sheet) {
    return { imported: 0, skipped: 0, errors: ['Google Sheet not found'] };
  }

  // Parse the sheet
  const parsed = await parseGoogleSheet(sheet.sheetUrl);
  if (parsed.error || !parsed.emailColumn) {
    return {
      imported: 0,
      skipped: 0,
      errors: [parsed.error || 'No email column found in sheet'],
    };
  }

  // Get existing contacts for this user to check for duplicates
  const existingContacts = await prisma.contact.findMany({
    where: { userId },
    select: { email: true },
  });
  const existingEmails = new Set(
    existingContacts.map((c) => c.email.toLowerCase())
  );

  // Check unsubscribe and bounce status
  const unsubscribes = await prisma.unsubscribe.findMany({
    where: { userId },
    select: { email: true },
  });
  const unsubscribedSet = new Set(
    unsubscribes.map((u) => u.email.toLowerCase())
  );

  const blacklisted = await prisma.bouncedEmail.findMany({
    where: { userId, isBlacklisted: true },
    select: { email: true },
  });
  const blacklistedSet = new Set(
    blacklisted.map((b) => b.email.toLowerCase())
  );

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Map column names to normalized keys
  const columnMap: Record<string, string> = {};
  for (const col of Object.keys(parsed.rows[0] || {})) {
    columnMap[normalizeVarName(col)] = col;
  }

  for (const row of parsed.rows) {
    const email = (row[parsed.emailColumn] || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      skipped++;
      continue;
    }

    // Skip if already in contacts database
    if (existingEmails.has(email)) {
      skipped++;
      continue;
    }

    // Determine status based on unsubscribe/bounce records
    let status: 'ACTIVE' | 'UNSUBSCRIBED' | 'BOUNCED' | 'BLACKLISTED' = 'ACTIVE';
    let unsubscribedAt: Date | null = null;

    if (blacklistedSet.has(email)) {
      status = 'BLACKLISTED';
    } else if (unsubscribedSet.has(email)) {
      status = 'UNSUBSCRIBED';
      unsubscribedAt = new Date();
    }

    // Extract fields from the row using normalized column names
    const getValue = (key: string): string | undefined => {
      // Try exact normalized match
      if (columnMap[key]) return row[columnMap[key]]?.trim() || undefined;
      // Try common variations
      for (const [normalized, original] of Object.entries(columnMap)) {
        if (normalized === key) return row[original]?.trim() || undefined;
      }
      return undefined;
    };

    try {
      await prisma.contact.create({
        data: {
          userId,
          email,
          firstName: getValue('FIRST_NAME'),
          lastName: getValue('LAST_NAME'),
          title: getValue('TITLE'),
          companyName: getValue('COMPANY_NAME'),
          website: getValue('WEBSITE'),
          phone: getValue('PHONE_NUMBERS') || getValue('PHONE'),
          status,
          tags: options?.tags || null,
          listName: options?.listName || sheet.name,
          sourceSheetId: sheetId,
          sourceSheetName: sheet.name,
          unsubscribedAt,
        },
      });

      imported++;
      existingEmails.add(email);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        skipped++;
      } else {
        errors.push(`Failed to import ${email}: ${err?.message || 'Unknown error'}`);
      }
    }
  }

  return { imported, skipped, errors };
}

/**
 * Sync contacts from a Google Sheet.
 *
 * Imports new contacts that have been added to the sheet since the
 * last import. Does not modify or overwrite existing contacts.
 */
export async function syncContactsFromSheet(
  userId: string,
  sheetId: string,
  options?: {
    listName?: string;
    tags?: string;
  }
): Promise<{
  imported: number;
  skipped: number;
  errors: string[];
}> {
  return importContactsFromSheet(userId, sheetId, options);
}

/**
 * Update a contact's status when they unsubscribe.
 *
 * Called from the unsubscribe handler to keep the Contact record
 * in sync with the Unsubscribe table.
 */
export async function markContactUnsubscribed(
  userId: string,
  email: string
): Promise<void> {
  await prisma.contact.updateMany({
    where: {
      userId,
      email: email.toLowerCase(),
    },
    data: {
      status: 'UNSUBSCRIBED',
      unsubscribedAt: new Date(),
    },
  });
}

/**
 * Update a contact's status when they are bounced or blacklisted.
 */
export async function markContactBounced(
  userId: string,
  email: string,
  blacklisted: boolean
): Promise<void> {
  await prisma.contact.updateMany({
    where: {
      userId,
      email: email.toLowerCase(),
    },
    data: {
      status: blacklisted ? 'BLACKLISTED' : 'BOUNCED',
      lastBouncedAt: new Date(),
    },
  });
}

/**
 * Update a contact's engagement metrics after an email is sent, opened, or clicked.
 */
export async function updateContactEngagement(
  userId: string,
  email: string,
  event: 'sent' | 'opened' | 'clicked'
): Promise<void> {
  const now = new Date();
  const update: any = {};

  if (event === 'sent') {
    update.totalEmailsSent = { increment: 1 };
    update.lastEmailSentAt = now;
  } else if (event === 'opened') {
    update.totalOpens = { increment: 1 };
    update.lastOpenedAt = now;
  } else if (event === 'clicked') {
    update.totalClicks = { increment: 1 };
    update.lastClickedAt = now;
  }

  await prisma.contact.updateMany({
    where: {
      userId,
      email: email.toLowerCase(),
    },
    data: update,
  });
}
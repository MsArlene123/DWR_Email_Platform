import { prisma } from './prisma';
import { parseGoogleSheet } from './sheets-parser';
import { buildContext } from './template-renderer';

/**
 * Enroll contacts from a Google Sheet into a drip sequence.
 *
 * Reads all contacts from the assigned sheet, skips anyone already
 * enrolled, already unsubscribed, or already blacklisted, then
 * creates a RecipientProgress record for each new contact.
 *
 * The first step's email is due immediately (or after the step's
 * configured delay). Each subsequent step becomes due after the
 * previous step is sent plus that step's delay.
 *
 * Personalization data from the sheet row is stored on the progress
 * record so the drip processor does not need to re-fetch the sheet
 * on every step.
 */
export async function enrollFromSheet(
  dripSequenceId: string
): Promise<{
  enrolled: number;
  skipped: number;
  errors: string[];
}> {
  const sequence = await prisma.dripSequence.findUnique({
    where: { id: dripSequenceId },
    include: {
      googleSheet: true,
      steps: { orderBy: { stepOrder: 'asc' } },
    },
  });

  if (!sequence) {
    return { enrolled: 0, skipped: 0, errors: ['Drip sequence not found'] };
  }

  if (!sequence.googleSheet) {
    return { enrolled: 0, skipped: 0, errors: ['No Google Sheet assigned to this drip sequence'] };
  }

  if (sequence.steps.length === 0) {
    return { enrolled: 0, skipped: 0, errors: ['Drip sequence has no steps defined'] };
  }

  // Parse the Google Sheet
  const parsed = await parseGoogleSheet(sequence.googleSheet.sheetUrl);
  if (parsed.error || !parsed.emailColumn) {
    return {
      enrolled: 0,
      skipped: 0,
      errors: [parsed.error || 'No email column found in sheet'],
    };
  }

  // Get existing enrollments to avoid duplicates
  const existingProgress = await prisma.recipientProgress.findMany({
    where: { dripSequenceId },
    select: { recipientEmail: true },
  });
  const alreadyEnrolled = new Set(
    existingProgress.map((p) => p.recipientEmail.toLowerCase())
  );

  // Get unsubscribed emails
  const unsubscribes = await prisma.unsubscribe.findMany({
    where: { userId: sequence.userId },
    select: { email: true },
  });
  const unsubscribedSet = new Set(
    unsubscribes.map((u) => u.email.toLowerCase())
  );

  // Get blacklisted emails
  const blacklisted = await prisma.bouncedEmail.findMany({
    where: { userId: sequence.userId, isBlacklisted: true },
    select: { email: true },
  });
  const blacklistedSet = new Set(
    blacklisted.map((b) => b.email.toLowerCase())
  );

  // Calculate when the first email should be due
  const firstStep = sequence.steps[0];
  const firstDelayMs =
    (firstStep.delayDays * 24 * 60 + firstStep.delayHours * 60) * 60 * 1000;
  const firstDue = new Date(Date.now() + firstDelayMs);

  let enrolled = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of parsed.rows) {
    const email = (row[parsed.emailColumn] || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      skipped++;
      continue;
    }

    // Skip if already enrolled
    if (alreadyEnrolled.has(email)) {
      skipped++;
      continue;
    }

    // Skip if unsubscribed
    if (unsubscribedSet.has(email)) {
      skipped++;
      continue;
    }

    // Skip if blacklisted
    if (blacklistedSet.has(email)) {
      skipped++;
      continue;
    }

    try {
      // Store the full row data for personalization on every step
      const context = buildContext(row);

      await prisma.recipientProgress.create({
        data: {
          dripSequenceId,
          recipientEmail: email,
          currentStep: 0,
          completed: false,
          personalizationData: JSON.stringify(row),
          nextEmailDue: firstDue,
        },
      });

      enrolled++;
      alreadyEnrolled.add(email); // Prevent duplicates within the same import
    } catch (err: any) {
      // Unique constraint violation means they were enrolled between our check and insert
      if (err?.code === 'P2002') {
        skipped++;
      } else {
        errors.push(`Failed to enroll ${email}: ${err?.message || 'Unknown error'}`);
      }
    }
  }

  // Update the sync timestamp
  await prisma.dripSequence.update({
    where: { id: dripSequenceId },
    data: { lastEnrollmentSync: new Date() },
  });

  return { enrolled, skipped, errors };
}

/**
 * Re-sync: Import only NEW contacts from the sheet.
 *
 * Calls enrollFromSheet, which already skips existing enrollments.
 * This function is identical, it exists as a named alias so the
 * intent is clear in the API routes and UI.
 */
export async function resyncFromSheet(
  dripSequenceId: string
): Promise<{
  enrolled: number;
  skipped: number;
  errors: string[];
}> {
  return enrollFromSheet(dripSequenceId);
}
import { prisma } from './prisma';
import crypto from 'crypto';
import { markContactBounced } from './contact-import';

/**
 * Generate a unique tracking ID for an email log entry
 */
export function generateTrackingId(): string {
  return crypto.randomUUID();
}

/**
 * Record a bounce for a recipient email. If the email has bounced 3+ times,
 * automatically blacklist it. Also updates the Contact record status.
 */
export async function recordBounce(
  userId: string,
  recipientEmail: string,
  reason?: string
): Promise<{ bounceCount: number; isBlacklisted: boolean }> {
  const existing = await prisma.bouncedEmail.findUnique({
    where: {
      userId_email: {
        userId,
        email: recipientEmail.toLowerCase().trim(),
      },
    },
  });

  if (existing) {
    const newCount = existing.bounceCount + 1;
    const shouldBlacklist = newCount >= 3;
    const updated = await prisma.bouncedEmail.update({
      where: { id: existing.id },
      data: {
        bounceCount: newCount,
        lastBounceAt: new Date(),
        reason: reason || existing.reason,
        isBlacklisted: shouldBlacklist,
      },
    });

    // Sync Contact record status
    await markContactBounced(userId, recipientEmail, updated.isBlacklisted);

    return { bounceCount: updated.bounceCount, isBlacklisted: updated.isBlacklisted };
  } else {
    const created = await prisma.bouncedEmail.create({
      data: {
        userId,
        email: recipientEmail.toLowerCase().trim(),
        bounceCount: 1,
        reason: reason || null,
        lastBounceAt: new Date(),
        isBlacklisted: false,
      },
    });

    // Sync Contact record status
    await markContactBounced(userId, recipientEmail, false);

    return { bounceCount: created.bounceCount, isBlacklisted: created.isBlacklisted };
  }
}

/**
 * Check if an email is blacklisted (bounced 3+ times)
 */
export async function isEmailBlacklisted(
  userId: string,
  recipientEmail: string
): Promise<boolean> {
  const record = await prisma.bouncedEmail.findUnique({
    where: {
      userId_email: {
        userId,
        email: recipientEmail.toLowerCase().trim(),
      },
    },
  });
  return record?.isBlacklisted ?? false;
}
/**
 * Global Suppression List
 *
 * A single email address in the GlobalSuppression table will NEVER be
 * sent to — by ANY user, ANY campaign, ANY drip sequence.
 *
 * This is the hard stop that prevents:
 *   - Sending to spam traps (deliverability killers)
 *   - Re-sending to known complainers (people who hit "Mark as Spam")
 *   - Retrying hard bounces that will never succeed
 *   - Sending to manually suppressed addresses
 *
 * CAN-SPAM compliance: 38 U.S.C. § 7704(a)(3) requires honoring opt-out
 * requests within 10 business days. A global suppression list ensures
 * compliance across all campaigns and drip sequences — not just per-user.
 */

import { prisma } from "./prisma";

/**
 * Normalize an email address for consistent lookup.
 * Matches the normalization in lib/bounce-tracker.ts.
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Check if an email address is globally suppressed.
 *
 * Returns the suppression record if found (including the reason),
 * or null if the email is not suppressed.
 *
 * This is called BEFORE any send attempt in both the campaign processor
 * and the drip processor. If this returns non-null, the send is skipped
 * and the email is logged as SUPPRESSED.
 */
export async function isGloballySuppressed(email: string): Promise<{
  reason: string;
  source: string | null;
  notes: string | null;
  createdAt: Date;
} | null> {
  const normalized = normalizeEmail(email);
  const record = await prisma.globalSuppression.findUnique({
    where: { email: normalized },
    select: { reason: true, source: true, notes: true, createdAt: true },
  });
  return record;
}

/**
 * Add an email to the global suppression list.
 *
 * If the email is already suppressed, the reason/source/notes are
 * updated (the most recent reason wins).
 *
 * Idempotent — safe to call multiple times.
 */
export async function suppressEmail(
  email: string,
  reason: "SPAM_TRAP" | "COMPLAINT" | "HARD_BOUNCE" | "MANUAL" | "RECIPIENT_REQUEST",
  source?: string,
  notes?: string
): Promise<void> {
  const normalized = normalizeEmail(email);
  await prisma.globalSuppression.upsert({
    where: { email: normalized },
    create: { email: normalized, reason, source, notes },
    update: { reason, source, notes: notes ?? undefined, updatedAt: new Date() },
  });
}

/**
 * Bulk-add emails to the global suppression list.
 * Used for importing suppression lists (e.g., from a CSV of known spam traps).
 *
 * Returns the count of newly suppressed emails (excludes already-suppressed).
 */
export async function bulkSuppressEmails(
  emails: string[],
  reason: "SPAM_TRAP" | "COMPLAINT" | "HARD_BOUNCE" | "MANUAL" | "RECIPIENT_REQUEST",
  source?: string
): Promise<{ created: number; skipped: number }> {
  const normalized = emails.map((e) => normalizeEmail(e)).filter(Boolean);

  // Get already-suppressed emails
  const existing = await prisma.globalSuppression.findMany({
    where: { email: { in: normalized } },
    select: { email: true },
  });
  const existingSet = new Set(existing.map((e) => e.email));

  const toCreate = normalized
    .filter((e) => !existingSet.has(e))
    .map((email) => ({ email, reason, source }));

  if (toCreate.length > 0) {
    await prisma.globalSuppression.createMany({ data: toCreate, skipDuplicates: true });
  }

  return { created: toCreate.length, skipped: existingSet.size };
}

/**
 * Remove an email from the global suppression list.
 * Used when an admin manually approves re-sending to a previously suppressed address.
 */
export async function unsuppressEmail(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const result = await prisma.globalSuppression.deleteMany({
    where: { email: normalized },
  });
  return result.count > 0;
}

/**
 * Get suppression list statistics for the dashboard.
 */
export async function getSuppressionStats(): Promise<{
  total: number;
  byReason: Record<string, number>;
  recentAdditions: Array<{ email: string; reason: string; source: string | null; createdAt: Date }>;
}> {
  const [total, byReason, recentAdditions] = await Promise.all([
    prisma.globalSuppression.count(),
    prisma.globalSuppression.groupBy({
      by: ["reason"],
      _count: { reason: true },
    }),
    prisma.globalSuppression.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { email: true, reason: true, source: true, createdAt: true },
    }),
  ]);

  const byReasonMap: Record<string, number> = {};
  for (const r of byReason) {
    byReasonMap[r.reason] = r._count.reason;
  }

  return { total, byReason: byReasonMap, recentAdditions };
}

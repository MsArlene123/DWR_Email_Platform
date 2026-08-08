/**
 * Per-Account Rate Limiting & Daily Quota Management
 *
 * Fixes the race condition in the existing quota check by using atomic
 * conditional updates. Also provides provider-specific daily limit defaults
 * and per-account burst control.
 *
 * Provider limits (as of 2026):
 *   Gmail (consumer):     500/day
 *   Gmail Workspace:     2000/day
 *   Titan:                200/day (per mailbox)
 *   Zoho:                 250/day (free), 500/day (paid)
 *   Generic SMTP:         varies — default 500/day, configurable
 *
 * Usage in processors:
 *   const claim = await claimSendQuota(emailAccountId);
 *   if (!claim.ok) return { skipped: true, reason: claim.reason };
 *   // ... send the email ...
 *   if (sendFailed) {
 *     await releaseSendQuota(emailAccountId);  // give the quota back
 *   }
 */

import { prisma } from "./prisma";

/** Provider-specific daily send limits. */
export const PROVIDER_DAILY_LIMITS: Record<string, number> = {
  GMAIL: 500,        // Gmail consumer limit; Workspace allows 2000
  TITAN_SMTP: 200,   // Titan per-mailbox limit
  ZOHO_SMTP: 250,    // Zoho free tier; paid allows 500
  GENERIC_SMTP: 500, // Conservative default; user can override
};

/**
 * Get the default daily limit for a provider type.
 * Used when creating a new EmailAccount.
 */
export function getDefaultDailyLimit(providerType: string): number {
  return PROVIDER_DAILY_LIMITS[providerType] ?? 500;
}

/**
 * Reset the daily counter if it's a new day.
 * Called before the quota check. Safe to call multiple times.
 */
async function resetDailyCounterIfNeeded(accountId: string): Promise<void> {
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Atomic: only reset if lastResetDate is before today's midnight
  await prisma.emailAccount.updateMany({
    where: {
      id: accountId,
      lastResetDate: { lt: todayMidnight },
    },
    data: {
      emailsSentToday: 0,
      lastResetDate: now,
    },
  });
}

/**
 * Atomically claim a send slot from the account's daily quota.
 *
 * This fixes the race condition where two concurrent cron ticks could
 * both read `emailsSentToday < dailyLimit` and both send, overshooting
 * the limit. The conditional updateMany ensures only one caller can
 * increment at a time — if the row count is 0, the quota is exhausted.
 *
 * Returns:
 *   { ok: true } — quota claimed, you may send
 *   { ok: false, reason: 'daily_limit_reached', limit, sent } — quota exhausted
 *   { ok: false, reason: 'account_inactive' } — account is deactivated
 *   { ok: false, reason: 'account_not_found' } — invalid account ID
 *   { ok: false, reason: 'burst_limit' } — too soon after last send (if minInterval set)
 */
export async function claimSendQuota(
  accountId: string,
  options?: { minIntervalSeconds?: number }
): Promise<
  | { ok: true; previousSentCount: number }
  | { ok: false; reason: string; limit?: number; sent?: number }
> {
  // Reset counter if it's a new day
  await resetDailyCounterIfNeeded(accountId);

  // Fetch the account to check limits
  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
    select: { isActive: true, dailyLimit: true, emailsSentToday: true, lastSentAt: true },
  });

  if (!account) {
    return { ok: false, reason: "account_not_found" };
  }
  if (!account.isActive) {
    return { ok: false, reason: "account_inactive" };
  }
  if (account.emailsSentToday >= account.dailyLimit) {
    return { ok: false, reason: "daily_limit_reached", limit: account.dailyLimit, sent: account.emailsSentToday };
  }

  // Optional burst limiting: prevent sending too fast within a single cron tick
  if (options?.minIntervalSeconds && account.lastSentAt) {
    const elapsed = (Date.now() - account.lastSentAt.getTime()) / 1000;
    if (elapsed < options.minIntervalSeconds) {
      return { ok: false, reason: "burst_limit" };
    }
  }

  // Atomic claim: only increment if the counter hasn't changed since we read it.
  // This prevents the race condition where another cron tick sends between our
  // read and our increment.
  const claim = await prisma.emailAccount.updateMany({
    where: {
      id: accountId,
      emailsSentToday: account.emailsSentToday, // optimistic concurrency
    },
    data: {
      emailsSentToday: { increment: 1 },
      lastSentAt: new Date(),
    },
  });

  if (claim.count === 0) {
    // Another caller already incremented — retry once
    const retry = await prisma.emailAccount.updateMany({
      where: {
        id: accountId,
        emailsSentToday: { lt: account.dailyLimit },
      },
      data: {
        emailsSentToday: { increment: 1 },
        lastSentAt: new Date(),
      },
    });
    if (retry.count === 0) {
      return { ok: false, reason: "daily_limit_reached", limit: account.dailyLimit };
    }
  }

  return { ok: true, previousSentCount: account.emailsSentToday };
}

/**
 * Release a claimed send slot (refund the quota).
 *
 * Call this if the email send FAILED after the quota was claimed.
 * This prevents a failed send from consuming the daily quota.
 */
export async function releaseSendQuota(accountId: string): Promise<void> {
  await prisma.emailAccount.update({
    where: { id: accountId },
    data: {
      emailsSentToday: { decrement: 1 },
    },
  });
}

/**
 * Get the current quota status for an account.
 * Used by the dashboard to show how many sends remain today.
 */
export async function getQuotaStatus(accountId: string): Promise<{
  dailyLimit: number;
  emailsSentToday: number;
  remaining: number;
  lastResetDate: Date;
  lastSentAt: Date | null;
  percentUsed: number;
} | null> {
  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
    select: { dailyLimit: true, emailsSentToday: true, lastResetDate: true, lastSentAt: true },
  });

  if (!account) return null;

  const remaining = Math.max(0, account.dailyLimit - account.emailsSentToday);
  const percentUsed = account.dailyLimit > 0 ? (account.emailsSentToday / account.dailyLimit) * 100 : 0;

  return {
    dailyLimit: account.dailyLimit,
    emailsSentToday: account.emailsSentToday,
    remaining,
    lastResetDate: account.lastResetDate,
    lastSentAt: account.lastSentAt,
    percentUsed: Math.round(percentUsed),
  };
}

/**
 * Get quota status for all accounts owned by a user (or all accounts if admin).
 */
export async function getAllQuotaStatus(userScope: Record<string, string>): Promise<
  Array<{
    id: string;
    email: string;
    type: string;
    isActive: boolean;
    dailyLimit: number;
    emailsSentToday: number;
    remaining: number;
    percentUsed: number;
  }>
> {
  const accounts = await prisma.emailAccount.findMany({
    where: userScope,
    select: {
      id: true,
      email: true,
      type: true,
      isActive: true,
      dailyLimit: true,
      emailsSentToday: true,
    },
    orderBy: { email: "asc" },
  });

  return accounts.map((a) => ({
    ...a,
    remaining: Math.max(0, a.dailyLimit - a.emailsSentToday),
    percentUsed: a.dailyLimit > 0 ? Math.round((a.emailsSentToday / a.dailyLimit) * 100) : 0,
  }));
}

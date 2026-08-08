/**
 * DNS Authentication Cache
 *
 * Wraps lib/domain-auth.ts's checkDomainAuth() with database caching
 * on the EmailAccount model. DNS lookups take 100-500ms each (4 lookups
 * per check = ~500ms), so we cache the result and only re-check daily
 * or on-demand.
 *
 * The cached score is used by:
 *   - The dashboard (shows a green/yellow/red badge per account)
 *   - The campaign processor (warns if sending through a 'poor' account)
 *   - The drip processor (same warning)
 *
 * We do NOT hard-block sends for 'poor' scores — that would prevent
 * any email from going out if DNS is temporarily misconfigured. Instead,
 * we surface the warning prominently so the admin can fix it.
 */

import { prisma } from "./prisma";
import { checkDomainAuth } from "./domain-auth";

const CACHE_TTL_HOURS = 24; // re-check at most once per day
const CACHE_TTL_MS = CACHE_TTL_HOURS * 60 * 60 * 1000;

/**
 * Get the cached DNS auth score for an email account.
 * If the cache is stale (older than CACHE_TTL_HOURS) or missing,
 * returns null (caller should call refreshDomainAuth to update).
 */
export async function getCachedDomainAuth(accountId: string): Promise<{
  score: "good" | "partial" | "poor";
  detail: any;
  checkedAt: Date;
  isStale: boolean;
} | null> {
  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
    select: {
      domainAuthScore: true,
      domainAuthDetail: true,
      domainAuthCheckedAt: true,
    },
  });

  if (!account || !account.domainAuthScore || !account.domainAuthCheckedAt) {
    return null;
  }

  const isStale = Date.now() - account.domainAuthCheckedAt.getTime() > CACHE_TTL_MS;

  let detail = null;
  try {
    detail = account.domainAuthDetail ? JSON.parse(account.domainAuthDetail) : null;
  } catch {
    // invalid JSON in cache — treat as stale
  }

  return {
    score: account.domainAuthScore as "good" | "partial" | "poor",
    detail,
    checkedAt: account.domainAuthCheckedAt,
    isStale,
  };
}

/**
 * Refresh the DNS auth score for an email account.
 *
 * Calls checkDomainAuth() (which does 4 DNS lookups in parallel),
 * stores the result on the EmailAccount, and returns the score.
 *
 * Use this:
 *   - On demand from the dashboard ("Re-check DNS" button)
 *   - From a daily cron job that refreshes all accounts
 *   - After DNS records are updated
 */
export async function refreshDomainAuth(
  accountId: string
): Promise<{
  score: "good" | "partial" | "poor";
  detail: any;
}> {
  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
    select: { email: true },
  });

  if (!account) {
    throw new Error(`EmailAccount not found: ${accountId}`);
  }

  // Run the DNS checks (this takes ~500ms)
  const result = await checkDomainAuth(account.email);

  // Store the result
  await prisma.emailAccount.update({
    where: { id: accountId },
    data: {
      domainAuthScore: result.overallScore,
      domainAuthDetail: JSON.stringify({
        spf: result.spf,
        dkim: result.dkim,
        dmarc: result.dmarc,
        mx: result.mx,
        recommendations: result.recommendations,
      }),
      domainAuthCheckedAt: new Date(),
    },
  });

  return {
    score: result.overallScore,
    detail: {
      spf: result.spf,
      dkim: result.dkim,
      dmarc: result.dmarc,
      mx: result.mx,
      recommendations: result.recommendations,
    },
  };
}

/**
 * Refresh DNS auth for all active accounts.
 * Called by a daily cron job.
 */
export async function refreshAllDomainAuth(): Promise<{
  checked: number;
  good: number;
  partial: number;
  poor: number;
  errors: number;
}> {
  const accounts = await prisma.emailAccount.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  let good = 0;
  let partial = 0;
  let poor = 0;
  let errors = 0;

  for (const account of accounts) {
    try {
      const result = await refreshDomainAuth(account.id);
      if (result.score === "good") good++;
      else if (result.score === "partial") partial++;
      else poor++;
    } catch (e) {
      console.error(`Failed to refresh DNS auth for account ${account.id}:`, e);
      errors++;
    }
  }

  return {
    checked: accounts.length,
    good,
    partial,
    poor,
    errors,
  };
}

/**
 * Get a human-readable summary of the DNS auth status.
 * Used by the dashboard to show a one-line status per account.
 */
export function getDomainAuthSummary(score: string, detail: any): string {
  if (!score) return "Not checked";

  const parts: string[] = [];
  if (detail?.spf?.found) parts.push("SPF ✓");
  else parts.push("SPF ✗");

  if (detail?.dkim?.found) parts.push("DKIM ✓");
  else parts.push("DKIM ✗");

  if (detail?.dmarc?.found) parts.push("DMARC ✓");
  else parts.push("DMARC ✗");

  return parts.join(" · ");
}

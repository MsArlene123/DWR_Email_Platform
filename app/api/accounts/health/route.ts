import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyConnection } from '@/lib/email-sender';
import { tryDecryptPassword } from '@/lib/encryption';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * FLEET HEALTH CHECK
 *
 * Tests every connected email account by attempting an SMTP login,
 * WITHOUT sending any email. This answers the question "which of my
 * accounts can actually send right now?" in one click, instead of
 * discovering a broken credential two sends into a live campaign.
 *
 * Each account is checked in two stages:
 *   1. Can the stored password be decrypted? (Catches ENCRYPTION_KEY
 *      mismatches with a plain-language explanation.)
 *   2. Does the mail server accept the login? (Catches wrong or
 *      revoked passwords, e.g. expired Gmail app passwords.)
 */

const VERIFY_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accounts = await prisma.emailAccount.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      type: true,
      displayName: true,
      smtpHost: true,
      smtpPort: true,
      smtpPassword: true,
      isActive: true,
    },
  });

  type AccountRow = (typeof accounts)[number];

  const results = await Promise.all(
    accounts.map(async (account: AccountRow) => {
      const base = {
        id: account.id,
        email: account.email,
        type: account.type,
        displayName: account.displayName,
        isActive: account.isActive,
      };

      // Stage 1: decryption
      const decryption = tryDecryptPassword(account.smtpPassword || '');
      if (decryption.error !== undefined) {
        return { ...base, ok: false, stage: 'decryption', error: decryption.error };
      }

      // Stage 2: SMTP login (no email is sent)
      const verification = await withTimeout(
        verifyConnection({
          type: account.type,
          email: account.email,
          password: decryption.password,
          smtpHost: account.smtpHost,
          smtpPort: account.smtpPort,
        }),
        VERIFY_TIMEOUT_MS,
        {
          success: false,
          error: `The mail server did not respond within ${VERIFY_TIMEOUT_MS / 1000} seconds.`,
        }
      );

      if (!verification.success) {
        return {
          ...base,
          ok: false,
          stage: 'login',
          error: verification.error || 'The mail server rejected the login.',
        };
      }

      return { ...base, ok: true };
    })
  );

  const healthy = results.filter((r: { ok: boolean }) => r.ok).length;

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    total: results.length,
    healthy,
    unhealthy: results.length - healthy,
    accounts: results,
  });
}

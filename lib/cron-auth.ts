import { NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * Shared authentication for the background processing endpoints.
 *
 * WHY: The old approach accepted a header of "x-internal-trigger: true",
 * which anyone on the internet could send. That is a doorbell wired to
 * your machinery. This replaces it with a real shared secret, CRON_SECRET,
 * set in your environment. Your scheduler (Abacus cron, cron-job.org,
 * GitHub Actions, anything) sends the secret, strangers cannot.
 *
 * The secret is accepted three ways, because some schedulers can only
 * set a URL and not headers:
 *   1. Header:       Authorization: Bearer <CRON_SECRET>
 *   2. Header:       x-cron-secret: <CRON_SECRET>
 *   3. Query string: ?secret=<CRON_SECRET>
 *
 * If CRON_SECRET is not set in the environment, cron access is DENIED
 * entirely (the endpoints then work only for a logged-in session).
 * Locked by default is the safe failure mode.
 */

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ') && safeEqual(authHeader.slice(7), secret)) {
    return true;
  }

  const headerSecret = req.headers.get('x-cron-secret') || '';
  if (headerSecret && safeEqual(headerSecret, secret)) {
    return true;
  }

  const querySecret = req.nextUrl.searchParams.get('secret') || '';
  if (querySecret && safeEqual(querySecret, secret)) {
    return true;
  }

  return false;
}

/**
 * Headers for server-to-self trigger calls (e.g., the campaign start
 * button kicking off an immediate processing pass). If CRON_SECRET is
 * missing these calls will be rejected with 401 and the next scheduled
 * cron run picks up the work instead, so nothing is lost, only delayed.
 */
export function internalTriggerHeaders(): Record<string, string> {
  const secret = process.env.CRON_SECRET || '';
  return secret ? { authorization: `Bearer ${secret}` } : {};
}
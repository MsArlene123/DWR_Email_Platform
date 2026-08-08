/**
 * /api/suppression/bulk
 *
 * Bulk import emails to the global suppression list.
 * Used for importing known spam traps, complaint lists, etc.
 *
 * POST /api/suppression/bulk
 *   { emails: string[], reason: 'SPAM_TRAP' | 'COMPLAINT' | ... }
 *
 * Admin-only.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { bulkSuppressEmails } from '@/lib/suppression';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { emails, reason } = await req.json();

  if (!Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json({ error: 'emails must be a non-empty array' }, { status: 400 });
  }

  const validReasons = ['SPAM_TRAP', 'COMPLAINT', 'HARD_BOUNCE', 'MANUAL', 'RECIPIENT_REQUEST'];
  if (!validReasons.includes(reason)) {
    return NextResponse.json({ error: `Invalid reason. Must be one of: ${validReasons.join(', ')}` }, { status: 400 });
  }

  // Cap at 10,000 per request to prevent abuse
  if (emails.length > 10000) {
    return NextResponse.json({ error: 'Maximum 10,000 emails per bulk import' }, { status: 400 });
  }

  const result = await bulkSuppressEmails(emails, reason, session.user.email);

  return NextResponse.json({
    success: true,
    created: result.created,
    skipped: result.skipped,
    total: emails.length,
  });
}

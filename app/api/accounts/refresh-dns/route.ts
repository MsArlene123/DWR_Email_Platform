/**
 * /api/accounts/refresh-dns
 *
 * Refreshes the DNS authentication score (DKIM/SPF/DMARC) for one or all
 * email accounts.
 *
 * POST /api/accounts/refresh-dns                    — refresh ALL accounts
 * POST /api/accounts/refresh-dns?id=<accountId>     — refresh one account
 *
 * Returns the updated scores.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { refreshDomainAuth, refreshAllDomainAuth } from '@/lib/domain-auth-cache';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('id');

  try {
    if (accountId) {
      // Refresh one account
      const result = await refreshDomainAuth(accountId);
      return NextResponse.json({
        success: true,
        accountId,
        score: result.score,
        detail: result.detail,
      });
    } else {
      // Refresh all accounts (admin only — this is expensive)
      if (session.user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Admin access required to refresh all accounts' },
          { status: 403 }
        );
      }
      const results = await refreshAllDomainAuth();
      return NextResponse.json({ success: true, ...results });
    }
  } catch (error) {
    console.error('DNS refresh error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to refresh DNS' },
      { status: 500 }
    );
  }
}

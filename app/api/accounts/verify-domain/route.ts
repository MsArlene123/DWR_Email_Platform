import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkDomainAuth } from '@/lib/domain-auth';

export const dynamic = 'force-dynamic';

/**
 * Check SPF, DKIM, and DMARC records for an email account's domain.
 *
 * GET /api/accounts/verify-domain?email=info@womenshield.help
 *
 * Returns a detailed report with pass/fail for each authentication
 * method and actionable recommendations for any that are missing.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = req.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json(
      { error: 'email query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const result = await checkDomainAuth(email);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Domain auth check error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to check domain authentication' },
      { status: 500 }
    );
  }
}
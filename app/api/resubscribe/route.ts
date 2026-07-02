export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token';

/**
 * Resubscribe endpoint.
 *
 * SIGNED TOKENS ONLY. Re-adding someone to a mailing list after they
 * opted out is the dangerous direction (a CAN-SPAM exposure if abused),
 * so legacy unsigned tokens are deliberately rejected here, unlike the
 * unsubscribe route. Anyone who unsubscribes from today forward receives
 * a signed token on the confirmation page, so the legitimate "changed my
 * mind" flow keeps working; only forged tokens stop working.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const decoded = verifyUnsubscribeToken(token);
  if (!decoded) {
    return NextResponse.json(
      {
        error:
          'Invalid or expired link. If you would like to re-subscribe, please reply to any of our emails and ask to be added back.',
      },
      { status: 400 }
    );
  }

  try {
    // Delete the unsubscribe record if it exists
    await prisma.unsubscribe.deleteMany({
      where: {
        userId: decoded.userId,
        email: decoded.email,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin;
    return NextResponse.redirect(
      `${baseUrl}/subscribe?success=true&email=${encodeURIComponent(decoded.email)}`
    );
  } catch (error) {
    console.error('Resubscribe error:', error);
    return NextResponse.json({ error: 'Failed to resubscribe' }, { status: 500 });
  }
}
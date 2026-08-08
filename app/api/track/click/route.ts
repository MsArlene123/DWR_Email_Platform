import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateContactEngagement } from '@/lib/contact-import';

export const dynamic = 'force-dynamic';

/**
 * Click tracking endpoint.
 *
 * When a recipient clicks a link in an email, the link actually points
 * here first. This endpoint logs the click against the email's tracking
 * record, then immediately redirects the recipient to the real URL.
 */
export async function GET(req: NextRequest) {
  const trackingId = req.nextUrl.searchParams.get('id');
  const targetUrl = req.nextUrl.searchParams.get('url');

  // Always redirect even if tracking fails
  const fallbackUrl = targetUrl || '/';

  if (trackingId && targetUrl) {
    try {
      const emailLog = await prisma.emailLog.findFirst({
        where: { trackingId },
        include: { emailAccount: { select: { userId: true } } },
      });

      if (emailLog) {
        await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: {
            clickCount: { increment: 1 },
            lastClickedAt: new Date(),
          },
        });

        // Sync Contact engagement
        await updateContactEngagement(
          emailLog.emailAccount.userId,
          emailLog.recipientEmail,
          'clicked'
        );
      }
    } catch (error) {
      console.error('Click tracking error:', error);
    }
  }

  // 302 redirect to the real destination
  return NextResponse.redirect(fallbackUrl, { status: 302 });
}
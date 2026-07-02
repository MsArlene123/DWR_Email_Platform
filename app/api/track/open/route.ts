import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateContactEngagement } from '@/lib/contact-import';

export const dynamic = 'force-dynamic';

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(req: NextRequest) {
  const trackingId = req.nextUrl.searchParams.get('id');

  if (trackingId) {
    try {
      // Find the email log by tracking ID
      const emailLog = await prisma.emailLog.findFirst({
        where: { trackingId },
        include: { emailAccount: { select: { userId: true } } },
      });

      if (emailLog && emailLog.status === 'SENT') {
        // First open - update status to OPENED
        await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: {
            status: 'OPENED',
            openedAt: emailLog.openedAt || new Date(),
            openCount: { increment: 1 },
          },
        });

        // Sync Contact engagement
        await updateContactEngagement(
          emailLog.emailAccount.userId,
          emailLog.recipientEmail,
          'opened'
        );
      } else if (emailLog && emailLog.status === 'OPENED') {
        // Subsequent opens - just increment count
        await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: {
            openCount: { increment: 1 },
          },
        });
      }
    } catch (error) {
      console.error('Tracking pixel error:', error);
    }
  }

  // Always return the pixel regardless of tracking success
  return new NextResponse(TRACKING_PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
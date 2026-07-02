export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decodeUnsubscribeToken } from '@/lib/unsubscribe-token';
import { markContactUnsubscribed } from '@/lib/contact-import';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const decoded = decodeUnsubscribeToken(token);
  if (!decoded) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  try {
    await prisma.unsubscribe.upsert({
      where: {
        userId_email: {
          userId: decoded.userId,
          email: decoded.email,
        },
      },
      update: {},
      create: {
        userId: decoded.userId,
        email: decoded.email,
      },
    });

    // Sync Contact record status
    await markContactUnsubscribed(decoded.userId, decoded.email);

    // Redirect to the unsubscribe confirmation page
    const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin;
    return NextResponse.redirect(`${baseUrl}/unsubscribe?success=true&email=${encodeURIComponent(decoded.email)}&token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}

/**
 * POST handler for RFC 8058 one-click unsubscribe.
 */
export async function POST(req: NextRequest) {
  let token = req.nextUrl.searchParams.get('token');

  if (!token) {
    try {
      const formData = await req.formData();
      token = formData.get('token') as string | null;
    } catch {
      try {
        const body = await req.json();
        token = body.token || null;
      } catch {
        // No parseable body
      }
    }
  }

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const decoded = decodeUnsubscribeToken(token);
  if (!decoded) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  try {
    await prisma.unsubscribe.upsert({
      where: {
        userId_email: {
          userId: decoded.userId,
          email: decoded.email,
        },
      },
      update: {},
      create: {
        userId: decoded.userId,
        email: decoded.email,
      },
    });

    // Sync Contact record status
    await markContactUnsubscribed(decoded.userId, decoded.email);

    return NextResponse.json({ success: true, email: decoded.email });
  } catch (error) {
    console.error('One-click unsubscribe error:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
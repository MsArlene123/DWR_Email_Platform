import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createResetToken, sendPasswordResetEmail } from '@/lib/password-reset';

export const dynamic = 'force-dynamic';

// Simple in-memory throttle: max 3 requests per email per 15 minutes.
const attempts = new Map<string, number[]>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 3;

function throttled(key: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    attempts.set(key, recent);
    return true;
  }
  recent.push(now);
  attempts.set(key, recent);
  return false;
}

/**
 * Always answers with the same message whether or not the email exists,
 * so this form cannot be used to discover which emails have accounts.
 */
export async function POST(req: Request) {
  const generic = NextResponse.json({
    message: 'If an account exists for that email, a reset link has been sent.',
  });

  try {
    const { email } = await req.json();
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return generic;
    }
    const normalized = email.trim().toLowerCase();
    if (throttled(normalized)) return generic;

    const user = await prisma.user.findFirst({
      where: { email: { equals: normalized, mode: 'insensitive' } },
      select: { id: true, email: true, password: true },
    });
    if (!user || !user.email) return generic;

    const baseUrl = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
    if (!baseUrl) {
      console.error('forgot-password: NEXTAUTH_URL is not set.');
      return generic;
    }

    const token = createResetToken(user.id, user.password || '');
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const sent = await sendPasswordResetEmail(user.email, resetUrl);
    if (!sent.success) console.error('forgot-password: send failed:', sent.error);
  } catch (error) {
    console.error('forgot-password error:', error);
  }
  return generic;
}

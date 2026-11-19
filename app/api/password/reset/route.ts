import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { verifyResetToken } from '@/lib/password-reset';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const verified = typeof token === 'string' ? await verifyResetToken(token) : null;
    if (!verified) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: verified.userId },
      data: { password: hashed },
    });

    return NextResponse.json({ message: 'Password updated. You can now sign in.' });
  } catch (error) {
    console.error('reset-password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Signup endpoint.
 *
 * INVITE-ONLY ENFORCEMENT: Per the project's intent, signup is invite
 * only, but previously the only protection was hiding the link, which
 * is no protection at all (anyone who finds /signup could register and
 * send email through your infrastructure). Now, if SIGNUP_CODE is set
 * in the environment, registration requires it. The signup form should
 * send it as "inviteCode" in the request body. If SIGNUP_CODE is not
 * set, signup behaves as before, so nothing breaks until you add the
 * variable, but you should add it.
 *
 * Also adds basic email format and minimum password length validation.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, inviteCode } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Invite code gate
    const requiredCode = process.env.SIGNUP_CODE;
    if (requiredCode && inviteCode !== requiredCode) {
      return NextResponse.json(
        { error: 'A valid invite code is required to create an account.' },
        { status: 403 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
      },
    });

    return NextResponse.json(
      { message: 'User created successfully', userId: user.id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
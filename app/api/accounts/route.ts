import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyConnection } from '@/lib/email-sender';
import { encryptPassword } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accounts = await prisma.emailAccount.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  // Don't send passwords to the client
  const sanitized = accounts.map((a) => ({
    ...a,
    smtpPassword: a.smtpPassword ? '********' : null,
  }));

  return NextResponse.json({ accounts: sanitized });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      type,
      email,
      displayName,
      password,
      smtpHost,
      smtpPort,
      dailyLimit,
      businessName,
      businessAddress,
      businessPhone,
    } = body;

    if (!type || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: type, email, password' },
        { status: 400 }
      );
    }

    const validTypes = ['GMAIL', 'TITAN_SMTP', 'ZOHO_SMTP', 'GENERIC_SMTP'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid account type. Must be GMAIL, TITAN_SMTP, ZOHO_SMTP, or GENERIC_SMTP.' },
        { status: 400 }
      );
    }

    // Determine SMTP host based on type
    let resolvedHost = smtpHost;
    if (type === 'GMAIL') resolvedHost = 'smtp.gmail.com';
    else if (type === 'ZOHO_SMTP') resolvedHost = smtpHost || 'smtp.zoho.com';
    else if (type === 'TITAN_SMTP') resolvedHost = smtpHost || 'smtp.titan.email';
    else if (type === 'GENERIC_SMTP') resolvedHost = smtpHost; // Must be provided

    if (type === 'GENERIC_SMTP' && !resolvedHost) {
      return NextResponse.json(
        { error: 'SMTP Host is required for Other SMTP accounts' },
        { status: 400 }
      );
    }

    // Verify the connection first using the raw password
    const verification = await verifyConnection({
      type,
      email,
      password,
      displayName,
      smtpHost: resolvedHost,
      smtpPort,
    });

    if (!verification.success) {
      return NextResponse.json(
        { error: `Connection failed: ${verification.error}` },
        { status: 400 }
      );
    }

    // Encrypt the password before storing in the database
    const encryptedPassword = encryptPassword(password);

    const account = await prisma.emailAccount.create({
      data: {
        userId: session.user.id,
        type,
        email,
        displayName: displayName || null,
        smtpPassword: encryptedPassword,
        smtpHost: resolvedHost,
        smtpPort: type === 'GMAIL' ? 587 : smtpPort || 587,
        dailyLimit: dailyLimit || 500,
        businessName: businessName || null,
        businessAddress: businessAddress || null,
        businessPhone: businessPhone || null,
        isActive: true,
      },
    });

    return NextResponse.json({
      account: { ...account, smtpPassword: '********' },
    });
  } catch (error: any) {
    console.error('Create account error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create account' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyConnection } from '@/lib/email-sender';
import { encryptPassword, decryptPassword } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const account = await prisma.emailAccount.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  await prisma.emailAccount.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const account = await prisma.emailAccount.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  const body = await req.json();
  const { isActive, displayName, dailyLimit, password, smtpHost, smtpPort } = body;

  // If a new password is provided, verify the connection first, then
  // encrypt before storing. This lets you update a password in place
  // instead of deleting the account (which would wipe all campaign
  // history tied to it).
  let encryptedPassword: string | undefined;
  if (password) {
    const verification = await verifyConnection({
      type: account.type,
      email: account.email,
      password,
      displayName: displayName ?? account.displayName,
      smtpHost: smtpHost ?? account.smtpHost,
      smtpPort: smtpPort ?? account.smtpPort,
    });

    if (!verification.success) {
      return NextResponse.json(
        { error: `New password verification failed: ${verification.error}` },
        { status: 400 }
      );
    }

    encryptedPassword = encryptPassword(password);
  }

  const updated = await prisma.emailAccount.update({
    where: { id: params.id },
    data: {
      ...(isActive !== undefined && { isActive }),
      ...(displayName !== undefined && { displayName }),
      ...(dailyLimit !== undefined && { dailyLimit }),
      ...(smtpHost !== undefined && { smtpHost }),
      ...(smtpPort !== undefined && { smtpPort }),
      ...(encryptedPassword && { smtpPassword: encryptedPassword }),
    },
  });

  return NextResponse.json({
    account: { ...updated, smtpPassword: '********' },
  });
}
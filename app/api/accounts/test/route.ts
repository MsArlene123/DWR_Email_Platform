import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email-sender';
import { tryDecryptPassword } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { accountId, testEmail, subject, html } = body;

  if (!accountId || !testEmail) {
    return NextResponse.json(
      { error: 'accountId and testEmail are required' },
      { status: 400 }
    );
  }

  const account = await prisma.emailAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
  });

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  const decryption = tryDecryptPassword(account.smtpPassword || '');
  if (decryption.error !== undefined) {
    return NextResponse.json({ error: decryption.error }, { status: 400 });
  }

  const result = await sendEmail(
    {
      type: account.type,
      email: account.email,
      password: decryption.password,
      displayName: account.displayName,
      smtpHost: account.smtpHost,
      smtpPort: account.smtpPort,
    },
    {
      from: account.email,
      to: testEmail,
      subject: subject || 'Test Email from Email Marketing Dashboard',
      html:
        html ||
        '<h2>Test Email</h2><p>This is a test email from your email marketing dashboard. Your SMTP configuration is working correctly!</p>',
    }
  );

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Failed to send test email' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, messageId: result.messageId });
}
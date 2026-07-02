import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email-sender';
import { decryptPassword } from '@/lib/encryption';
import { buildContext, renderTemplate, PREVIEW_CONTEXT } from '@/lib/template-renderer';

export const dynamic = 'force-dynamic';

/**
 * Send a test email for a campaign before launching it.
 *
 * POST /api/campaigns/test-send
 * Body: {
 *   emailAccountId: string,   // Which account to send from
 *   templateId: string,       // Which template to render
 *   subject: string,          // Subject line (with {{TAGS}})
 *   testEmail: string,        // Where to send the test
 *   personalization?: object   // Optional custom values for tags
 * }
 *
 * Renders the template with sample personalization data (or custom
 * values if provided), sends it to the specified test address, and
 * returns success/failure. No email log entry is created since this
 * is not a real campaign send.
 *
 * This lets you see exactly how the email will look in a real inbox,
 * with personalization tags filled in, the CAN-SPAM footer, and the
 * tracking pixel, before you commit to sending to 500 people.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { emailAccountId, templateId, subject, testEmail, personalization } = body;

    if (!emailAccountId || !templateId || !subject || !testEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: emailAccountId, templateId, subject, testEmail' },
        { status: 400 }
      );
    }

    // Validate ownership of all resources
    const [account, template] = await Promise.all([
      prisma.emailAccount.findFirst({
        where: { id: emailAccountId, userId: session.user.id },
      }),
      prisma.emailTemplate.findFirst({
        where: { id: templateId, userId: session.user.id },
      }),
    ]);

    if (!account) {
      return NextResponse.json({ error: 'Email account not found' }, { status: 404 });
    }
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Build personalization context: use provided values merged with
    // sample defaults, so any tags without a custom value still render
    // with readable placeholder text instead of going blank.
    const context = buildContext({
      ...PREVIEW_CONTEXT,
      ...(personalization || {}),
      EMAIL_ADDRESS: testEmail,
    });

    const renderedSubject = renderTemplate(subject, context);
    const renderedHtml = renderTemplate(template.htmlContent, context);
    const renderedText = template.plainText
      ? renderTemplate(template.plainText, context)
      : undefined;

    const result = await sendEmail(
      {
        type: account.type,
        email: account.email,
        password: decryptPassword(account.smtpPassword || ''),
        displayName: account.displayName,
        smtpHost: account.smtpHost,
        smtpPort: account.smtpPort,
      },
      {
        from: account.email,
        to: testEmail,
        subject: `[TEST] ${renderedSubject}`,
        html: renderedHtml,
        text: renderedText,
        userId: session.user.id,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send test email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      renderedSubject,
    });
  } catch (error: any) {
    console.error('Campaign test send error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send test email' },
      { status: 500 }
    );
  }
}
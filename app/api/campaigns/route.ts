import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseGoogleSheet } from '@/lib/sheets-parser';
import { getDataScope } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scope = await getDataScope();

  const campaigns = await prisma.campaign.findMany({
    where: scope,
    orderBy: { createdAt: 'desc' },
    include: {
      emailAccount: true,
      googleSheet: true,
      template: true,
    },
  });

  return NextResponse.json({ campaigns });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scope = await getDataScope();

  try {
    const body = await req.json();
    const {
      name,
      emailAccountId,
      googleSheetId,
      templateId,
      subject,
      sendingRate,
      scheduledStart,
      startNow,
    } = body;

    if (!name || !emailAccountId || !googleSheetId || !templateId || !subject) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: name, emailAccountId, googleSheetId, templateId, subject',
        },
        { status: 400 }
      );
    }

    // Validate ownership
    const [account, sheet, template] = await Promise.all([
      prisma.emailAccount.findFirst({
        where: { id: emailAccountId, userId: session.user.id },
      }),
      prisma.googleSheet.findFirst({
        where: { id: googleSheetId, userId: session.user.id },
      }),
      prisma.emailTemplate.findFirst({
        where: { id: templateId, userId: session.user.id },
      }),
    ]);

    if (!account) {
      return NextResponse.json(
        { error: 'Email account not found' },
        { status: 404 }
      );
    }
    if (!sheet) {
      return NextResponse.json(
        { error: 'Google sheet not found' },
        { status: 404 }
      );
    }
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Get recipients: if this is a sub-list (parentSheetId set), read from
    // the Contact table. Otherwise, parse the Google Sheet URL as before.
    let validRecipients: Array<Record<string, string>> = [];
    let emailField = 'EMAIL_ADDRESS'; // default for sub-lists

    if (sheet.parentSheetId) {
      // This is a sub-list — read contacts from the Contact table
      const contacts = await prisma.contact.findMany({
        where: {
          sourceSheetId: sheet.id,
          status: 'ACTIVE',
        },
      });

      validRecipients = contacts.map((c) => ({
        EMAIL_ADDRESS: c.email,
        FIRST_NAME: c.firstName || '',
        LAST_NAME: c.lastName || '',
        TITLE: c.title || '',
        COMPANY_NAME: c.companyName || '',
        WEBSITE: c.website || '',
        PHONE_NUMBERS: c.phone || '',
      }));
    } else {
      // Original sheet — parse the Google Sheet URL
      const parsed = await parseGoogleSheet(sheet.sheetUrl);
      if (parsed.error) {
        return NextResponse.json(
          { error: `Failed to read sheet: ${parsed.error}` },
          { status: 400 }
        );
      }

      if (!parsed.emailColumn) {
        return NextResponse.json(
          { error: 'Sheet does not have an email column' },
          { status: 400 }
        );
      }

      emailField = parsed.emailColumn;
      validRecipients = parsed.rows.filter((r) => {
        const email = (r[parsed.emailColumn!] || '').trim();
        return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      });
    }

    if (validRecipients.length === 0) {
      return NextResponse.json(
        { error: 'No valid email recipients found in the sheet' },
        { status: 400 }
      );
    }

    const status = startNow ? 'RUNNING' : scheduledStart ? 'SCHEDULED' : 'DRAFT';
    const actualStart = startNow ? new Date() : null;

    const campaign = await prisma.campaign.create({
      data: {
        userId: session.user.id,
        name,
        status,
        emailAccountId,
        googleSheetId,
        templateId,
        subject,
        sendingRate: sendingRate || 3,
        scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
        actualStart,
        totalRecipients: validRecipients.length,
      },
    });

    // SNAPSHOT: Store each recipient's full row data as JSON in the
    // personalizationData field. This means the campaign processor
    // never needs to re-fetch the Google Sheet. Benefits:
    //   1. Performance: no network call per email send
    //   2. Consistency: every recipient gets the same version of the
    //      data, even if someone edits the sheet mid-campaign
    //   3. Reliability: sheet access issues cannot stall a campaign
    //      after it has started
    await prisma.emailLog.createMany({
      data: validRecipients.map((r) => ({
        campaignId: campaign.id,
        emailAccountId,
        recipientEmail: (r[emailField] || '').trim(),
        recipientName: `${r.FIRST_NAME || r['First Name'] || r.first_name || ''} ${r.LAST_NAME || r['Last Name'] || r.last_name || ''}`.trim() || null,
        subject,
        status: 'PENDING' as const,
        personalizationData: JSON.stringify(r),
      })),
    });

    return NextResponse.json({ campaign });
  } catch (error: any) {
    console.error('Create campaign error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
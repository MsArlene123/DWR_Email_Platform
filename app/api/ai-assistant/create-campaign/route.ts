/**
 * /api/ai-assistant/create-campaign
 *
 * Creates a campaign from the AI assistant chat.
 * The user provides: templateId, sheetId (contact list), emailAccountId,
 * and optionally a scheduled start time.
 *
 * POST /api/ai-assistant/create-campaign
 *   {
 *     "name": "Bankruptcy.Forum Press Announcement",
 *     "templateId": "abc123",
 *     "sheetId": "def456",
 *     "emailAccountId": "ghi789",
 *     "scheduledStart": "2026-08-11T07:00:00Z" // optional, omit for immediate
 *   }
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, templateId, sheetId, emailAccountId, scheduledStart, sendingRate } = await req.json();

    // Validate required fields
    if (!name || !templateId || !sheetId || !emailAccountId) {
      return NextResponse.json({
        error: 'Missing required fields: name, templateId, sheetId, emailAccountId',
      }, { status: 400 });
    }

    // Verify ownership of all resources
    const [template, sheet, account] = await Promise.all([
      prisma.emailTemplate.findFirst({
        where: { id: templateId, userId: session.user.id },
        select: { id: true, name: true, subject: true, htmlContent: true, plainText: true },
      }),
      prisma.googleSheet.findFirst({
        where: { id: sheetId, userId: session.user.id },
        select: { id: true, name: true, recipientCount: true, columns: true, sheetUrl: true },
      }),
      prisma.emailAccount.findFirst({
        where: { id: emailAccountId, userId: session.user.id },
        select: { id: true, email: true, isActive: true, dailyLimit: true, emailsSentToday: true },
      }),
    ]);

    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    if (!sheet) return NextResponse.json({ error: 'Contact list not found' }, { status: 404 });
    if (!account) return NextResponse.json({ error: 'Email account not found' }, { status: 404 });
    if (!account.isActive) return NextResponse.json({ error: `Account ${account.email} is inactive` }, { status: 400 });

    // Check daily limit
    const remaining = account.dailyLimit - account.emailsSentToday;
    if (sheet.recipientCount > remaining) {
      return NextResponse.json({
        error: `This list has ${sheet.recipientCount} contacts but ${account.email} can only send ${remaining} more today. The campaign will send in batches over multiple days (cron processes ${Math.ceil(remaining / 1)} per tick). Set the sending rate to spread the sends.`,
        warning: true,
        remaining,
        totalContacts: sheet.recipientCount,
      }, { status: 200 });
    }

    // Create the campaign
    const campaign = await prisma.campaign.create({
      data: {
        userId: session.user.id,
        name,
        status: scheduledStart ? 'SCHEDULED' : 'RUNNING',
        emailAccountId,
        googleSheetId: sheetId,
        templateId,
        subject: template.subject,
        sendingRate: sendingRate || 3, // minutes between emails
        scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
        actualStart: scheduledStart ? null : new Date(),
        totalRecipients: sheet.recipientCount,
      },
    });

    // Import contacts from the Google Sheet as EmailLog entries (PENDING)
    // This is what the campaign processor picks up
    const { parseGoogleSheet } = await import('@/lib/sheets-parser');
    const parsed = await parseGoogleSheet(sheet.sheetUrl);

    if (parsed.error || !parsed.rows || parsed.rows.length === 0) {
      return NextResponse.json({
        error: `Failed to parse Google Sheet: ${parsed.error || 'No rows found'}`,
        campaignId: campaign.id,
      }, { status: 400 });
    }

    // Create EmailLog entries for each recipient
    const emailColumn = parsed.emailColumn;
    if (!emailColumn) {
      return NextResponse.json({
        error: 'No email column found in the sheet',
        campaignId: campaign.id,
      }, { status: 400 });
    }

    const logs = parsed.rows
      .filter((row: any) => row[emailColumn] && row[emailColumn].includes('@'))
      .map((row: any) => ({
        campaignId: campaign.id,
        emailAccountId,
        recipientEmail: String(row[emailColumn]).toLowerCase().trim(),
        recipientName: [row.firstName || row.FIRST_NAME || '', row.lastName || row.LAST_NAME || ''].filter(Boolean).join(' ').trim() || null,
        subject: template.subject,
        status: 'PENDING' as const,
        personalizationData: JSON.stringify(row),
      }));

    // Batch create (Prisma createMany)
    if (logs.length > 0) {
      await prisma.emailLog.createMany({
        data: logs,
        skipDuplicates: true,
      });
    }

    // Update campaign total
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { totalRecipients: logs.length },
    });

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        totalRecipients: logs.length,
        sendingAccount: account.email,
        template: template.name,
        sheet: sheet.name,
        scheduledStart: campaign.scheduledStart,
      },
      message: scheduledStart
        ? `Campaign scheduled for ${new Date(scheduledStart).toLocaleString()}`
        : `Campaign is now RUNNING! ${logs.length} emails queued. The cron job will start sending within 2 minutes.`,
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create campaign' },
      { status: 500 }
    );
  }
}

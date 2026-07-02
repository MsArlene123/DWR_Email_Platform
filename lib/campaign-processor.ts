import { prisma } from './prisma';
import { parseGoogleSheet } from './sheets-parser';
import { buildContext, renderTemplate } from './template-renderer';
import { sendEmail } from './email-sender';
import { generateTrackingId, recordBounce, isEmailBlacklisted } from './bounce-tracker';
import { decryptPassword } from './encryption';

/**
 * DUPLICATE-SEND PROTECTION: Atomic claim using the RETRY status.
 * See earlier implementation notes for details.
 */
const STALE_CLAIM_MINUTES = 15;

/**
 * AUTOMATIC RETRY: Emails that failed for transient reasons (network
 * timeout, temporary server overload) are retried up to 3 times. Each
 * retry waits at least 30 minutes to avoid hammering a server that is
 * already struggling, similar to waiting for a traffic jam to clear
 * before trying the route again. Only transient failures are retried;
 * bounces (invalid address, mailbox full) are never retried since the
 * outcome would be the same.
 */
const MAX_RETRIES = 3;
const RETRY_DELAY_MINUTES = 30;

/**
 * Process a single campaign.
 */
export async function processCampaign(campaignId: string): Promise<{
  sent: boolean;
  skipped: boolean;
  reason?: string;
  error?: string;
}> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      emailAccount: true,
      googleSheet: true,
      template: true,
    },
  });

  if (!campaign) {
    return { sent: false, skipped: true, reason: 'Campaign not found' };
  }

  if (campaign.status !== 'RUNNING') {
    return {
      sent: false,
      skipped: true,
      reason: `Campaign is ${campaign.status}`,
    };
  }

  if (!campaign.emailAccount.isActive) {
    return {
      sent: false,
      skipped: true,
      reason: 'Email account is inactive',
    };
  }

  // Recover stale claims from crashed processing runs
  const staleCutoff = new Date(Date.now() - STALE_CLAIM_MINUTES * 60 * 1000);
  await prisma.emailLog.updateMany({
    where: {
      campaignId,
      status: 'RETRY',
      updatedAt: { lt: staleCutoff },
    },
    data: { status: 'PENDING' },
  });

  // AUTOMATIC RETRY: Re-queue FAILED emails that have not exceeded the
  // retry limit and have waited long enough since their last attempt.
  const retryCutoff = new Date(Date.now() - RETRY_DELAY_MINUTES * 60 * 1000);
  const retriable = await prisma.emailLog.updateMany({
    where: {
      campaignId,
      status: 'FAILED',
      retryCount: { lt: MAX_RETRIES },
      updatedAt: { lt: retryCutoff },
      // Do not retry unsubscribe skips or blacklist skips
      error: { notIn: ['Recipient unsubscribed', 'Email blacklisted (bounced 3+ times)'] },
    },
    data: { status: 'PENDING' },
  });
  if (retriable.count > 0) {
    console.log(`Campaign ${campaignId}: re-queued ${retriable.count} failed email(s) for retry`);
  }

  // Check daily limit: reset if past midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastReset = new Date(campaign.emailAccount.lastResetDate);
  lastReset.setHours(0, 0, 0, 0);

  let emailsSentToday = campaign.emailAccount.emailsSentToday;
  if (lastReset.getTime() < today.getTime()) {
    await prisma.emailAccount.update({
      where: { id: campaign.emailAccount.id },
      data: { emailsSentToday: 0, lastResetDate: new Date() },
    });
    emailsSentToday = 0;
  }

  if (emailsSentToday >= campaign.emailAccount.dailyLimit) {
    return {
      sent: false,
      skipped: true,
      reason: `Daily limit reached (${campaign.emailAccount.dailyLimit})`,
    };
  }

  // Check rate limit: enough time since last send?
  const lastSent = await prisma.emailLog.findFirst({
    where: { campaignId, status: { in: ['SENT', 'OPENED'] } },
    orderBy: { sentAt: 'desc' },
  });

  if (lastSent?.sentAt) {
    const minutesSinceLast =
      (Date.now() - lastSent.sentAt.getTime()) / 1000 / 60;
    if (minutesSinceLast < campaign.sendingRate) {
      return {
        sent: false,
        skipped: true,
        reason: `Rate limit: waiting ${(campaign.sendingRate - minutesSinceLast).toFixed(1)} more minutes`,
      };
    }
  }

  // Get next pending email (skip blacklisted and unsubscribed)
  const pendingLogs = await prisma.emailLog.findMany({
    where: { campaignId, status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  let pending: any = null;
  for (const log of pendingLogs) {
    const unsubscribed = await prisma.unsubscribe.findUnique({
      where: { userId_email: { userId: campaign.userId, email: log.recipientEmail } },
    });
    if (unsubscribed) {
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', error: 'Recipient unsubscribed' },
      });
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { emailsFailed: { increment: 1 } },
      });
      continue;
    }
    const blacklisted = await isEmailBlacklisted(campaign.userId, log.recipientEmail);
    if (blacklisted) {
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'BOUNCED', error: 'Email blacklisted (bounced 3+ times)' },
      });
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { emailsFailed: { increment: 1 } },
      });
      continue;
    }
    pending = log;
    break;
  }

  if (!pending) {
    const remaining = await prisma.emailLog.count({
      where: { campaignId, status: { in: ['PENDING', 'RETRY'] } },
    });
    // Also check for FAILED emails that might become retriable later
    const retriableLater = await prisma.emailLog.count({
      where: {
        campaignId,
        status: 'FAILED',
        retryCount: { lt: MAX_RETRIES },
        error: { notIn: ['Recipient unsubscribed', 'Email blacklisted (bounced 3+ times)'] },
      },
    });
    if (remaining === 0 && retriableLater === 0) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      return { sent: false, skipped: true, reason: 'Campaign completed' };
    }
    return { sent: false, skipped: true, reason: 'No eligible recipient this pass' };
  }

  // ATOMIC CLAIM
  const claim = await prisma.emailLog.updateMany({
    where: { id: pending.id, status: 'PENDING' },
    data: { status: 'RETRY' },
  });
  if (claim.count === 0) {
    return {
      sent: false,
      skipped: true,
      reason: 'Recipient claimed by a concurrent processing run',
    };
  }

  // PERSONALIZATION: Use snapshotted data from the email log if
  // available (campaigns created after the snapshot feature). Fall
  // back to re-fetching the Google Sheet for legacy campaigns.
  let context;
  if (pending.personalizationData) {
    try {
      const rowData = JSON.parse(pending.personalizationData);
      context = buildContext(rowData);
    } catch {
      context = buildContext({ EMAIL_ADDRESS: pending.recipientEmail });
    }
  } else {
    // Legacy path: re-fetch the sheet
    const parsed = await parseGoogleSheet(campaign.googleSheet.sheetUrl);
    if (parsed.error || !parsed.emailColumn) {
      await prisma.emailLog.update({
        where: { id: pending.id },
        data: { status: 'FAILED', error: parsed.error || 'No email column' },
      });
      return { sent: false, skipped: false, error: parsed.error };
    }
    const recipientRow = parsed.rows.find(
      (r) =>
        (r[parsed.emailColumn!] || '').trim().toLowerCase() ===
        pending.recipientEmail.toLowerCase()
    );
    context = buildContext(recipientRow || { EMAIL_ADDRESS: pending.recipientEmail });
  }

  const renderedSubject = renderTemplate(campaign.subject, context);
  const renderedHtml = renderTemplate(campaign.template.htmlContent, context);
  const renderedText = campaign.template.plainText
    ? renderTemplate(campaign.template.plainText, context)
    : undefined;

  const trackingId = generateTrackingId();
  const result = await sendEmail(
    {
      type: campaign.emailAccount.type,
      email: campaign.emailAccount.email,
      password: decryptPassword(campaign.emailAccount.smtpPassword || ''),
      displayName: campaign.emailAccount.displayName,
      smtpHost: campaign.emailAccount.smtpHost,
      smtpPort: campaign.emailAccount.smtpPort,
      businessName: campaign.emailAccount.businessName,
      businessAddress: campaign.emailAccount.businessAddress,
      businessPhone: campaign.emailAccount.businessPhone,
    },
    {
      from: campaign.emailAccount.email,
      to: pending.recipientEmail,
      subject: renderedSubject,
      html: renderedHtml,
      text: renderedText,
      trackingId,
      userId: campaign.userId,
    }
  );

  if (result.success) {
    await prisma.emailLog.update({
      where: { id: pending.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        subject: renderedSubject,
        trackingId,
      },
    });

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { emailsSent: { increment: 1 } },
    });

    await prisma.emailAccount.update({
      where: { id: campaign.emailAccount.id },
      data: { emailsSentToday: { increment: 1 } },
    });

    const remainingPending = await prisma.emailLog.count({
      where: { campaignId, status: { in: ['PENDING', 'RETRY'] } },
    });
    if (remainingPending === 0) {
      const retriableLater = await prisma.emailLog.count({
        where: {
          campaignId,
          status: 'FAILED',
          retryCount: { lt: MAX_RETRIES },
          error: { notIn: ['Recipient unsubscribed', 'Email blacklisted (bounced 3+ times)'] },
        },
      });
      if (retriableLater === 0) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
      }
    }

    return { sent: true, skipped: false };
  } else {
    const isBounce = result.isBounce ?? false;

    await prisma.emailLog.update({
      where: { id: pending.id },
      data: {
        status: isBounce ? 'BOUNCED' : 'FAILED',
        error: result.error || 'Unknown error',
        retryCount: { increment: 1 },
      },
    });

    if (isBounce) {
      await recordBounce(campaign.userId, pending.recipientEmail, result.error);
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { emailsFailed: { increment: 1 } },
    });

    return { sent: false, skipped: false, error: result.error };
  }
}

/**
 * Process all running campaigns.
 */
export async function processAllCampaigns(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  details: any[];
}> {
  const now = new Date();
  await prisma.campaign.updateMany({
    where: {
      status: 'SCHEDULED',
      scheduledStart: { lte: now },
    },
    data: {
      status: 'RUNNING',
      actualStart: now,
    },
  });

  const runningCampaigns = await prisma.campaign.findMany({
    where: { status: 'RUNNING' },
  });

  const results = [];
  let sent = 0;
  let failed = 0;

  for (const campaign of runningCampaigns) {
    try {
      const result = await processCampaign(campaign.id);
      results.push({ campaignId: campaign.id, ...result });
      if (result.sent) sent++;
      if (result.error) failed++;
    } catch (e: any) {
      results.push({ campaignId: campaign.id, error: e?.message });
      failed++;
    }
  }

  return {
    processed: runningCampaigns.length,
    sent,
    failed,
    details: results,
  };
}
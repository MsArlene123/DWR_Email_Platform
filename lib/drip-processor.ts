import { prisma } from './prisma';
import { parseGoogleSheet } from './sheets-parser';
import { buildContext, renderTemplate } from './template-renderer';
import { sendEmail } from './email-sender';
import { generateTrackingId, recordBounce, isEmailBlacklisted } from './bounce-tracker';
import { tryDecryptPassword } from './encryption';
import { isGloballySuppressed } from './suppression';
import { claimSendQuota, releaseSendQuota } from './rate-limiter';

/**
 * Process all drip sequences.
 *
 * PACING (the big fix): The old version sent to EVERY due recipient
 * back to back with no delay, despite the sendingIntervalMinutes field,
 * which is exactly the burst pattern that gets a Gmail account throttled
 * or flagged. This version sends AT MOST ONE email per sequence per
 * processing run, and only if at least sendingIntervalMinutes have
 * passed since that sequence's last send. Pacing is therefore enforced
 * by the database clock, the same model the campaign processor uses,
 * and your scheduled cron (every 1 to 5 minutes) provides the heartbeat.
 *
 * Practical effect: with a 5 minute interval, a sequence sends one
 * email roughly every 5 minutes, exactly what the dashboard promises
 * ("1 email every 5 minutes"). A backlog of 100 due recipients drains
 * steadily instead of all at once.
 *
 * UNSUBSCRIBE FIX: Unsubscribed recipients are now marked completed
 * instead of being skipped and re-examined forever on every run.
 */
export async function processDripSequences(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  details: any[];
}> {
  const now = new Date();
  const startedAt = Date.now();

  const activeSequences = await prisma.dripSequence.findMany({
    where: { isActive: true },
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' },
        include: { template: true },
      },
    },
  });

  let processed = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const details: any[] = [];

  for (const sequence of activeSequences) {
    if (sequence.steps.length === 0) {
      details.push({ sequenceName: sequence.name, skipped: true, reason: 'No steps configured' });
      continue;
    }
    if (!sequence.googleSheetId) {
      details.push({ sequenceName: sequence.name, skipped: true, reason: 'No recipient list assigned' });
      continue;
    }

    const sheet = await prisma.googleSheet.findUnique({ where: { id: sequence.googleSheetId } });
    if (!sheet) {
      details.push({ sequenceName: sequence.name, skipped: true, reason: 'Sheet not found' });
      continue;
    }

    // Get email account
    const emailAccount = sequence.emailAccountId
      ? await prisma.emailAccount.findFirst({
          where: { id: sequence.emailAccountId, userId: sequence.userId, isActive: true },
        })
      : await prisma.emailAccount.findFirst({
          where: { userId: sequence.userId, isActive: true },
          orderBy: { createdAt: 'asc' },
        });

    if (!emailAccount) {
      details.push({
        sequenceName: sequence.name,
        skipped: true,
        reason: sequence.emailAccountId ? 'Assigned email account not found or inactive' : 'No active email account',
      });
      continue;
    }

    // Reset daily counter if needed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastReset = new Date(emailAccount.lastResetDate);
    lastReset.setHours(0, 0, 0, 0);

    let emailsSentToday = emailAccount.emailsSentToday;
    if (lastReset.getTime() < today.getTime()) {
      await prisma.emailAccount.update({
        where: { id: emailAccount.id },
        data: { emailsSentToday: 0, lastResetDate: new Date() },
      });
      emailsSentToday = 0;
    }

    if (emailsSentToday >= emailAccount.dailyLimit) {
      details.push({ sequenceName: sequence.name, skipped: true, reason: 'Daily limit reached' });
      continue;
    }

    // PACING GATE: has enough time passed since this sequence's last send?
    const intervalMinutes = sequence.sendingIntervalMinutes || 5;
    const lastSendRecord = await prisma.recipientProgress.findFirst({
      where: { dripSequenceId: sequence.id, lastEmailSent: { not: null } },
      orderBy: { lastEmailSent: 'desc' },
      select: { lastEmailSent: true },
    });

    if (lastSendRecord?.lastEmailSent) {
      const minutesSinceLast =
        (Date.now() - lastSendRecord.lastEmailSent.getTime()) / 1000 / 60;
      if (minutesSinceLast < intervalMinutes) {
        details.push({
          sequenceName: sequence.name,
          skipped: true,
          reason: `Pacing: next send in ${(intervalMinutes - minutesSinceLast).toFixed(1)} minutes`,
        });
        continue;
      }
    }

    // Pull a small batch of due recipients; we will send to the FIRST
    // eligible one only, then stop for this sequence until next run.
    const dueRecipients = await prisma.recipientProgress.findMany({
      where: {
        dripSequenceId: sequence.id,
        completed: false,
        nextEmailDue: { lte: now },
      },
      orderBy: { nextEmailDue: 'asc' },
      take: 15,
    });

    if (dueRecipients.length === 0) {
      const totalProgress = await prisma.recipientProgress.count({ where: { dripSequenceId: sequence.id } });
      details.push({
        sequenceName: sequence.name,
        skipped: true,
        reason: totalProgress === 0 ? 'No recipients enrolled' : 'No recipients due for sending right now',
        enrolled: totalProgress,
      });
      continue;
    }

    // Parse sheet once per sequence
    const parsed = await parseGoogleSheet(sheet.sheetUrl);
    if (parsed.error || !parsed.emailColumn) {
      details.push({ sequenceName: sequence.name, error: parsed.error || 'No email column in sheet' });
      continue;
    }

    // DECRYPTION GUARD: Verify the account password can be decrypted
    // BEFORE touching any recipient. If ENCRYPTION_KEY changed, every
    // send would fail with a misleading "authentication failed" error.
    // Skipping the sequence leaves recipients unharmed and reports the
    // real cause once, instead of failing recipients one by one.
    const decryption = tryDecryptPassword(emailAccount.smtpPassword || '');
    if (decryption.error !== undefined) {
      const message = `Sending account ${emailAccount.email}: ${decryption.error}`;
      console.error(`Drip sequence "${sequence.name}" skipped. ${message}`);
      details.push({ sequenceName: sequence.name, error: message });
      continue;
    }

    let sequenceSent = 0;
    let sequenceFailed = 0;
    let sequenceSkipped = 0;

    for (const recipient of dueRecipients) {
      processed++;

      const nextStepIndex = recipient.currentStep;
      if (nextStepIndex >= sequence.steps.length) {
        await prisma.recipientProgress.update({
          where: { id: recipient.id },
          data: { completed: true },
        });
        sequenceSkipped++;
        skipped++;
        continue;
      }

      // Check unsubscribe FIRST, before any rendering work, and mark
      // the recipient completed so they are never re-examined. The old
      // code skipped without updating, so every run rechecked them forever.
      const unsubscribed = await prisma.unsubscribe.findUnique({
        where: { userId_email: { userId: sequence.userId, email: recipient.recipientEmail } },
      });
      if (unsubscribed) {
        await prisma.recipientProgress.update({
          where: { id: recipient.id },
          data: { completed: true },
        });
        sequenceSkipped++;
        skipped++;
        continue;
      }

      const step = sequence.steps[nextStepIndex];
      const recipientRow = parsed.rows.find(
        (r) => (r[parsed.emailColumn!] || '').trim().toLowerCase() === recipient.recipientEmail.toLowerCase()
      );

      if (!recipientRow) {
        await prisma.recipientProgress.update({
          where: { id: recipient.id },
          data: { completed: true },
        });
        sequenceSkipped++;
        skipped++;
        continue;
      }

      const context = buildContext(recipientRow);
      const renderedSubject = renderTemplate(step.subject, context);
      const renderedHtml = renderTemplate(step.template.htmlContent, context);
      const renderedText = step.template.plainText ? renderTemplate(step.template.plainText, context) : undefined;

      // Check blacklist
      const blacklisted = await isEmailBlacklisted(sequence.userId, recipient.recipientEmail);
      if (blacklisted) {
        await prisma.emailLog.create({
          data: {
            emailAccountId: emailAccount.id,
            recipientEmail: recipient.recipientEmail,
            recipientName: `${context.FIRST_NAME || ''} ${context.LAST_NAME || ''}`.trim() || null,
            subject: renderedSubject,
            status: 'BOUNCED',
            error: 'Email blacklisted (bounced 3+ times)',
          },
        });
        await prisma.recipientProgress.update({
          where: { id: recipient.id },
          data: { completed: true },
        });
        sequenceSkipped++;
        skipped++;
        continue;
      }

      // Check global suppression list (CAN-SPAM compliance)
      const suppressed = await isGloballySuppressed(recipient.recipientEmail);
      if (suppressed) {
        await prisma.emailLog.create({
          data: {
            emailAccountId: emailAccount.id,
            recipientEmail: recipient.recipientEmail,
            recipientName: `${context.FIRST_NAME || ''} ${context.LAST_NAME || ''}`.trim() || null,
            subject: renderedSubject,
            status: 'FAILED',
            error: `Globally suppressed (${suppressed.reason})`,
          },
        });
        await prisma.recipientProgress.update({
          where: { id: recipient.id },
          data: { completed: true },
        });
        sequenceSkipped++;
        skipped++;
        continue;
      }

      // Atomically claim a send slot from the daily quota
      const quotaClaim = await claimSendQuota(emailAccount.id);
      if (!quotaClaim.ok) {
        // Can't send — leave the recipient as-is, they'll be retried next tick
        sequenceSkipped++;
        skipped++;
        continue;
      }

      const trackingId = generateTrackingId();
      const result = await sendEmail(
        {
          type: emailAccount.type,
          email: emailAccount.email,
          password: decryption.password,
          displayName: emailAccount.displayName,
          smtpHost: emailAccount.smtpHost,
          smtpPort: emailAccount.smtpPort,
          businessName: emailAccount.businessName,
          businessAddress: emailAccount.businessAddress,
          businessPhone: emailAccount.businessPhone,
        },
        {
          from: emailAccount.email,
          to: recipient.recipientEmail,
          subject: renderedSubject,
          html: renderedHtml,
          text: renderedText,
          trackingId,
          userId: sequence.userId,
        }
      );

      const isBounce = !result.success && (result.isBounce ?? false);

      // If the send failed, release the quota slot so the daily limit
      // isn't consumed by failed sends.
      if (!result.success) {
        await releaseSendQuota(emailAccount.id);
      }

      await prisma.emailLog.create({
        data: {
          emailAccountId: emailAccount.id,
          recipientEmail: recipient.recipientEmail,
          recipientName: `${context.FIRST_NAME || ''} ${context.LAST_NAME || ''}`.trim() || null,
          subject: renderedSubject,
          status: result.success ? 'SENT' : (isBounce ? 'BOUNCED' : 'FAILED'),
          error: result.error || null,
          sentAt: result.success ? new Date() : null,
          trackingId: result.success ? trackingId : null,
        },
      });

      if (isBounce) {
        await recordBounce(sequence.userId, recipient.recipientEmail, result.error || undefined);
        // Add hard bounces to the global suppression list
        if (result.error && (result.error.includes('550') || result.error.includes('mailbox') || result.error.includes('user unknown'))) {
          const { suppressEmail } = await import('./suppression');
          await suppressEmail(recipient.recipientEmail, 'HARD_BOUNCE', 'drip-processor', result.error);
        }
      }

      if (result.success) {
        sent++;
        sequenceSent++;
        const nextStepNum = recipient.currentStep + 1;
        const isLast = nextStepNum >= sequence.steps.length;

        let nextDue: Date | null = null;
        if (!isLast) {
          const nextStep = sequence.steps[nextStepNum];
          nextDue = new Date();
          nextDue.setDate(nextDue.getDate() + (nextStep.delayDays || 0));
          nextDue.setHours(nextDue.getHours() + (nextStep.delayHours || 0));
        }

        await prisma.recipientProgress.update({
          where: { id: recipient.id },
          data: {
            currentStep: nextStepNum,
            lastEmailSent: new Date(),
            nextEmailDue: nextDue,
            completed: isLast,
          },
        });

        // Note: emailsSentToday was already incremented atomically by claimSendQuota.
        // No need to increment again here.
      } else {
        failed++;
        sequenceFailed++;
        // Retry in 1 hour
        const nextDue = new Date();
        nextDue.setHours(nextDue.getHours() + 1);
        await prisma.recipientProgress.update({
          where: { id: recipient.id },
          data: { nextEmailDue: nextDue },
        });
      }

      // ONE send attempt (success or failure) per sequence per run.
      // The next cron tick, gated by the pacing check above, sends the
      // next one. This is what makes sendingIntervalMinutes real.
      break;
    }

    if (sequenceSent > 0 || sequenceFailed > 0 || sequenceSkipped > 0) {
      details.push({
        sequenceName: sequence.name,
        sent: sequenceSent,
        failed: sequenceFailed,
        skipped: sequenceSkipped,
      });
    }

    // Safety: bail before a serverless timeout if many sequences exist.
    if (Date.now() - startedAt > 50000) {
      details.push({ note: 'Time budget reached, remaining sequences continue on next run' });
      break;
    }
  }

  return { processed, sent, failed, skipped, details };
}
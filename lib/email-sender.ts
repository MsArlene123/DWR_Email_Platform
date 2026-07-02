import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { generateUnsubscribeToken } from './unsubscribe-token';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailAccountConfig {
  type: 'GMAIL' | 'TITAN_SMTP' | 'ZOHO_SMTP' | 'GENERIC_SMTP';
  email: string;
  password: string;
  displayName?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  // Business identity for CAN-SPAM footer
  businessName?: string | null;
  businessAddress?: string | null;
  businessPhone?: string | null;
}

export interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  trackingId?: string;
  userId?: string;
}

export function getSmtpConfig(account: EmailAccountConfig): SmtpConfig {
  if (account.type === 'GMAIL') {
    return {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: account.email,
        pass: account.password,
      },
    };
  }

  if (account.type === 'ZOHO_SMTP') {
    return {
      host: account.smtpHost || 'smtp.zoho.com',
      port: account.smtpPort || 587,
      secure: (account.smtpPort || 587) === 465,
      auth: {
        user: account.email,
        pass: account.password,
      },
    };
  }

  // TITAN_SMTP and GENERIC_SMTP both use the provided host/port
  return {
    host: account.smtpHost || 'smtp.titan.email',
    port: account.smtpPort || 587,
    secure: (account.smtpPort || 587) === 465,
    auth: {
      user: account.email,
      pass: account.password,
    },
  };
}

export function createTransporter(account: EmailAccountConfig): Transporter {
  const config = getSmtpConfig(account);
  return nodemailer.createTransport(config);
}

export async function verifyConnection(
  account: EmailAccountConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createTransporter(account);
    await transporter.verify();
    return { success: true };
  } catch (error: any) {
    console.error('SMTP verification error:', error);
    return {
      success: false,
      error: error?.message || 'Failed to verify SMTP connection',
    };
  }
}

// Bounce error patterns from SMTP responses
const BOUNCE_PATTERNS = [
  /550/i,
  /551/i,
  /552/i,
  /553/i,
  /554/i,
  /mailbox.*not.*found/i,
  /user.*unknown/i,
  /user.*not.*found/i,
  /address.*rejected/i,
  /no.*such.*user/i,
  /does.*not.*exist/i,
  /invalid.*recipient/i,
  /recipient.*rejected/i,
  /undeliverable/i,
  /account.*disabled/i,
  /account.*not.*found/i,
];

export function isBounceError(error: string): boolean {
  return BOUNCE_PATTERNS.some((pattern) => pattern.test(error));
}

/**
 * Dynamic CAN-SPAM footer.
 *
 * Uses the sending account's business identity fields. If no business
 * identity is set on the account, falls back to DocWriteReview LLC
 * defaults so emails are never sent without a footer.
 */
export function injectCanSpamFooter(
  html: string,
  unsubscribeUrl: string,
  resubscribeUrl: string,
  businessIdentity?: {
    name?: string | null;
    address?: string | null;
    phone?: string | null;
  }
): string {
  const bizName = businessIdentity?.name || 'DocWriteReview LLC';
  const bizAddress = businessIdentity?.address || '714 "H" Street, Unit 1205, Washington, DC 20002';
  const bizPhone = businessIdentity?.phone || '(202) 800-1899';

  const footer = `
<div style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b7280;line-height:1.6;">
  <p style="margin:0 0 8px 0;">You are receiving this email because you opted in to receive updates, resources, and offers from ${bizName}. We respect your inbox and your time.</p>
  <p style="margin:0 0 8px 0;">If you no longer wish to receive emails from us, you may <a href="${unsubscribeUrl}" style="color:#c9a84c;text-decoration:underline;">unsubscribe here</a> at any time. No hard feelings, and you are always welcome back.</p>
  <p style="margin:0 0 8px 0;">To re-subscribe or manage your preferences, simply <a href="${resubscribeUrl}" style="color:#c9a84c;text-decoration:underline;">subscribe here</a>.</p>
  <p style="margin:12px 0 0 0;font-weight:600;color:#374151;">${bizName} | ${bizAddress} | ${bizPhone}</p>
</div>`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${footer}</body>`);
  }
  return html + footer;
}

export function injectTrackingPixel(html: string, trackingId: string, baseUrl: string): string {
  const pixelUrl = `${baseUrl}/api/track/open?id=${encodeURIComponent(trackingId)}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="border:0;width:1px;height:1px;" alt="" />`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`);
  }
  return html + pixel;
}

/**
 * CLICK TRACKING: Wrap links in the email HTML with tracking redirects.
 */
export function injectClickTracking(
  html: string,
  trackingId: string,
  baseUrl: string
): string {
  if (!trackingId || !baseUrl) return html;

  const trackBase = `${baseUrl}/api/track/click`;

  return html.replace(
    /(<a\s[^>]*href\s*=\s*)(["'])(https?:\/\/[^"']+)\2/gi,
    (fullMatch, prefix, quote, url) => {
      if (
        url.includes('/api/unsubscribe') ||
        url.includes('/api/resubscribe') ||
        url.includes('/api/track/') ||
        url.startsWith('mailto:') ||
        url.startsWith('#')
      ) {
        return fullMatch;
      }

      const trackingUrl = `${trackBase}?id=${encodeURIComponent(trackingId)}&url=${encodeURIComponent(url)}`;
      return `${prefix}${quote}${trackingUrl}${quote}`;
    }
  );
}

export async function sendEmail(
  account: EmailAccountConfig,
  params: SendEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string; isBounce?: boolean }> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || '';

    if (params.userId && !baseUrl) {
      const error =
        'NEXTAUTH_URL is not set in the environment, so the CAN-SPAM unsubscribe footer cannot be generated. Set NEXTAUTH_URL to your deployed app URL (e.g., https://yourapp.abacusai.app) and retry.';
      console.error('Email send blocked:', error);
      return { success: false, error, isBounce: false };
    }

    const transporter = createTransporter(account);
    const fromAddress = account.displayName
      ? `"${account.displayName}" <${account.email}>`
      : account.email;

    let htmlContent = params.html;
    let headers: Record<string, string> | undefined;

    if (params.userId && baseUrl) {
      const token = generateUnsubscribeToken(params.userId, params.to);
      const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${encodeURIComponent(token)}`;
      const resubscribeUrl = `${baseUrl}/api/resubscribe?token=${encodeURIComponent(token)}`;

      // Use business identity from the sending account for the footer
      htmlContent = injectCanSpamFooter(htmlContent, unsubscribeUrl, resubscribeUrl, {
        name: account.businessName,
        address: account.businessAddress,
        phone: account.businessPhone,
      });

      headers = {
        'List-Unsubscribe': `<mailto:${account.email}?subject=unsubscribe>, <${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      };
    }

    // CLICK TRACKING
    if (params.trackingId && baseUrl) {
      htmlContent = injectClickTracking(htmlContent, params.trackingId, baseUrl);
    }

    // Inject open tracking pixel
    if (params.trackingId && baseUrl) {
      htmlContent = injectTrackingPixel(htmlContent, params.trackingId, baseUrl);
    }

    const info = await transporter.sendMail({
      from: fromAddress,
      to: params.to,
      subject: params.subject,
      html: htmlContent,
      text: params.text,
      replyTo: params.replyTo,
      headers,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('Email send error:', error);
    const errorMessage = error?.message || 'Failed to send email';
    return {
      success: false,
      error: errorMessage,
      isBounce: isBounceError(errorMessage),
    };
  }
}
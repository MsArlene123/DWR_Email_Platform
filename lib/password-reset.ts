import crypto from 'crypto';
import { prisma } from './prisma';
import { sendEmail } from './email-sender';
import { tryDecryptPassword } from './encryption';

/**
 * Stateless, single-use password reset tokens.
 *
 * HOW IT WORKS (no database changes needed):
 * The token carries the user id and an expiry time. It is signed with an
 * HMAC whose key is the server secret PLUS the user's current password
 * hash. Think of it like a door key cut to fit one specific lock: the
 * moment the password changes, the lock changes, so the old key (the
 * emailed link) stops working. That makes every link single-use, with no
 * extra table to store tokens.
 *
 * FORMAT: <base64url payload>.<base64url signature>
 */

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || '';
  if (!secret) {
    console.error('password-reset: NEXTAUTH_SECRET is not set. Tokens cannot be signed securely.');
  }
  return secret;
}

function sign(payloadB64: string, passwordHash: string): string {
  return crypto
    .createHmac('sha256', `${getSecret()}:${passwordHash}`)
    .update(payloadB64)
    .digest('base64url');
}

export function createResetToken(userId: string, passwordHash: string): string {
  const payload = Buffer.from(
    JSON.stringify({ u: userId, x: Date.now() + TOKEN_TTL_MS })
  ).toString('base64url');
  return `${payload}.${sign(payload, passwordHash)}`;
}

/**
 * Returns the user id if the token is valid, unexpired, and the password
 * has not changed since it was issued. Otherwise returns null.
 */
export async function verifyResetToken(
  token: string
): Promise<{ userId: string } | null> {
  if (!getSecret()) return null;
  const [payloadB64, signature] = (token || '').split('.');
  if (!payloadB64 || !signature) return null;

  let payload: { u?: string; x?: number };
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload.u || !payload.x || Date.now() > payload.x) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.u },
    select: { id: true, password: true },
  });
  if (!user) return null;

  const expected = sign(payloadB64, user.password || '');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  return { userId: user.id };
}

/**
 * Sends the reset email using one of the platform's own connected sending
 * accounts (an admin's account is preferred). No footer or tracking is
 * added, because this is a transactional message, not a campaign.
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  resetUrl: string
): Promise<{ success: boolean; error?: string }> {
  const account = await prisma.emailAccount.findFirst({
    where: { isActive: true, smtpPassword: { not: null } },
    orderBy: [{ user: { role: 'desc' } }, { createdAt: 'asc' }],
  });
  if (!account) {
    return { success: false, error: 'No active sending account is connected.' };
  }

  const decrypted = tryDecryptPassword(account.smtpPassword || '');
  if (decrypted.error !== undefined) {
    return { success: false, error: decrypted.error };
  }

  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937;">
  <h2 style="color:#003366;margin:0 0 16px 0;">Reset your password</h2>
  <p>We received a request to reset the password for your Email Marketing Dashboard account.</p>
  <p style="margin:24px 0;">
    <a href="${resetUrl}" style="background:#f0b429;color:#001f3f;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block;">Choose a new password</a>
  </p>
  <p style="font-size:13px;color:#6b7280;">This link expires in 1 hour and can only be used once. If you did not request this, you can ignore this email and your password will stay the same.</p>
  <p style="font-size:12px;color:#9ca3af;word-break:break-all;">If the button does not work, paste this into your browser:<br/>${resetUrl}</p>
</div>`;
  const text = `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour and can only be used once. If you did not request this, ignore this email.`;

  const result = await sendEmail(
    {
      type: account.type,
      email: account.email,
      password: decrypted.password,
      displayName: account.displayName,
      smtpHost: account.smtpHost,
      smtpPort: account.smtpPort,
    },
    {
      from: account.email,
      to: toEmail,
      subject: 'Reset your password',
      html,
      text,
    }
  );
  return { success: result.success, error: result.error };
}

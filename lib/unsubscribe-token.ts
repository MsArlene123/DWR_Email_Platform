import crypto from 'crypto';

/**
 * Signed tokens for unsubscribe/resubscribe links.
 *
 * WHY SIGNING MATTERS:
 * Every email you send contains an unsubscribe link, which means every
 * recipient learns the userId embedded in it. With unsigned tokens, any
 * recipient could craft tokens for OTHER email addresses and unsubscribe
 * them, or worse, hit /api/resubscribe to re-add someone who opted out,
 * which is a CAN-SPAM problem. An HMAC signature means only this server
 * (which holds the secret) can create valid tokens.
 *
 * TOKEN FORMAT (v2):  v2.<base64url payload>.<base64url HMAC-SHA256 signature>
 *
 * LEGACY FORMAT (v1): plain base64url of {"u": userId, "e": email}
 * Emails sent before this fix contain v1 tokens. We still HONOR v1 tokens
 * for UNSUBSCRIBE only (an attacker "unsubscribing" someone is low harm,
 * and breaking opt-out links in already-sent mail would itself be a
 * CAN-SPAM violation). v1 tokens are REJECTED for resubscribe.
 */

function getSecret(): string {
  const secret =
    process.env.UNSUBSCRIBE_SECRET || process.env.NEXTAUTH_SECRET || '';
  if (!secret) {
    // Fail loudly in logs; tokens generated with an empty secret would be forgeable.
    console.error(
      'unsubscribe-token: No UNSUBSCRIBE_SECRET or NEXTAUTH_SECRET set. Tokens cannot be signed securely.'
    );
  }
  return secret;
}

function sign(payloadB64: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64url');
}

/**
 * Generate a signed (v2) unsubscribe token.
 */
export function generateUnsubscribeToken(userId: string, email: string): string {
  const secret = getSecret();
  const payloadB64 = Buffer.from(
    JSON.stringify({ u: userId, e: email })
  ).toString('base64url');
  const signature = sign(payloadB64, secret);
  return `v2.${payloadB64}.${signature}`;
}

/**
 * Verify a signed (v2) token. Returns null if the token is missing,
 * malformed, or the signature does not match.
 */
export function verifyUnsubscribeToken(
  token: string
): { userId: string; email: string } | null {
  try {
    if (!token || !token.startsWith('v2.')) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [, payloadB64, providedSig] = parts;
    const secret = getSecret();
    if (!secret) return null;

    const expectedSig = sign(payloadB64, secret);

    // Constant-time comparison prevents timing attacks on the signature.
    const a = Buffer.from(providedSig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    );
    if (payload.u && payload.e) {
      return { userId: payload.u, email: payload.e };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Decode a LEGACY (v1, unsigned) token from emails sent before this fix.
 * Only use this for the unsubscribe path, never for resubscribe.
 */
export function decodeLegacyUnsubscribeToken(
  token: string
): { userId: string; email: string } | null {
  try {
    if (!token || token.startsWith('v2.')) return null;
    const payload = JSON.parse(
      Buffer.from(token, 'base64url').toString('utf8')
    );
    if (payload.u && payload.e) {
      return { userId: payload.u, email: payload.e };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Backwards-compatible decode used by the unsubscribe route:
 * accepts a valid signed token first, then falls back to legacy.
 */
export function decodeUnsubscribeToken(
  token: string
): { userId: string; email: string } | null {
  return verifyUnsubscribeToken(token) || decodeLegacyUnsubscribeToken(token);
}
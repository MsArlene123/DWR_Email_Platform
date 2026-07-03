import crypto from 'crypto';

/**
 * AES-256-GCM encryption for SMTP passwords stored in the database.
 *
 * WHY THIS EXISTS:
 * SMTP passwords (Gmail app passwords, Titan passwords, Zoho passwords)
 * were stored as plain text in the smtpPassword column. Anyone who gains
 * access to the database, through a leaked backup, a compromised admin
 * panel, or a future SQL injection, gets working mailbox credentials.
 * That is like storing the key to every mailbox in a filing cabinet
 * with no lock.
 *
 * AES-256-GCM encrypts each password with a key that lives ONLY in the
 * environment variable ENCRYPTION_KEY, never in the database. The
 * database now holds ciphertext that is useless without the key, like
 * locking the filing cabinet and keeping the key in a separate safe.
 *
 * ENCRYPTED FORMAT:
 * Encrypted values are stored as: enc:iv:authTag:ciphertext
 * where each part is hex-encoded. The "enc:" prefix lets the system
 * distinguish encrypted values from legacy plaintext passwords, so
 * the transition is seamless. Accounts created before encryption was
 * enabled continue to work; their passwords decrypt as-is until the
 * migration script converts them.
 *
 * REQUIREMENTS:
 * Set ENCRYPTION_KEY in your environment (Abacus Secrets). Generate
 * one with: openssl rand -hex 32
 * This produces a 64-character hex string representing 32 bytes
 * (256 bits). Keep it safe. If you lose it, you lose access to all
 * stored SMTP passwords and must re-enter them.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128-bit IV
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag
const PREFIX = 'enc:';

function getKey(): Buffer | null {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    console.warn(
      'encryption: ENCRYPTION_KEY is not set. Passwords will be stored/read as plaintext.'
    );
    return null;
  }
  const buf = Buffer.from(keyHex, 'hex');
  if (buf.length !== 32) {
    console.error(
      `encryption: ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars), got ${buf.length} bytes. Falling back to plaintext.`
    );
    return null;
  }
  return buf;
}

/**
 * Returns true if the value appears to be encrypted (starts with "enc:").
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

/**
 * Encrypt a plaintext password. Returns the encrypted string in the
 * format "enc:iv:authTag:ciphertext", or the original plaintext if
 * ENCRYPTION_KEY is not configured.
 */
export function encryptPassword(plaintext: string): string {
  const key = getKey();
  if (!key) return plaintext;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a password and report failure EXPLICITLY instead of silently.
 *
 * WHY THIS EXISTS:
 * decryptPassword() returns an empty string when decryption fails,
 * for example when ENCRYPTION_KEY has changed since the password was
 * stored. Callers then hand that empty password to the SMTP server,
 * which rejects the login with a confusing "authentication failed"
 * error that looks like a wrong password rather than what it really
 * is: a key mismatch. This helper makes the real cause visible so
 * the dashboard can tell the user exactly what to do.
 */
export function tryDecryptPassword(
  stored: string
): { password: string; error?: undefined } | { password?: undefined; error: string } {
  if (!stored) {
    return {
      error:
        'No SMTP password is stored for this account. Re-enter the password on the Accounts page.',
    };
  }

  if (!isEncrypted(stored)) {
    // Legacy plaintext password, usable as-is
    return { password: stored };
  }

  if (!getKey()) {
    return {
      error:
        'ENCRYPTION_KEY is not set in the environment, so the stored SMTP password cannot be decrypted. Set ENCRYPTION_KEY, or re-enter the password on the Accounts page.',
    };
  }

  const password = decryptPassword(stored);
  if (!password) {
    return {
      error:
        'The stored SMTP password could not be decrypted. This usually means ENCRYPTION_KEY changed after the password was saved. Re-enter the password for this account on the Accounts page.',
    };
  }

  return { password };
}

/**
 * Decrypt an encrypted password. If the value is not encrypted (no
 * "enc:" prefix), returns it as-is, which provides seamless backwards
 * compatibility with passwords stored before encryption was enabled.
 */
export function decryptPassword(stored: string): string {
  if (!isEncrypted(stored)) {
    // Legacy plaintext password, return as-is
    return stored;
  }

  const key = getKey();
  if (!key) {
    console.error(
      'encryption: Found an encrypted password but ENCRYPTION_KEY is not set. Cannot decrypt.'
    );
    return '';
  }

  try {
    const parts = stored.slice(PREFIX.length).split(':');
    if (parts.length !== 3) {
      console.error('encryption: Malformed encrypted value.');
      return '';
    }

    const [ivHex, authTagHex, ciphertext] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    console.error('encryption: Decryption failed:', err?.message);
    return '';
  }
}
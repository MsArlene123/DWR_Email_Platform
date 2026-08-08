/**
 * Migration script: Encrypt all existing plaintext SMTP passwords.
 *
 * This script finds EmailAccount records whose smtpPassword is still
 * stored as plaintext (i.e., does not start with "enc:") and encrypts
 * them in place using AES-256-GCM via the ENCRYPTION_KEY env var.
 *
 * Safe to run multiple times — already-encrypted passwords are skipped.
 *
 * Usage:
 *   cd nextjs_space && npx tsx scripts/encrypt-existing-passwords.ts
 */

import { PrismaClient } from '@prisma/client';
import { encryptPassword, isEncrypted } from '../lib/encryption';

async function main() {
  const prisma = new PrismaClient();

  try {
    const accounts = await prisma.emailAccount.findMany({
      select: { id: true, email: true, smtpPassword: true },
    });

    console.log(`Found ${accounts.length} email account(s).`);

    let encrypted = 0;
    let skipped = 0;

    for (const account of accounts) {
      if (!account.smtpPassword) {
        console.log(`  [SKIP] ${account.email} — no password stored`);
        skipped++;
        continue;
      }

      if (isEncrypted(account.smtpPassword)) {
        console.log(`  [SKIP] ${account.email} — already encrypted`);
        skipped++;
        continue;
      }

      const encryptedPw = encryptPassword(account.smtpPassword);
      await prisma.emailAccount.update({
        where: { id: account.id },
        data: { smtpPassword: encryptedPw },
      });

      console.log(`  [OK]   ${account.email} — password encrypted`);
      encrypted++;
    }

    console.log(`\nDone. Encrypted: ${encrypted}, Skipped: ${skipped}`);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

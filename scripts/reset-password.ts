/**
 * Emergency password reset, run on the server when you are locked out.
 *
 * Usage:
 *   npx tsx --require dotenv/config scripts/reset-password.ts you@example.com 'NewPassword123'
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

async function main() {
  const [email, newPassword] = process.argv.slice(2);
  if (!email || !newPassword) {
    console.error("Usage: reset-password.ts <email> '<new password>'");
    process.exit(1);
  }
  if (newPassword.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
    });
    if (!user) {
      console.error(`No user found for ${email}`);
      process.exit(1);
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword, 12) },
    });
    console.log(`Password updated for ${user.email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();

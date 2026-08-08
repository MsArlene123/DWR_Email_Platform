/**
 * set-admin-role.ts
 *
 * One-time script: sets one or more users to ADMIN role.
 *
 * Usage on the droplet:
 *   cd /var/www/dwr-email/current
 *   sudo -u www-data bash -c 'set -a; source /var/www/dwr-email/shared/.env; set +a; npx tsx /root/dwr-email-src/scripts/set-admin-role.ts'
 *
 * Or to set a specific email as admin:
 *   ... npx tsx /root/dwr-email-src/scripts/set-admin-role.ts info@docwritereview.com
 *
 * Without arguments, sets ALL existing users to ADMIN (useful for the
 * first run after deploying the admin role feature).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targetEmail = process.argv[2]; // optional: specific email

  if (targetEmail) {
    const normalized = targetEmail.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user) {
      console.error(`User not found: ${normalized}`);
      process.exit(1);
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' },
    });
    console.log(`✓ Set ${user.email} to ADMIN`);
  } else {
    // Set ALL users to ADMIN
    const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
    console.log(`Found ${users.length} user(s). Setting all to ADMIN...`);
    for (const u of users) {
      if (u.role !== 'ADMIN') {
        await prisma.user.update({
          where: { id: u.id },
          data: { role: 'ADMIN' },
        });
        console.log(`  ✓ ${u.email} → ADMIN`);
      } else {
        console.log(`  - ${u.email} (already ADMIN)`);
      }
    }
  }
  console.log('\nDone. Users must sign out and sign back in for the role change to take effect.');
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

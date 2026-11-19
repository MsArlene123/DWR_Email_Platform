/**
 * Clear old dashboard data so you can start fresh.
 *
 * ALWAYS KEPT: users, connected sending accounts, unsubscribes,
 * global suppression list, uploaded images.
 *
 * DEFAULT IS A DRY RUN: it only prints what WOULD be deleted.
 * Add --confirm to actually delete. Pick what to clear with flags:
 *
 *   --campaigns   campaigns, email logs (opens, clicks), bounced emails
 *   --drips       drip sequences, their steps and enrollments
 *   --contacts    imported contacts
 *   --sheets      Google Sheet links (also deletes campaigns that use them)
 *   --templates   email templates (also deletes campaigns and drip steps that use them)
 *   --all         everything above
 *
 * Usage (on the server, with .env loaded):
 *   npx tsx scripts/clear-dashboard.ts --campaigns --drips            (dry run)
 *   npx tsx scripts/clear-dashboard.ts --campaigns --drips --confirm  (deletes)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const args = new Set(process.argv.slice(2));
const all = args.has('--all');
const want = (f: string) => all || args.has(f);
const confirm = args.has('--confirm');

async function main() {
  const steps: { label: string; count: () => Promise<number>; run: () => Promise<unknown> }[] = [];

  if (want('--campaigns')) {
    steps.push(
      { label: 'Email logs', count: () => prisma.emailLog.count(), run: () => prisma.emailLog.deleteMany() },
      { label: 'Bounced emails', count: () => prisma.bouncedEmail.count(), run: () => prisma.bouncedEmail.deleteMany() },
      { label: 'Campaigns', count: () => prisma.campaign.count(), run: () => prisma.campaign.deleteMany() },
    );
  }
  if (want('--drips')) {
    steps.push({
      label: 'Drip sequences (with steps and enrollments)',
      count: () => prisma.dripSequence.count(),
      run: () => prisma.dripSequence.deleteMany(),
    });
  }
  if (want('--contacts')) {
    steps.push({ label: 'Contacts', count: () => prisma.contact.count(), run: () => prisma.contact.deleteMany() });
  }
  if (want('--sheets')) {
    steps.push({ label: 'Google Sheet links', count: () => prisma.googleSheet.count(), run: () => prisma.googleSheet.deleteMany() });
  }
  if (want('--templates')) {
    steps.push({ label: 'Email templates', count: () => prisma.emailTemplate.count(), run: () => prisma.emailTemplate.deleteMany() });
  }

  if (steps.length === 0) {
    console.log('Nothing selected. Use --campaigns, --drips, --contacts, --sheets, --templates or --all.');
    return;
  }

  console.log(confirm ? 'DELETING:' : 'DRY RUN (nothing deleted). Would delete:');
  for (const s of steps) {
    const n = await s.count();
    console.log(`  ${s.label}: ${n}`);
    if (confirm) await s.run();
  }
  console.log(confirm ? 'Done. Unsubscribes, suppression and sending accounts were kept.' : 'Add --confirm to delete.');
}

main().finally(() => prisma.$disconnect());


require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const sql = neon(process.env.DATABASE_URL);

(async () => {
  const templates = JSON.parse(fs.readFileSync('/home/z/my-project/DWR_Email_Platform/drip-templates.json', 'utf-8'));
  console.log('Importing ' + templates.length + ' drip campaign templates...');

  // Get admin user ID
  const admin = await sql`SELECT id FROM "User" WHERE email = 'info@docwritereview.com'`;
  if (admin.length === 0) {
    console.log('ERROR: Admin user not found');
    process.exit(1);
  }
  const adminId = admin[0].id;
  console.log('Admin ID:', adminId);

  let imported = 0;
  let skipped = 0;

  for (const t of templates) {
    try {
      // Check if template already exists (by name)
      const existing = await sql`SELECT id FROM "EmailTemplate" WHERE name = ${t.name}`;
      if (existing.length > 0) {
        console.log('  SKIP (exists):', t.name);
        skipped++;
        continue;
      }

      await sql`
        INSERT INTO "EmailTemplate" (id, "userId", name, category, subject, "htmlContent", "plainText", "isSample", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${adminId}, ${t.name}, ${t.category}, ${t.subject}, ${t.htmlContent}, ${t.plainText}, false, NOW(), NOW())
      `;
      console.log('  OK:', t.name);
      imported++;
    } catch (e) {
      console.log('  ERROR:', t.name, '-', e.message.substring(0, 80));
    }
  }

  console.log('\n=== Result ===');
  console.log('Imported:', imported);
  console.log('Skipped (already exist):', skipped);

  const count = await sql`SELECT COUNT(*)::int as c FROM "EmailTemplate"`;
  console.log('Total templates in database:', count[0].c);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });

/**
 * import-google-sheets.js
 *
 * Imports the 19 Google Sheets contact lists from
 * "Lists - Lists for Hermes and Claude.xlsx" into the DWR Email Platform
 * database as GoogleSheet records.
 *
 * Each sheet is created with:
 *   - name (category + sheet name)
 *   - sheetUrl (full Google Sheets URL)
 *   - sheetId (extracted from URL)
 *   - columns (detected from the sheet, if accessible)
 *   - recipientCount (actual count from the sheet, if accessible)
 *
 * The script attempts to parse each sheet via Google's public CSV export
 * endpoint. If a sheet is private or inaccessible, the record is still
 * created with recipientCount=0 — you can re-connect it later from the
 * dashboard by re-adding the sheet URL.
 *
 * Usage on the droplet:
 *   cd /var/www/dwr-email/current
 *   sudo -u www-data bash -c 'set -a; source /var/www/dwr-email/shared/.env; set +a; node import-google-sheets.js'
 *
 * Safe to run multiple times — skips sheets that already exist by URL.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const LISTS = [
  {
    "name": "Content Calendar for August (August 2026 content calendar · XLSX)",
    "category": "Content Calendar for August",
    "sheetName": "August 2026 content calendar · XLSX",
    "sheetUrl": "https://docs.google.com/spreadsheets/d/1XQa1IMCYh9FaTFP-phuS1DLpPXXtKrUS41s5ro_v7rI/edit?usp=sharing",
    "expectedCount": 0
  },
  {
    "name": "Press/Media (Verified Press Media 2026-08-01)",
    "category": "Press/Media",
    "sheetName": "Verified Press Media 2026-08-01",
    "sheetUrl": "https://docs.google.com/spreadsheets/d/1Umc81iLoOtYBuDEWPt6kCEEDam2PE80dN1s10eBwBWE/edit?usp=sharing",
    "expectedCount": 195
  },
  {
    "name": "Lawyers (Verified DWR Law Firms 2026-08-01)",
    "category": "Lawyers",
    "sheetName": "Verified DWR Law Firms 2026-08-01",
    "sheetUrl": "https://docs.google.com/spreadsheets/d/1NN1K0fy_7cy520s3xR3bAqQTce_jVO5hW1mHRJqcKD8/edit?usp=sharing",
    "expectedCount": 489
  },
  {
    "name": "Nonprofits (Verified DWR Nonprofits 2026-08-01)",
    "category": "Nonprofits",
    "sheetName": "Verified DWR Nonprofits 2026-08-01",
    "sheetUrl": "https://docs.google.com/spreadsheets/d/1B_L9Xb6MLBlEDFQIXDOTuoJ4g-C4w8xbVMNL84Go16A/edit?usp=sharing",
    "expectedCount": 1453
  },
  {
    "name": "Women Owned Business (Verified-WS-Women-Owned-Business)",
    "category": "Women Owned Business",
    "sheetName": "Verified-WS-Women-Owned-Business",
    "sheetUrl": "https://docs.google.com/spreadsheets/d/1OlMG0d8BdN3ye698cXM81Htcodh0q23Y2R82RqsL2jc/edit?usp=sharing",
    "expectedCount": 173
  },
  {
    "name": "Hud Counselors, Legal Aid, Credit Counseling and Affiliates (BK Forum Directory 2026-08-05)",
    "category": "Hud Counselors, Legal Aid, Credit Counseling and Affiliates",
    "sheetName": "BK Forum Directory 2026-08-05",
    "sheetUrl": "https://docs.google.com/spreadsheets/d/1tpbkJMPabQNpe3mOoDWyn9gbtPFz7QLwx1OymrBpEnc/edit?usp=sharing",
    "expectedCount": 757
  },
  {
    "name": "Shelter/Housing (Verified WS Shelter Housing 2026-08-01)",
    "category": "Shelter/Housing",
    "sheetName": "Verified WS Shelter Housing 2026-08-01",
    "sheetUrl": "https://docs.google.com/spreadsheets/d/1XK9JMK316hfSZwDOkCrOuln8CPeLJF1lVvYDPb4aYB8/edit?usp=sharing",
    "expectedCount": 33
  },
  {
    "name": "Childcare (Verified WS Childcare 2026-08-01)",
    "category": "Childcare",
    "sheetName": "Verified WS Childcare 2026-08-01",
    "sheetUrl": "https://docs.google.com/spreadsheets/d/1VhMq8ek_sH63rFJCYol8ijz8rskrS4j2lU15reo_Ej0/edit?usp=sharing",
    "expectedCount": 437
  },
  {
    "name": "Healthcare Clinic (Verified WS Healthcare Clinic 2026-08-01)",
    "category": "Healthcare Clinic",
    "sheetName": "Verified WS Healthcare Clinic 2026-08-01",
    "sheetUrl": "https://docs.google.com/spreadsheets/d/1yITmI_zkWmiDZxvXMCQVXz6i_D_88VSIThHf76SUVVs/edit?usp=sharing",
    "expectedCount": 193
  },
  {
    "name": "Spiritual Healing (Verified WS Spiritual Healing 2026-08-01)",
    "category": "Spiritual Healing",
    "sheetName": "Verified WS Spiritual Healing 2026-08-01",
    "sheetUrl": "https://docs.google.com/spreadsheets/d/1KsgfThplMUoie222YqYDyZQ2d7XNG5TTXeDzJ80ctws/edit?usp=sharing",
    "expectedCount": 262
  },
  {
    "name": "Women & Money (Verified WS Women & Money 2026-08-01)",
    "category": "Women & Money",
    "sheetName": "Verified WS Women & Money 2026-08-01",
    "sheetUrl": "https://docs.google.com/spreadsheets/d/1DeToYTF6XNPJre1EfJkXr9yQ4oPmmz1L7PkfliVirgA/edit?usp=sharing",
    "expectedCount": 145
  },
  {
    "name": "Supportive Growth and Counselors (Verified WS Supportive Growth 2026-08-01)",
    "category": "Supportive Growth and Counselors",
    "sheetName": "Verified WS Supportive Growth 2026-08-01",
    "sheetUrl": "https://docs.google.com/spreadsheets/d/1-FMx1EZG8yekwDDxpZY4ZGm_fQWZfKv8bjOy7fWJ6vE/edit?usp=sharing",
    "expectedCount": 490
  },
  {
    "name": "Legal Resources (Verified WS Legal Resource 2026-08-01)",
    "category": "Legal Resources",
    "sheetName": "Verified WS Legal Resource 2026-08-01",
    "sheetUrl": "https://docs.google.com/spreadsheets/d/1rq56ScXTdzWp26xIEmpx5ubfyxM142JEmpdsoqDVmoo/edit?usp=sharing",
    "expectedCount": 106
  },
  {
    "name": "Employment (Verified WS Employment 2026-08-01)",
    "category": "Employment",
    "sheetName": "Verified WS Employment 2026-08-01",
    "sheetUrl": "https://docs.google.com/spreadsheets/d/1DQizRYCmNcWv4udFmcHippQAuL40hJJewFzDeiN3Y4Q/edit?usp=sharing",
    "expectedCount": 63
  },
  {
    "name": "Education (Verified WS Education Resources 2026-08-01)",
    "category": "Education",
    "sheetName": "Verified WS Education Resources 2026-08-01",
    "sheetUrl": "https://docs.google.com/spreadsheets/d/1Ml47Rb33oIU2a9ZyaM0bpLBthyc_jd8oXklbIaEygvo/edit?usp=sharing",
    "expectedCount": 204
  },
  {
    "name": "BK Affiliates (Verified BK Affiliates 2026-08-01)",
    "category": "BK Affiliates",
    "sheetName": "Verified BK Affiliates 2026-08-01",
    "sheetUrl": "https://docs.google.com/spreadsheets/d/1zgRsFrBF9umDVr9B7k38TJDmoMLpxsxUWrI4tYJAey0/edit?usp=sharing",
    "expectedCount": 79
  },
  {
    "name": "BK Legal Aid (Verified BK Legal Aid 2026-08-01)",
    "category": "BK Legal Aid",
    "sheetName": "Verified BK Legal Aid 2026-08-01",
    "sheetUrl": "https://docs.google.com/spreadsheets/d/12Y6YBpzMdqura0-xDsGFfvvWy-5kmCH7423T5kSDIlo/edit?usp=sharing",
    "expectedCount": 220
  },
  {
    "name": "BK Credit Counseling (Verified BK Credit Counseling 2026-08-01)",
    "category": "BK Credit Counseling",
    "sheetName": "Verified BK Credit Counseling 2026-08-01",
    "sheetUrl": "https://docs.google.com/spreadsheets/d/1EFBbyMVxdx8Ynzyy4MYD0iSKRT5yy1qmVCyA_VYWkdM/edit?usp=sharing",
    "expectedCount": 60
  },
  {
    "name": "BK Hud Counselors (Verified BK HUD Counselors 2026-08-01)",
    "category": "BK Hud Counselors",
    "sheetName": "Verified BK HUD Counselors 2026-08-01",
    "sheetUrl": "https://docs.google.com/spreadsheets/d/1Lt9bvlIhSf5zRaFG9AaStTZavOYZA-HSNCw7N-rFUnk/edit?usp=sharing",
    "expectedCount": 183
  }
];

function extractSheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function extractGid(url) {
  const match = url.match(/[#&?]gid=([0-9]+)/);
  return match ? match[1] : '0';
}

async function tryParseSheet(sheetUrl) {
  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) return { columns: [], recipientCount: 0, error: 'Invalid URL' };
  
  const gid = extractGid(sheetUrl);
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&headers=1&gid=${gid}`;
  
  try {
    const response = await fetch(csvUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      return { columns: [], recipientCount: 0, error: `HTTP ${response.status}` };
    }
    const csv = await response.text();
    const lines = csv.split('\n').filter(l => l.trim());
    if (lines.length === 0) {
      return { columns: [], recipientCount: 0, error: 'Empty sheet' };
    }
    
    // Parse header row (first line)
    const header = lines[0].split(',').map(c => c.replace(/^"|"$/g, '').trim());
    
    // Find email column
    const emailPatterns = [/^email[_\s]*address$/i, /^e[_\s]*mail$/i, /^email$/i, /email/i];
    let emailColumn = null;
    for (const pattern of emailPatterns) {
      emailColumn = header.find(c => pattern.test(c));
      if (emailColumn) break;
    }
    
    // Count data rows (excluding header)
    const recipientCount = lines.length - 1;
    
    return {
      columns: header,
      recipientCount,
      emailColumn,
      error: null,
    };
  } catch (e) {
    return { columns: [], recipientCount: 0, error: e.message };
  }
}

async function main() {
  // Find the admin user
  let adminUser = await prisma.user.findUnique({
    where: { email: "info@docwritereview.com" },
  });
  if (!adminUser) {
    adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  }
  if (!adminUser) {
    adminUser = await prisma.user.findFirst();
  }
  
  if (!adminUser) {
    console.error("No user found in the database.");
    process.exit(1);
  }
  
  console.log(`Importing ${LISTS.length} Google Sheets for: ${adminUser.email}`);
  console.log("");
  
  let created = 0;
  let skipped = 0;
  let parseFailed = 0;
  
  for (const list of LISTS) {
    const sheetId = extractSheetId(list.sheetUrl);
    if (!sheetId) {
      console.log(`  SKIP: ${list.name} (invalid URL)`);
      skipped++;
      continue;
    }
    
    // Check if already exists (by sheetId + userId)
    const existing = await prisma.googleSheet.findFirst({
      where: { userId: adminUser.id, sheetId },
    });
    
    if (existing) {
      console.log(`  SKIP: ${list.name} (already exists)`);
      skipped++;
      continue;
    }
    
    // Try to parse the sheet
    console.log(`  Parsing: ${list.name}...`);
    const parsed = await tryParseSheet(list.sheetUrl);
    
    if (parsed.error) {
      console.log(`    ⚠ Could not parse (${parsed.error}) — creating record anyway`);
      parseFailed++;
    } else {
      console.log(`    ✓ Parsed: ${parsed.recipientCount} contacts, email column: ${parsed.emailColumn || '(not found)'}`);
    }
    
    await prisma.googleSheet.create({
      data: {
        userId: adminUser.id,
        name: list.name,
        sheetUrl: list.sheetUrl,
        sheetId,
        columns: JSON.stringify(parsed.columns || []),
        recipientCount: parsed.recipientCount || 0,
      },
    });
    
    console.log(`    ✓ Created: ${list.name}`);
    created++;
  }
  
  console.log("");
  console.log(`Done.`);
  console.log(`  Created: ${created} sheets`);
  console.log(`  Skipped: ${skipped} (already existed)`);
  console.log(`  Parse failed: ${parseFailed} (created with recipientCount=0 — reconnect from dashboard)`);
  console.log("");
  console.log("Visit https://dwremail.online/dashboard/sheets to see them.");
  console.log("If a sheet shows 0 contacts, click it and re-add the URL to re-parse.");
}

main()
  .catch((e) => {
    console.error("Import failed:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

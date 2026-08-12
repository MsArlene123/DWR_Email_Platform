import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseGoogleSheet } from '@/lib/sheets-parser';
import { getDataScope } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

/**
 * Split a Google Sheet's contacts into N sub-lists.
 *
 * POST /api/sheets/[id]/split
 * Body: { numberOfSplits: number }
 *
 * What it does:
 * 1. Reads all contacts from the source Google Sheet
 * 2. Shuffles them randomly (so each sub-list gets a mix)
 * 3. Creates N new GoogleSheet records (sub-lists) with names like:
 *    "OriginalName 1 of 4", "OriginalName 2 of 4", etc.
 * 4. Stores each sub-list's contacts in the Contact table
 * 5. Each sub-list has parentSheetId set to the source sheet's ID
 *
 * When a campaign is created using a sub-list, the campaign creation
 * logic detects parentSheetId !== null and reads from the Contact table
 * instead of parsing the Google Sheet URL.
 *
 * This is safe — it does NOT modify the original sheet, existing
 * campaigns, or any other data. It only CREATES new GoogleSheet and
 * Contact records.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { numberOfSplits } = body;

    // Validate numberOfSplits
    const n = parseInt(numberOfSplits, 10);
    if (!n || n < 2 || n > 20) {
      return NextResponse.json(
        { error: 'Number of sub-lists must be between 2 and 20' },
        { status: 400 }
      );
    }

    // Fetch the source sheet
    const scope = await getDataScope();
    const sheet = await prisma.googleSheet.findFirst({
      where: { id: params.id, ...scope },
    });

    if (!sheet) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
    }

    // Check if this sheet is already a sub-list
    if (sheet.parentSheetId) {
      return NextResponse.json(
        { error: 'Cannot split a sub-list. Split the original list instead.' },
        { status: 400 }
      );
    }

    // Check if this sheet has already been split
    const existingSplits = await prisma.googleSheet.count({
      where: { parentSheetId: sheet.id },
    });
    if (existingSplits > 0) {
      return NextResponse.json(
        {
          error: `This list has already been split into ${existingSplits} sub-lists. Delete the existing sub-lists first if you want to re-split.`,
        },
        { status: 400 }
      );
    }

    // Parse the source sheet to get all contacts
    const parsed = await parseGoogleSheet(sheet.sheetUrl);
    if (parsed.error) {
      return NextResponse.json(
        { error: `Failed to read source sheet: ${parsed.error}` },
        { status: 400 }
      );
    }

    if (!parsed.emailColumn) {
      return NextResponse.json(
        { error: 'Source sheet does not have an email column' },
        { status: 400 }
      );
    }

    // Filter valid recipients (with valid email addresses)
    const validRecipients = parsed.rows.filter((r) => {
      const email = (r[parsed.emailColumn!] || '').trim();
      return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    });

    if (validRecipients.length === 0) {
      return NextResponse.json(
        { error: 'No valid email recipients found in the source sheet' },
        { status: 400 }
      );
    }

    // Shuffle recipients randomly so each sub-list gets a fair mix
    const shuffled = [...validRecipients];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Split into N groups (distribute remainder to first few groups)
    const baseSize = Math.floor(shuffled.length / n);
    const remainder = shuffled.length % n;
    const groups: typeof shuffled[] = [];
    let offset = 0;
    for (let i = 0; i < n; i++) {
      const size = baseSize + (i < remainder ? 1 : 0);
      groups.push(shuffled.slice(offset, offset + size));
      offset += size;
    }

    // Create N sub-list GoogleSheet records + Contact records
    const createdSubLists: Array<{
      id: string;
      name: string;
      recipientCount: number;
    }> = [];

    const columns = JSON.parse(sheet.columns || '{}');

    for (let i = 0; i < n; i++) {
      const index = i + 1; // 1-based
      const subSheetName = `${sheet.name} ${index} of ${n}`;

      // Create the sub-list GoogleSheet record
      const subSheet = await prisma.googleSheet.create({
        data: {
          userId: sheet.userId,
          name: subSheetName,
          sheetUrl: sheet.sheetUrl, // Keep the original URL (not used for sub-lists)
          sheetId: sheet.sheetId,
          columns: sheet.columns, // Inherit column mapping
          recipientCount: groups[i].length,
          parentSheetId: sheet.id,
          splitIndex: index,
          splitTotal: n,
        },
      });

      // Create Contact records for this sub-list
      const contactData = groups[i].map((row) => {
        const email = (row[parsed.emailColumn!] || '').trim();
        const firstName =
          row.FIRST_NAME || row['First Name'] || row.first_name || '';
        const lastName =
          row.LAST_NAME || row['Last Name'] || row.last_name || '';
        const title = row.TITLE || row['Title'] || row.title || '';
        const companyName =
          row.COMPANY_NAME || row['Company Name'] || row.company_name || '';
        const website = row.WEBSITE || row['Website'] || row.website || '';
        const phone = row.PHONE_NUMBERS || row['Phone'] || row.phone || '';

        return {
          userId: sheet.userId,
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          title: title || null,
          companyName: companyName || null,
          website: website || null,
          phone: phone || null,
          status: 'ACTIVE' as const,
          sourceSheetId: subSheet.id,
          sourceSheetName: subSheetName,
          importedAt: new Date(),
        };
      });

      // Batch create contacts (createMany for performance)
      if (contactData.length > 0) {
        await prisma.contact.createMany({ data: contactData });
      }

      createdSubLists.push({
        id: subSheet.id,
        name: subSheetName,
        recipientCount: groups[i].length,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Split "${sheet.name}" into ${n} sub-lists`,
      sourceSheet: {
        id: sheet.id,
        name: sheet.name,
        totalRecipients: validRecipients.length,
      },
      subLists: createdSubLists,
    });
  } catch (error: any) {
    console.error('[sheets/split] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to split list' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseGoogleSheet, extractSheetId } from '@/lib/sheets-parser';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sheets = await prisma.googleSheet.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ sheets });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, sheetUrl } = body;

    if (!name || !sheetUrl) {
      return NextResponse.json(
        { error: 'Name and sheet URL are required' },
        { status: 400 }
      );
    }

    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) {
      return NextResponse.json(
        { error: 'Invalid Google Sheets URL' },
        { status: 400 }
      );
    }

    // Parse the sheet to verify access and get columns/count
    const parsed = await parseGoogleSheet(sheetUrl);

    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    if (!parsed.emailColumn) {
      return NextResponse.json(
        {
          error:
            'Could not find an email column. Your sheet should have a column named EMAIL_ADDRESS, EMAIL, or E-MAIL.',
        },
        { status: 400 }
      );
    }

    const sheet = await prisma.googleSheet.create({
      data: {
        userId: session.user.id,
        name,
        sheetUrl,
        sheetId,
        columns: JSON.stringify(parsed.columns),
        recipientCount: parsed.rows.length,
      },
    });

    return NextResponse.json({
      sheet,
      preview: {
        columns: parsed.columns,
        emailColumn: parsed.emailColumn,
        sampleRows: parsed.rows.slice(0, 3),
        totalRows: parsed.rows.length,
      },
    });
  } catch (error: any) {
    console.error('Create sheet error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to add sheet' },
      { status: 500 }
    );
  }
}

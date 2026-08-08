import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseGoogleSheet } from '@/lib/sheets-parser';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { sheetUrl } = body;

  if (!sheetUrl) {
    return NextResponse.json({ error: 'sheetUrl is required' }, { status: 400 });
  }

  const parsed = await parseGoogleSheet(sheetUrl);

  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  return NextResponse.json({
    columns: parsed.columns,
    emailColumn: parsed.emailColumn,
    sampleRows: parsed.rows.slice(0, 5),
    totalRows: parsed.rows.length,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseGoogleSheet } from '@/lib/sheets-parser';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sheet = await prisma.googleSheet.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!sheet) {
    return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
  }

  // Re-parse to show current data
  const parsed = await parseGoogleSheet(sheet.sheetUrl);

  return NextResponse.json({
    sheet,
    preview: {
      columns: parsed.columns,
      emailColumn: parsed.emailColumn,
      sampleRows: parsed.rows.slice(0, 10),
      totalRows: parsed.rows.length,
      error: parsed.error,
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sheet = await prisma.googleSheet.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!sheet) {
    return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
  }

  await prisma.googleSheet.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sheet = await prisma.googleSheet.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!sheet) {
    return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
  }

  // Refresh: re-parse and update
  const parsed = await parseGoogleSheet(sheet.sheetUrl);

  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const updated = await prisma.googleSheet.update({
    where: { id: params.id },
    data: {
      columns: JSON.stringify(parsed.columns),
      recipientCount: parsed.rows.length,
    },
  });

  return NextResponse.json({ sheet: updated });
}

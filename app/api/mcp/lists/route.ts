/** Route 1: GET /api/mcp/lists — Return all email lists with contact counts */
/** Route 2: POST /api/mcp/lists — Create a new email list */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateMcpRequest } from '@/lib/mcp-auth';

export async function GET(req: NextRequest) {
  const auth = validateMcpRequest(req);
  if (!auth.ok) return auth.error!;

  const sheets = await prisma.googleSheet.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      recipientCount: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    lists: sheets.map((s) => ({
      id: s.id,
      name: s.name,
      contact_count: s.recipientCount,
      created_at: s.createdAt.toISOString(),
    })),
    total: sheets.length,
  });
}

export async function POST(req: NextRequest) {
  const auth = validateMcpRequest(req);
  if (!auth.ok) return auth.error!;

  const { name, description } = await req.json();
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  // Create a GoogleSheet record (acts as a list)
  const sheet = await prisma.googleSheet.create({
    data: {
      userId: await getFirstUserId(),
      name,
      sheetUrl: `mcp-created:${name}`,
      sheetId: `mcp-${Date.now()}`,
      columns: JSON.stringify(['EMAIL_ADDRESS', 'FIRST_NAME', 'LAST_NAME', 'ORGANIZATION_NAME']),
      recipientCount: 0,
    },
  });

  return NextResponse.json({
    id: sheet.id,
    name: sheet.name,
    description: description || null,
    contact_count: 0,
    created_at: sheet.createdAt.toISOString(),
  }, { status: 201 });
}

async function getFirstUserId(): Promise<string> {
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
  if (!user) {
    const anyUser = await prisma.user.findFirst({ select: { id: true } });
    if (!anyUser) throw new Error('No users found');
    return anyUser.id;
  }
  return user.id;
}

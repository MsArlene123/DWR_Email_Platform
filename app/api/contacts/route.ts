import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { importContactsFromSheet } from '@/lib/contact-import';

export const dynamic = 'force-dynamic';

/**
 * GET /api/contacts
 *
 * List all contacts with optional filtering by status, list, or search.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const listName = url.searchParams.get('list');
  const search = url.searchParams.get('search');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const skip = (page - 1) * limit;

  const where: any = { userId: session.user.id };
  if (status) where.status = status;
  if (listName) where.listName = listName;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { companyName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ]);

  // Get distinct list names for the filter dropdown
  const lists = await prisma.contact.findMany({
    where: { userId: session.user.id, listName: { not: null } },
    select: { listName: true },
    distinct: ['listName'],
  });

  // Summary counts
  const [totalActive, totalUnsubscribed, totalBounced, totalBlacklisted] = await Promise.all([
    prisma.contact.count({ where: { userId: session.user.id, status: 'ACTIVE' } }),
    prisma.contact.count({ where: { userId: session.user.id, status: 'UNSUBSCRIBED' } }),
    prisma.contact.count({ where: { userId: session.user.id, status: 'BOUNCED' } }),
    prisma.contact.count({ where: { userId: session.user.id, status: 'BLACKLISTED' } }),
  ]);

  return NextResponse.json({
    contacts,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    lists: lists.map((l) => l.listName).filter(Boolean),
    summary: {
      total: totalActive + totalUnsubscribed + totalBounced + totalBlacklisted,
      active: totalActive,
      unsubscribed: totalUnsubscribed,
      bounced: totalBounced,
      blacklisted: totalBlacklisted,
    },
  });
}

/**
 * POST /api/contacts
 *
 * Import contacts from a Google Sheet into the internal database.
 * Body: { sheetId: string, listName?: string, tags?: string }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sheetId, listName, tags } = await req.json();
  if (!sheetId) {
    return NextResponse.json({ error: 'sheetId is required' }, { status: 400 });
  }

  try {
    const result = await importContactsFromSheet(session.user.id, sheetId, {
      listName,
      tags,
    });

    return NextResponse.json({
      success: true,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
      message: result.imported > 0
        ? `Imported ${result.imported} contacts (${result.skipped} skipped)`
        : `No new contacts to import (${result.skipped} already exist or excluded)`,
    });
  } catch (error: any) {
    console.error('Contact import error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to import contacts' },
      { status: 500 }
    );
  }
}
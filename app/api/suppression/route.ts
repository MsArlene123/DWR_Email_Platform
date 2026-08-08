/**
 * /api/suppression
 *
 * Global suppression list management.
 *
 * GET    /api/suppression              — list suppressed emails (with filters)
 * POST   /api/suppression              — add an email to the suppression list
 * DELETE /api/suppression?email=...    — remove an email from the suppression list
 * GET    /api/suppression?stats=true   — get suppression statistics
 *
 * All routes require authentication. Only admins can add/remove entries
 * (regular users can view the list but cannot modify it).
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  isGloballySuppressed,
  suppressEmail,
  unsuppressEmail,
  getSuppressionStats,
  normalizeEmail,
} from '@/lib/suppression';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  // Stats mode: /api/suppression?stats=true
  if (searchParams.get('stats') === 'true') {
    const stats = await getSuppressionStats();
    return NextResponse.json(stats);
  }

  // Check mode: /api/suppression?check=email@example.com
  const checkEmail = searchParams.get('check');
  if (checkEmail) {
    const result = await isGloballySuppressed(checkEmail);
    return NextResponse.json({ email: normalizeEmail(checkEmail), suppressed: !!result, details: result });
  }

  // List mode with optional filters
  const reason = searchParams.get('reason');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '100');
  const skip = (page - 1) * limit;

  const where: any = {};
  if (reason) where.reason = reason;
  if (search) where.email = { contains: normalizeEmail(search) };

  const [entries, total] = await Promise.all([
    prisma.globalSuppression.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.globalSuppression.count({ where }),
  ]);

  return NextResponse.json({ entries, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required to modify the suppression list' }, { status: 403 });
  }

  const body = await req.json();
  const { email, reason, source, notes } = body;

  if (!email || !reason) {
    return NextResponse.json({ error: 'Email and reason are required' }, { status: 400 });
  }

  const validReasons = ['SPAM_TRAP', 'COMPLAINT', 'HARD_BOUNCE', 'MANUAL', 'RECIPIENT_REQUEST'];
  if (!validReasons.includes(reason)) {
    return NextResponse.json({ error: `Invalid reason. Must be one of: ${validReasons.join(', ')}` }, { status: 400 });
  }

  await suppressEmail(email, reason, source || session.user.email || undefined, notes);

  return NextResponse.json({ success: true, email: normalizeEmail(email), reason });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required to modify the suppression list' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Email parameter is required (?email=...)' }, { status: 400 });
  }

  const removed = await unsuppressEmail(email);
  if (!removed) {
    return NextResponse.json({ error: 'Email not found in suppression list' }, { status: 404 });
  }

  return NextResponse.json({ success: true, removed: normalizeEmail(email) });
}

/**
 * /api/admin/users
 *
 * Admin-only endpoints for managing user accounts.
 * All routes require ADMIN role. Non-admins get 403.
 *
 * GET    /api/admin/users           — list all users with data counts
 * POST   /api/admin/users           — create a new user
 * PATCH  /api/admin/users?id=...    — update a user (role, name, status)
 * DELETE /api/admin/users?id=...    — delete a user (with optional data reassignment)
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/** Guard: returns the session if the user is admin, or a 403 response. */
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (session.user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 }) };
  }
  return { session };
}

// ─── GET: List all users ───────────────────────────────────────────────────
export async function GET() {
  const guard = await requireAdmin();
  if ('error' in guard) return guard.error;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Attach data counts for each user
  const usersWithCounts = await Promise.all(
    users.map(async (u) => {
      const [templates, campaigns, contacts, sheets, accounts, images, dripSequences] = await Promise.all([
        prisma.emailTemplate.count({ where: { userId: u.id } }),
        prisma.campaign.count({ where: { userId: u.id } }),
        prisma.contact.count({ where: { userId: u.id } }),
        prisma.googleSheet.count({ where: { userId: u.id } }),
        prisma.emailAccount.count({ where: { userId: u.id } }),
        prisma.uploadedImage.count({ where: { userId: u.id } }),
        prisma.dripSequence.count({ where: { userId: u.id } }),
      ]);
      return { ...u, _counts: { templates, campaigns, contacts, sheets, accounts, images, dripSequences } };
    })
  );

  return NextResponse.json({ users: usersWithCounts });
}

// ─── POST: Create a new user ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ('error' in guard) return guard.error;

  const body = await req.json();
  const { email, password, name, role } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: hashedPassword,
      name: name || null,
      role: role === 'ADMIN' ? 'ADMIN' : 'USER',
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user }, { status: 201 });
}

// ─── PATCH: Update a user (role, name, reset password) ─────────────────────
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if ('error' in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('id');
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required (?id=...)' }, { status: 400 });
  }

  const body = await req.json();
  const { role, name, newPassword } = body;

  // Don't allow admin to demote themselves (locks out the only admin)
  const guardSession = guard.session!;
  if (userId === guardSession.user.id && role === 'USER') {
    return NextResponse.json(
      { error: 'You cannot demote yourself. Ask another admin to demote you.' },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const data: { role?: 'USER' | 'ADMIN'; name?: string | null; password?: string } = {};
  if (role === 'ADMIN' || role === 'USER') data.role = role;
  if (name !== undefined) data.name = name || null;
  if (newPassword) {
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    data.password = await bcrypt.hash(newPassword, 12);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, name: true, role: true, updatedAt: true },
  });

  return NextResponse.json({ user: updated });
}

// ─── DELETE: Delete a user (with optional data reassignment) ────────────────
export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if ('error' in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('id');
  const reassignTo = searchParams.get('reassignTo'); // optional: user ID to reassign data to

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required (?id=...)' }, { status: 400 });
  }

  // Don't allow admin to delete themselves
  const guardSession = guard.session!;
  if (userId === guardSession.user.id) {
    return NextResponse.json(
      { error: 'You cannot delete your own account while signed in.' },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // If reassigning, verify the target user exists
  if (reassignTo) {
    const reassignTarget = await prisma.user.findUnique({ where: { id: reassignTo } });
    if (!reassignTarget) {
      return NextResponse.json({ error: 'Reassignment target user not found' }, { status: 404 });
    }

    // Reassign all data to the target user
    await Promise.all([
      prisma.emailTemplate.updateMany({ where: { userId }, data: { userId: reassignTo } }),
      prisma.campaign.updateMany({ where: { userId }, data: { userId: reassignTo } }),
      prisma.contact.updateMany({ where: { userId }, data: { userId: reassignTo } }),
      prisma.googleSheet.updateMany({ where: { userId }, data: { userId: reassignTo } }),
      prisma.emailAccount.updateMany({ where: { userId }, data: { userId: reassignTo } }),
      prisma.uploadedImage.updateMany({ where: { userId }, data: { userId: reassignTo } }),
      prisma.dripSequence.updateMany({ where: { userId }, data: { userId: reassignTo } }),
    ]);
  }

  // Delete the user (cascade will clean up any remaining owned records)
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({
    success: true,
    deleted: target.email,
    reassignedTo: reassignTo || null,
  });
}

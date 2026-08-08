'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  Trash2,
  KeyRound,
  Shield,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  Mail,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import toast from 'react-hot-toast';

interface UserWithCounts {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  _counts: {
    templates: number;
    campaigns: number;
    contacts: number;
    sheets: number;
    accounts: number;
    images: number;
    dripSequences: number;
  };
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserWithCounts | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserWithCounts | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      toast.error('Admin access required');
      router.push('/dashboard');
    }
  }, [status, session, router]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      } else if (res.status === 403) {
        toast.error('Admin access required');
        router.push('/dashboard');
      }
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchUsers();
    }
  }, [status, fetchUsers]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (session?.user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            User Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Admin: {session.user.email} — manage all user accounts and data access.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900">Admin Mode Active</p>
            <p className="text-xs text-blue-700 mt-0.5">
              You can see and manage all users' data (templates, campaigns, contacts, etc.). Regular users can only see their own data.
            </p>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                      {u.name?.[0]?.toUpperCase() || u.email[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.name || '(no name)'}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {u.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {u.role === 'ADMIN' ? (
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                      <Shield className="h-3 w-3 mr-1" /> Admin
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-600">User</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <span className="inline-block mr-3">{u._counts.templates} templates</span>
                    <span className="inline-block mr-3">{u._counts.campaigns} campaigns</span>
                    <span className="inline-block mr-3">{u._counts.contacts} contacts</span>
                    <span className="inline-block mr-3">{u._counts.accounts} accounts</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setResetTarget(u)}
                      title="Reset password"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleRole(u)}
                      title={u.role === 'ADMIN' ? 'Demote to User' : 'Promote to Admin'}
                      disabled={u.id === session.user.id}
                    >
                      <Shield className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteTarget(u)}
                      disabled={u.id === session.user.id}
                      title="Delete user"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create user dialog */}
      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          fetchUsers();
          setCreateOpen(false);
        }}
      />

      {/* Reset password dialog */}
      <ResetPasswordDialog
        user={resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
        onReset={() => {
          setResetTarget(null);
        }}
      />

      {/* Delete user dialog */}
      <DeleteUserDialog
        user={deleteTarget}
        users={users}
        currentUser={session.user}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onDeleted={() => {
          fetchUsers();
          setDeleteTarget(null);
        }}
      />
    </div>
  );

  async function toggleRole(u: UserWithCounts) {
    const newRole = u.role === 'ADMIN' ? 'USER' : 'ADMIN';
    const action = newRole === 'ADMIN' ? 'promote' : 'demote';
    if (!confirm(`Are you sure you want to ${action} ${u.email} to ${newRole}?`)) return;
    try {
      const res = await fetch(`/api/admin/users?id=${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        toast.success(`${u.email} is now ${newRole}`);
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update role');
      }
    } catch {
      toast.error('Network error');
    }
  }
}

// ─── Create User Dialog ─────────────────────────────────────────────────────
function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password, role }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`User ${email} created`);
        setEmail('');
        setName('');
        setPassword('');
        setRole('USER');
        onCreated();
      } else {
        toast.error(data.error || 'Failed to create user');
      }
    } catch {
      toast.error('Network error');
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="create-name">Name</Label>
            <Input id="create-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="create-email">Email *</Label>
            <Input id="create-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="create-password">Password * (min 8 chars)</Label>
            <Input id="create-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="mt-1" />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">User (can only see own data)</SelectItem>
                <SelectItem value="ADMIN">Admin (can see all data + manage users)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reset Password Dialog ──────────────────────────────────────────────────
function ResetPasswordDialog({
  user,
  onOpenChange,
  onReset,
}: {
  user: UserWithCounts | null;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      if (res.ok) {
        toast.success(`Password reset for ${user.email}`);
        setNewPassword('');
        onReset();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to reset password');
      }
    } catch {
      toast.error('Network error');
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-500">
            Set a new password for <strong>{user?.email}</strong>. The user will need to sign in with this new password.
          </p>
          <div>
            <Label htmlFor="reset-password">New Password (min 8 chars)</Label>
            <Input
              id="reset-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete User Dialog ─────────────────────────────────────────────────────
function DeleteUserDialog({
  user,
  users,
  currentUser,
  onOpenChange,
  onDeleted,
}: {
  user: UserWithCounts | null;
  users: UserWithCounts[];
  currentUser: { id: string };
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [reassignTo, setReassignTo] = useState('none');
  const [submitting, setSubmitting] = useState(false);

  const otherUsers = users.filter((u) => u.id !== user?.id && u.id !== currentUser.id);
  const hasData = user && (
    user._counts.templates > 0 ||
    user._counts.campaigns > 0 ||
    user._counts.contacts > 0 ||
    user._counts.accounts > 0
  );

  const handleDelete = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const params = new URLSearchParams({ id: user.id });
      if (reassignTo !== 'none' && reassignTo !== 'delete') {
        params.set('reassignTo', reassignTo);
      }
      const res = await fetch(`/api/admin/users?${params}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Deleted ${data.deleted}`);
        setReassignTo('none');
        onDeleted();
      } else {
        toast.error(data.error || 'Failed to delete user');
      }
    } catch {
      toast.error('Network error');
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete User
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            You are about to delete <strong>{user?.email}</strong>. This action cannot be undone.
          </p>

          {hasData && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-900 mb-2">
                This user has data:
              </p>
              <ul className="text-xs text-amber-700 space-y-1">
                {user!._counts.templates > 0 && <li>{user!._counts.templates} templates</li>}
                {user!._counts.campaigns > 0 && <li>{user!._counts.campaigns} campaigns</li>}
                {user!._counts.contacts > 0 && <li>{user!._counts.contacts} contacts</li>}
                {user!._counts.accounts > 0 && <li>{user!._counts.accounts} email accounts</li>}
              </ul>
              <p className="text-xs text-amber-700 mt-2">
                Choose what to do with this data:
              </p>
              <Select value={reassignTo} onValueChange={setReassignTo}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Delete all data (irreversible)</SelectItem>
                  {otherUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      Reassign to {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? 'Deleting...' : 'Delete User'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

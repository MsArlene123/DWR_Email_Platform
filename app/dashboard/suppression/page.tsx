'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  ShieldBan,
  Plus,
  Trash2,
  Search,
  Loader2,
  AlertTriangle,
  Shield,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface SuppressionEntry {
  id: string;
  email: string;
  reason: string;
  source: string | null;
  notes: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  byReason: Record<string, number>;
  recentAdditions: Array<{ email: string; reason: string; source: string | null; createdAt: string }>;
}

const REASON_LABELS: Record<string, { label: string; color: string; description: string }> = {
  SPAM_TRAP: { label: 'Spam Trap', color: 'bg-red-100 text-red-700', description: 'Known spam-trap address' },
  COMPLAINT: { label: 'Complaint', color: 'bg-orange-100 text-orange-700', description: 'Recipient hit "Mark as Spam"' },
  HARD_BOUNCE: { label: 'Hard Bounce', color: 'bg-amber-100 text-amber-700', description: 'Permanent delivery failure' },
  MANUAL: { label: 'Manual', color: 'bg-gray-100 text-gray-700', description: 'Admin manually added' },
  RECIPIENT_REQUEST: { label: 'Recipient Request', color: 'bg-blue-100 text-blue-700', description: 'Recipient asked to never be emailed' },
};

export default function SuppressionListPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [entries, setEntries] = useState<SuppressionEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [listRes, statsRes] = await Promise.all([
        fetch(`/api/suppression?search=${encodeURIComponent(search)}&reason=${reasonFilter === 'all' ? '' : reasonFilter}&limit=500`),
        fetch('/api/suppression?stats=true'),
      ]);
      if (listRes.ok) {
        const data = await listRes.json();
        setEntries(data.entries || []);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch {
      toast.error('Failed to load suppression list');
    } finally {
      setLoading(false);
    }
  }, [search, reasonFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (email: string) => {
    if (!confirm(`Remove "${email}" from the suppression list? This person will receive emails again.`)) return;
    try {
      const res = await fetch(`/api/suppression?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`Removed ${email} from suppression list`);
        fetchData();
      } else {
        toast.error('Failed to remove');
      }
    } catch {
      toast.error('Network error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldBan className="h-6 w-6 text-red-600" />
            Global Suppression List
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Emails on this list will NEVER be sent to — by any user, any campaign, any drip sequence.
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              <Download className="h-4 w-4 mr-2" />
              Bulk Import
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </div>
        )}
      </div>

      {/* Stats banner */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Total Suppressed</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          {Object.entries(REASON_LABELS).map(([key, info]) => (
            <div key={key} className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">{info.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.byReason[key] || 0}</p>
            </div>
          ))}
        </div>
      )}

      {/* CAN-SPAM warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">CAN-SPAM Compliance</p>
            <p className="text-xs text-amber-700 mt-1">
              38 U.S.C. § 7704(a)(3) requires honoring opt-out requests within 10 business days.
              This global suppression list ensures compliance across all campaigns and drip sequences.
              Adding a spam trap or known complainer here protects your sender reputation.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={reasonFilter} onValueChange={setReasonFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reasons</SelectItem>
            {Object.entries(REASON_LABELS).map(([key, info]) => (
              <SelectItem key={key} value={key}>{info.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">
              {search || reasonFilter !== 'all' ? 'No matching entries' : 'No suppressed emails yet'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Added</th>
                {isAdmin && <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">{entry.email}</td>
                  <td className="px-4 py-3">
                    <Badge className={REASON_LABELS[entry.reason]?.color || 'bg-gray-100 text-gray-700'}>
                      {REASON_LABELS[entry.reason]?.label || entry.reason}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{entry.source || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(entry.email)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add dialog */}
      <AddSuppressionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={() => {
          fetchData();
          setAddOpen(false);
        }}
      />

      {/* Bulk import dialog */}
      <BulkImportDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onImported={() => {
          fetchData();
          setBulkOpen(false);
        }}
      />
    </div>
  );
}

function AddSuppressionDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}) {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('MANUAL');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/suppression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, reason, notes }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Suppressed ${email}`);
        setEmail('');
        setReason('MANUAL');
        setNotes('');
        onAdded();
      } else {
        toast.error(data.error || 'Failed to suppress email');
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
          <DialogTitle>Add to Suppression List</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="supp-email">Email Address *</Label>
            <Input
              id="supp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="mt-1"
              placeholder="spam-trap@example.com"
            />
          </div>
          <div>
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REASON_LABELS).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    {info.label} — {info.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="supp-notes">Notes (optional)</Label>
            <Textarea
              id="supp-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1"
              placeholder="Why is this email being suppressed?"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding...' : 'Suppress Email'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BulkImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}) {
  const [emails, setEmails] = useState('');
  const [reason, setReason] = useState('SPAM_TRAP');
  const [submitting, setSubmitting] = useState(false);

  const handleImport = async () => {
    const emailList = emails.split('\n').map((e) => e.trim()).filter(Boolean);
    if (emailList.length === 0) {
      toast.error('Paste at least one email address');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/suppression/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: emailList, reason }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Suppressed ${data.created} emails (${data.skipped} already on list)`);
        setEmails('');
        onImported();
      } else {
        toast.error(data.error || 'Failed to import');
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
          <DialogTitle>Bulk Import Suppression List</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REASON_LABELS).map(([key, info]) => (
                  <SelectItem key={key} value={key}>{info.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="bulk-emails">Email Addresses (one per line)</Label>
            <Textarea
              id="bulk-emails"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              rows={10}
              className="mt-1 font-mono text-sm"
              placeholder="spam-trap-1@example.com&#10;complainer@example.com&#10;hard-bounce@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              {emails.split('\n').filter((e) => e.trim()).length} emails ready to import
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" onClick={handleImport} disabled={submitting}>
              {submitting ? 'Importing...' : `Import ${emails.split('\n').filter((e) => e.trim()).length} Emails`}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

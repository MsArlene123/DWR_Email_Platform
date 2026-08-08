'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2, ShieldAlert, ShieldCheck, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';

export default function BouncedEmailsPage() {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  const fetchEmails = useCallback(async () => {
    try {
      const res = await fetch('/api/bounced-emails');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmails(data.bouncedEmails || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const handleToggleBlacklist = async (id: string, currentStatus: boolean) => {
    setActionLoading(id);
    try {
      const res = await fetch('/api/bounced-emails', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isBlacklisted: !currentStatus }),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success(currentStatus ? 'Email removed from blacklist' : 'Email blacklisted');
      await fetchEmails();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this record? The email will be treated as valid again.')) return;
    setActionLoading(id);
    try {
      const res = await fetch('/api/bounced-emails', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Bounce record removed');
      await fetchEmails();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm(`Clear all ${emails.length} bounce records? All emails will be treated as valid again. Only do this if you have re-verified your contact lists.`)) return;
    setClearingAll(true);
    try {
      const res = await fetch('/api/bounced-emails', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAll: true }),
      });
      if (!res.ok) throw new Error('Failed to clear');
      const data = await res.json();
      toast.success(`Cleared ${data.deleted} bounce records`);
      await fetchEmails();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to clear');
    } finally {
      setClearingAll(false);
    }
  };

  const blacklisted = emails.filter((e) => e.isBlacklisted);
  const warnings = emails.filter((e) => !e.isBlacklisted);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Bad Emails</h1>
        <p className="mt-2 text-gray-600">
          Emails that bounced during campaigns or drip sequences. Blacklisted emails are automatically skipped in future sends.
        </p>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-orange-900">How It Works</h3>
            <p className="mt-1 text-sm text-orange-700">
              When an email bounces (address doesn&apos;t exist or is rejected), it&apos;s tracked here.
              After <strong>3 bounces</strong>, the email is automatically <strong>blacklisted</strong> and
              skipped in all future campaigns and drip sequences.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{emails.length}</div>
          <div className="text-xs text-gray-500">Total Bounced Emails</div>
        </div>
        <div className="bg-white rounded-lg shadow border border-red-200 p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{blacklisted.length}</div>
          <div className="text-xs text-gray-500">Blacklisted</div>
        </div>
        <div className="bg-white rounded-lg shadow border border-yellow-200 p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{warnings.length}</div>
          <div className="text-xs text-gray-500">Warnings (1-2 bounces)</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Bounce Records</h2>
          <div className="flex items-center gap-2">
            {emails.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={clearingAll}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                {clearingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Clear All ({emails.length})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={fetchEmails}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {emails.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-green-400" />
            <p className="mt-2 text-gray-500">No bounced emails. Your lists are clean!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bounces</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Bounce</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {emails.map((email: any) => (
                  <tr key={email.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {email.email}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        email.bounceCount >= 3
                          ? 'bg-red-100 text-red-700'
                          : email.bounceCount >= 2
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {email.bounceCount}x
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {email.isBlacklisted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <ShieldAlert className="h-3 w-3" />
                          Blacklisted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          <AlertTriangle className="h-3 w-3" />
                          Warning
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(email.lastBounceAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                      {email.reason || '-'}
                    </td>
                    <td className="px-6 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleBlacklist(email.id, email.isBlacklisted)}
                          disabled={actionLoading === email.id}
                          title={email.isBlacklisted ? 'Remove from blacklist' : 'Blacklist this email'}
                        >
                          {email.isBlacklisted ? (
                            <ShieldCheck className="h-4 w-4 text-green-600" />
                          ) : (
                            <ShieldAlert className="h-4 w-4 text-red-600" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(email.id)}
                          disabled={actionLoading === email.id}
                          title="Remove bounce record"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

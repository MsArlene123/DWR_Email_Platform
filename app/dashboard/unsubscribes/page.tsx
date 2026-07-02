'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, RefreshCw, Loader2, UserX, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';

export default function UnsubscribesPage() {
  const [unsubscribes, setUnsubscribes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUnsubscribes = useCallback(async () => {
    try {
      const res = await fetch('/api/contacts/unsubscribes');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUnsubscribes(data.unsubscribes || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnsubscribes();
  }, [fetchUnsubscribes]);

  const handleExportCsv = () => {
    if (unsubscribes.length === 0) return;
    const header = 'Email,Unsubscribed Date\n';
    const rows = unsubscribes
      .map((u) => `${u.email},${new Date(u.createdAt).toLocaleDateString()}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unsubscribes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported unsubscribe list');
  };

  const filtered = unsubscribes.filter((u) =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h1 className="text-3xl font-bold text-gray-900">Unsubscribe Management</h1>
        <p className="mt-2 text-gray-600">
          People who have opted out of receiving emails. These addresses are automatically skipped on all future sends.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{unsubscribes.length}</div>
          <div className="text-xs text-gray-500">Total Unsubscribed</div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {unsubscribes.filter((u) => {
              const d = new Date(u.createdAt);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length}
          </div>
          <div className="text-xs text-gray-500">This Month</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-4 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Unsubscribed Addresses</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {unsubscribes.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={fetchUnsubscribes}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <UserX className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-2 text-gray-500">
              {searchTerm ? 'No matching unsubscribes found.' : 'No unsubscribes yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unsubscribed Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((unsub: any) => (
                  <tr key={unsub.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{unsub.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(unsub.createdAt).toLocaleDateString()} at{' '}
                      {new Date(unsub.createdAt).toLocaleTimeString()}
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
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Loader2, Users, Upload, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  UNSUBSCRIBED: 'bg-gray-100 text-gray-600',
  BOUNCED: 'bg-yellow-100 text-yellow-700',
  BLACKLISTED: 'bg-red-100 text-red-700',
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [lists, setLists] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [listFilter, setListFilter] = useState('');

  // Import modal
  const [showImport, setShowImport] = useState(false);
  const [sheets, setSheets] = useState<any[]>([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [importListName, setImportListName] = useState('');
  const [importTags, setImportTags] = useState('');

  const fetchContacts = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '50' });
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter) params.set('status', statusFilter);
      if (listFilter) params.set('list', listFilter);

      const res = await fetch(`/api/contacts?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setContacts(data.contacts || []);
      setSummary(data.summary || {});
      setLists(data.lists || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, statusFilter, listFilter]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const fetchSheets = async () => {
    try {
      const res = await fetch('/api/sheets');
      const data = await res.json();
      setSheets(data.sheets || []);
    } catch {
      toast.error('Failed to load sheets');
    }
  };

  const handleImport = async () => {
    if (!selectedSheet) {
      toast.error('Select a Google Sheet');
      return;
    }
    setImporting(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetId: selectedSheet,
          listName: importListName || undefined,
          tags: importTags || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      setShowImport(false);
      setSelectedSheet('');
      setImportListName('');
      setImportTags('');
      await fetchContacts();
    } catch (err: any) {
      toast.error(err?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchContacts();
  };

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
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-full">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
            <p className="mt-2 text-gray-600">Your internal contacts database. Import from Google Sheets, track engagement, manage status.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowImport(true); fetchSheets(); }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import from Sheet
            </Button>
            <Button variant="outline" size="sm" onClick={fetchContacts}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{(summary.total || 0).toLocaleString()}</div>
          <div className="text-xs text-gray-500">Total Contacts</div>
        </div>
        <div className="bg-white rounded-lg shadow border border-green-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{(summary.active || 0).toLocaleString()}</div>
          <div className="text-xs text-gray-500">Active</div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-500">{summary.unsubscribed || 0}</div>
          <div className="text-xs text-gray-500">Unsubscribed</div>
        </div>
        <div className="bg-white rounded-lg shadow border border-yellow-200 p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{summary.bounced || 0}</div>
          <div className="text-xs text-gray-500">Bounced</div>
        </div>
        <div className="bg-white rounded-lg shadow border border-red-200 p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{summary.blacklisted || 0}</div>
          <div className="text-xs text-gray-500">Blacklisted</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email, name, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </form>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="UNSUBSCRIBED">Unsubscribed</option>
            <option value="BOUNCED">Bounced</option>
            <option value="BLACKLISTED">Blacklisted</option>
          </select>
          <select
            value={listFilter}
            onChange={(e) => { setListFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Lists</option>
            {lists.map((list) => (
              <option key={list} value={list}>{list}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-600">{total.toLocaleString()} contacts found</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {contacts.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-2 text-gray-500">
              {searchTerm || statusFilter || listFilter
                ? 'No contacts match your filters.'
                : 'No contacts imported yet. Click "Import from Sheet" to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">List</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sent</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Opens</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Clicks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contacts.map((contact: any) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-sm font-medium text-gray-900">{contact.email}</td>
                    <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {[contact.firstName, contact.lastName].filter(Boolean).join(' ') || '-'}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500 truncate max-w-[180px]">
                      {contact.companyName || '-'}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[contact.status] || 'bg-gray-100 text-gray-700'}`}>
                        {contact.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500 truncate max-w-[150px]">
                      {contact.listName || '-'}
                    </td>
                    <td className="px-3 py-3 text-sm text-center text-gray-600">{contact.totalEmailsSent}</td>
                    <td className="px-3 py-3 text-sm text-center text-gray-600">{contact.totalOpens}</td>
                    <td className="px-3 py-3 text-sm text-center text-gray-600">{contact.totalClicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Contacts from Google Sheet</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Google Sheet</label>
                <select
                  value={selectedSheet}
                  onChange={(e) => setSelectedSheet(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a sheet...</option>
                  {sheets.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.recipientCount} contacts)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">List Name (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., WomenShield-Legal-Resource"
                  value={importListName}
                  onChange={(e) => setImportListName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-400">If blank, uses the sheet name as the list name.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., WomenShield,Segment-B,Partner"
                  value={importTags}
                  onChange={(e) => setImportTags(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-400">Comma-separated tags for segmentation.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="outline" size="sm" onClick={() => setShowImport(false)} disabled={importing}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleImport} disabled={importing || !selectedSheet}>
                {importing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" /> Import Contacts</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
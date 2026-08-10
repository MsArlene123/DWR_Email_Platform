'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2, RefreshCw, Loader2, ExternalLink, UserPlus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import toast from 'react-hot-toast';

export default function SheetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  // Bulk paste format: one contact per line, comma-separated
  const [bulkText, setBulkText] = useState('');

  // Single contact form
  const [single, setSingle] = useState({ email: '', firstName: '', lastName: '', companyName: '', title: '', phone: '' });

  useEffect(() => {
    fetchSheet();
  }, [id]);

  const fetchSheet = async () => {
    try {
      const res = await fetch(`/api/sheets/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/sheets/${id}`, { method: 'PATCH' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Sheet refreshed');
      await fetchSheet();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this sheet? Active campaigns using this sheet will also be affected.')) return;
    try {
      const res = await fetch(`/api/sheets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Sheet removed');
      router.push('/dashboard/sheets');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddSingle = async () => {
    if (!single.email.trim()) {
      toast.error('Email is required');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/contacts/bulk-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId: id, contacts: [single] }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`Added ${json.created} contact to ${json.listName}`);
        setSingle({ email: '', firstName: '', lastName: '', companyName: '', title: '', phone: '' });
        setAddOpen(false);
        fetchSheet();
      } else {
        toast.error(json.error || 'Failed to add contact');
      }
    } catch {
      toast.error('Network error');
    }
    setAdding(false);
  };

  const handleAddBulk = async () => {
    const lines = bulkText.trim().split('\n').filter((l) => l.trim());
    if (lines.length === 0) {
      toast.error('Paste at least one contact');
      return;
    }
    const contacts = lines.map((line) => {
      const parts = line.split(',').map((p) => p.trim());
      return {
        email: parts[0] || '',
        firstName: parts[1] || '',
        lastName: parts[2] || '',
        companyName: parts[3] || '',
        title: parts[4] || '',
        phone: parts[5] || '',
      };
    }).filter((c) => c.email && c.email.includes('@'));

    if (contacts.length === 0) {
      toast.error('No valid emails found. Format: email,firstName,lastName,companyName');
      return;
    }

    setAdding(true);
    try {
      const res = await fetch('/api/contacts/bulk-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId: id, contacts }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`Added ${json.created} contacts (${json.skipped} duplicates skipped)`);
        setBulkText('');
        setAddOpen(false);
        fetchSheet();
      } else {
        toast.error(json.error || 'Failed to add contacts');
      }
    } catch {
      toast.error('Network error');
    }
    setAdding(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data?.sheet) {
    return <div className="p-8">Sheet not found</div>;
  }

  const { sheet, preview } = data;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard/sheets"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Google Sheets
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{sheet.name}</h1>
            <a
              href={sheet.sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center mt-2 text-sm text-blue-600 hover:underline"
            >
              Open in Google Sheets <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setAddOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Contacts
            </Button>
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
            <Button variant="outline" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="text-sm text-gray-500">Total Recipients</div>
          <div className="text-3xl font-bold mt-1">{preview?.totalRows || sheet.recipientCount || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="text-sm text-gray-500">Email Column</div>
          <div className="text-lg font-semibold mt-1 truncate">
            {preview?.emailColumn || '-'}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="text-sm text-gray-500">Total Columns</div>
          <div className="text-3xl font-bold mt-1">{preview?.columns?.length || 0}</div>
        </div>
      </div>

      {preview?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{preview.error}</p>
        </div>
      )}

      {preview?.columns?.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold">Sheet Preview (first 10 rows)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {preview.columns.map((col: string) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {preview.sampleRows?.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    {preview.columns.map((col: string) => (
                      <td
                        key={col}
                        className="px-3 py-2 whitespace-nowrap text-gray-900 max-w-xs truncate"
                        title={row[col]}
                      >
                        {row[col] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Personalization Tags Available</h3>
        <div className="flex flex-wrap gap-2">
          {preview?.columns?.map((col: string) => {
            const tag = col.replace(/\s+/g, '_').replace(/[^A-Z0-9_]/gi, '').toUpperCase();
            return (
              <code
                key={col}
                className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-sm"
              >{`{{${tag}}}`}</code>
            );
          })}
        </div>
      </div>

      {/* Add Contacts Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Add Contacts to {sheet.name}
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="bulk">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bulk">Bulk Paste</TabsTrigger>
              <TabsTrigger value="single">Single Contact</TabsTrigger>
            </TabsList>

            {/* Bulk paste tab */}
            <TabsContent value="bulk" className="space-y-4 mt-4">
              <div>
                <Label>Paste contacts (one per line)</Label>
                <p className="text-xs text-gray-500 mt-1 mb-2">
                  Format: <code className="bg-gray-100 px-1 rounded">email,firstName,lastName,companyName,title,phone</code>
                  <br />Only email is required. Leave blank fields but keep commas.
                </p>
                <Textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                  placeholder={'john@smithlaw.com,John,Smith,Smith Law,Partner,202-555-0100\njane@doefirm.com,Jane,Doe,Doe Legal Group,Associate,\nbob@jones.com,Bob,Jones,Jones & Co,,'}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {bulkText.trim().split('\n').filter((l) => l.trim() && l.includes('@')).length} valid contacts ready to add
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={handleAddBulk} disabled={adding}>
                  {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {adding ? 'Adding...' : `Add ${bulkText.trim().split('\n').filter((l) => l.trim() && l.includes('@')).length} Contacts`}
                </Button>
              </div>
            </TabsContent>

            {/* Single contact tab */}
            <TabsContent value="single" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="s-email">Email *</Label>
                  <Input
                    id="s-email"
                    type="email"
                    value={single.email}
                    onChange={(e) => setSingle({ ...single, email: e.target.value })}
                    className="mt-1"
                    placeholder="john@smithlaw.com"
                  />
                </div>
                <div>
                  <Label htmlFor="s-company">Company</Label>
                  <Input
                    id="s-company"
                    value={single.companyName}
                    onChange={(e) => setSingle({ ...single, companyName: e.target.value })}
                    className="mt-1"
                    placeholder="Smith Law Firm"
                  />
                </div>
                <div>
                  <Label htmlFor="s-first">First Name</Label>
                  <Input
                    id="s-first"
                    value={single.firstName}
                    onChange={(e) => setSingle({ ...single, firstName: e.target.value })}
                    className="mt-1"
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="s-last">Last Name</Label>
                  <Input
                    id="s-last"
                    value={single.lastName}
                    onChange={(e) => setSingle({ ...single, lastName: e.target.value })}
                    className="mt-1"
                    placeholder="Smith"
                  />
                </div>
                <div>
                  <Label htmlFor="s-title">Title</Label>
                  <Input
                    id="s-title"
                    value={single.title}
                    onChange={(e) => setSingle({ ...single, title: e.target.value })}
                    className="mt-1"
                    placeholder="Partner"
                  />
                </div>
                <div>
                  <Label htmlFor="s-phone">Phone</Label>
                  <Input
                    id="s-phone"
                    value={single.phone}
                    onChange={(e) => setSingle({ ...single, phone: e.target.value })}
                    className="mt-1"
                    placeholder="202-555-0100"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={handleAddSingle} disabled={adding || !single.email.trim()}>
                  {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  {adding ? 'Adding...' : 'Add Contact'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2, RefreshCw, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export default function SheetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
          <div className="text-3xl font-bold mt-1">{preview?.totalRows || 0}</div>
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
    </div>
  );
}

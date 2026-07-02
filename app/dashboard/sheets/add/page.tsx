'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Info, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export default function AddSheetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    sheetUrl: '',
  });

  const handlePreview = async () => {
    if (!formData.sheetUrl) {
      toast.error('Please enter a Google Sheets URL');
      return;
    }
    setPreviewing(true);
    setPreview(null);
    try {
      const res = await fetch('/api/sheets/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: formData.sheetUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreview(data);
      toast.success(`Found ${data.totalRows} recipients`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPreviewing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Sheet added successfully!');
      router.push('/dashboard/sheets');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard/sheets"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Google Sheets
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Add Google Sheet</h1>
        <p className="mt-2 text-gray-600">
          Connect a Google Sheet with your recipient list
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-semibold text-blue-900">
              Share your sheet publicly (view-only)
            </h3>
            <p className="mt-1 text-sm text-blue-800">
              Before adding, click <strong>Share</strong> in your Google Sheet and set access to{' '}
              <strong>"Anyone with the link"</strong> with <strong>Viewer</strong> permission.
              Your data stays private - it's only readable by anyone who has the exact URL.
            </p>
            <p className="mt-2 text-sm text-blue-800">
              Your sheet should contain columns like:{' '}
              <code className="bg-blue-100 px-1">FIRST_NAME</code>,{' '}
              <code className="bg-blue-100 px-1">LAST_NAME</code>,{' '}
              <code className="bg-blue-100 px-1">EMAIL_ADDRESS</code>,{' '}
              <code className="bg-blue-100 px-1">COMPANY_NAME</code>, etc.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            List Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Nonprofit List, Attorney List"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Google Sheets URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            required
            value={formData.sheetUrl}
            onChange={(e) => setFormData({ ...formData, sheetUrl: e.target.value })}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={previewing || !formData.sheetUrl}
          >
            {previewing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>
        </div>

        {preview && (
          <div className="border border-green-200 bg-green-50 rounded-lg p-4 mt-4">
            <div className="flex items-center mb-3">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="font-semibold text-green-900">Connection successful!</h3>
            </div>
            <div className="text-sm text-green-800 space-y-1">
              <div>
                <strong>{preview.totalRows}</strong> recipients found
              </div>
              <div>
                Email column: <code className="bg-green-100 px-1">{preview.emailColumn}</code>
              </div>
              <div>
                Columns: {preview.columns.slice(0, 8).join(', ')}
                {preview.columns.length > 8 ? '...' : ''}
              </div>
            </div>
            {preview.sampleRows?.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="text-xs border-collapse">
                  <thead>
                    <tr>
                      {preview.columns.slice(0, 5).map((col: string) => (
                        <th
                          key={col}
                          className="border border-green-300 px-2 py-1 bg-green-100 text-left"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sampleRows.slice(0, 3).map((row: any, idx: number) => (
                      <tr key={idx}>
                        {preview.columns.slice(0, 5).map((col: string) => (
                          <td
                            key={col}
                            className="border border-green-300 px-2 py-1"
                          >
                            {row[col]?.substring(0, 30) || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Sheet'
            )}
          </Button>
          <Link href="/dashboard/sheets">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

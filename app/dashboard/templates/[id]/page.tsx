'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Copy, Edit, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const categoryLabels: Record<string, string> = {
  NONPROFIT: 'Nonprofit Outreach',
  ATTORNEY_LEGAL: 'Attorney/Legal Marketing',
  BOOKSTORE_MEDIA: 'Bookstore/Media',
  GENERAL_BUSINESS: 'General Business',
  CUSTOM: 'Custom',
};

const PREVIEW_CONTEXT: Record<string, string> = {
  FIRST_NAME: 'Jane',
  LAST_NAME: 'Doe',
  EMAIL_ADDRESS: 'jane.doe@example.org',
  TITLE: 'Executive Director',
  COMPANY_NAME: 'Example Foundation',
  WEBSITE: 'https://example.org',
  PHONE_NUMBERS: '(555) 123-4567',
};

function renderPreview(template: string): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([A-Za-z0-9_\s]+)\s*\}\}/g, (_, varName) => {
    const key = varName.trim().replace(/\s+/g, '_').toUpperCase();
    return PREVIEW_CONTEXT[key] ?? `{{${varName}}}`;
  });
}

export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'preview' | 'html'>('preview');

  useEffect(() => {
    fetch(`/api/templates/${id}`)
      .then((r) => r.json())
      .then((data) => setTemplate(data.template))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Delete this template?')) return;
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Template deleted');
      router.push('/dashboard/templates');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDuplicate = async () => {
    try {
      const res = await fetch(`/api/templates/${id}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Template duplicated');
      router.push(`/dashboard/templates/${data.template.id}`);
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

  if (!template) {
    return <div className="p-8">Template not found</div>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard/templates"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Templates
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{template.name}</h1>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {categoryLabels[template.category] || template.category}
              </span>
              {template.isSample && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Sample
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/dashboard/templates/${id}/edit`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                {template.isSample ? 'Customize' : 'Edit'}
              </Button>
            </Link>
            <Button variant="outline" onClick={handleDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>
            {!template.isSample && (
              <Button variant="outline" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase">Subject</h2>
        <p className="mt-2 text-gray-900 font-medium">{template.subject}</p>
        <p className="mt-1 text-sm text-gray-500">
          Preview: {renderPreview(template.subject)}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 flex">
          <button
            onClick={() => setView('preview')}
            className={`px-4 py-3 text-sm font-medium ${
              view === 'preview'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setView('html')}
            className={`px-4 py-3 text-sm font-medium ${
              view === 'html'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            HTML Source
          </button>
        </div>
        <div className="p-6">
          {view === 'preview' ? (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{
                __html: renderPreview(template.htmlContent),
              }}
            />
          ) : (
            <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap bg-gray-50 p-4 rounded border">
              {template.htmlContent}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

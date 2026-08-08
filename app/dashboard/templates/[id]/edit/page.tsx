'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { TemplateEditor, TemplateFormData } from '@/components/template-editor';
import toast from 'react-hot-toast';

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [initial, setInitial] = useState<Partial<TemplateFormData> | undefined>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSample, setIsSample] = useState(false);

  useEffect(() => {
    fetch(`/api/templates/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.template) {
          setInitial({
            name: data.template.name,
            category: data.template.category,
            subject: data.template.subject,
            htmlContent: data.template.htmlContent,
            plainText: data.template.plainText || '',
          });
          setIsSample(data.template.isSample);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (data: TemplateFormData) => {
    setSubmitting(true);
    try {
      // If editing a sample, create a new custom template instead of overwriting
      if (isSample) {
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        toast.success('Saved as new custom template');
        router.push(`/dashboard/templates/${json.template.id}`);
      } else {
        const res = await fetch(`/api/templates/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        toast.success('Template updated!');
        router.push(`/dashboard/templates/${id}`);
      }
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <Link
          href={`/dashboard/templates/${id}`}
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Template
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Edit Template</h1>
        {isSample && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
            <strong>Sample template:</strong> saving will create a new custom copy (your edits won't overwrite the original sample).
          </div>
        )}
      </div>

      <TemplateEditor
        initial={initial}
        onSave={handleSave}
        submitting={submitting}
        saveLabel="Save Changes"
      />
    </div>
  );
}

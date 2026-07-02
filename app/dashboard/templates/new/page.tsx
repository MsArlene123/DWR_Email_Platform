'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TemplateEditor, TemplateFormData } from '@/components/template-editor';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

export default function NewTemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams?.get('duplicate');
  const [initial, setInitial] = useState<Partial<TemplateFormData> | undefined>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (duplicateId) {
      fetch(`/api/templates/${duplicateId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.template) {
            setInitial({
              name: `${data.template.name} (Copy)`,
              category: data.template.category,
              subject: data.template.subject,
              htmlContent: data.template.htmlContent,
              plainText: data.template.plainText || '',
            });
          }
        });
    }
  }, [duplicateId]);

  const handleSave = async (data: TemplateFormData) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Template created!');
      router.push(`/dashboard/templates/${json.template.id}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
      setSubmitting(false);
    }
  };

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
        <h1 className="text-3xl font-bold text-gray-900">
          {duplicateId ? 'Duplicate Template' : 'Create Template'}
        </h1>
        <p className="mt-2 text-gray-600">
          Build a reusable email template with personalization tags
        </p>
      </div>

      <TemplateEditor
        initial={initial}
        onSave={handleSave}
        submitting={submitting}
        saveLabel="Create Template"
      />
    </div>
  );
}

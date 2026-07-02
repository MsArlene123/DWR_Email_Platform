'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Plus, Trash2, Workflow } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';

type Step = {
  templateId: string;
  subject: string;
  delayDays: number;
  delayHours: number;
};

export default function NewDripSequencePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [templates, setTemplates] = useState<any[]>([]);
  const [sheets, setSheets] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emailAccountId, setEmailAccountId] = useState('');
  const [googleSheetId, setGoogleSheetId] = useState('');
  const [sendingIntervalMinutes, setSendingIntervalMinutes] = useState(5);
  const [steps, setSteps] = useState<Step[]>([
    { templateId: '', subject: '', delayDays: 0, delayHours: 0 },
  ]);

  useEffect(() => {
    async function load() {
      try {
        const [tmpRes, shRes, accRes] = await Promise.all([
          fetch('/api/templates'),
          fetch('/api/sheets'),
          fetch('/api/accounts'),
        ]);
        const [tmpData, shData, accData] = await Promise.all([
          tmpRes.json(),
          shRes.json(),
          accRes.json(),
        ]);
        setTemplates(tmpData.templates || []);
        setSheets(shData.sheets || []);
        setAccounts((accData.accounts || []).filter((a: any) => a.isActive));
      } catch (err) {
        toast.error('Failed to load options');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { templateId: '', subject: '', delayDays: prev.length * 3, delayHours: 0 },
    ]);
  };

  const removeStep = (idx: number) => {
    if (steps.length === 1) {
      toast.error('A sequence must have at least 1 step');
      return;
    }
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateStep = (idx: number, patch: Partial<Step>) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    );
  };

  const onTemplateSelected = (idx: number, templateId: string) => {
    const t = templates.find((x) => x.id === templateId);
    const patch: Partial<Step> = { templateId };
    // Auto-fill subject if not set
    if (t && !steps[idx].subject) {
      patch.subject = t.subject || '';
    }
    updateStep(idx, patch);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) {
      toast.error('Please name your sequence');
      return;
    }
    if (!emailAccountId) {
      toast.error('Please select an email account to send from');
      return;
    }
    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].templateId || !steps[i].subject) {
        toast.error(`Step ${i + 1}: template and subject are required`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/drip-sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          emailAccountId: emailAccountId || null,
          googleSheetId: googleSheetId || null,
          sendingIntervalMinutes,
          steps,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create sequence');
      toast.success('Drip sequence created');
      router.push(`/dashboard/drip-sequences/${data.sequence.id}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create sequence');
    } finally {
      setSubmitting(false);
    }
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
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
      <div className="mb-8">
        <Link
          href="/dashboard/drip-sequences"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Drip Sequences
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">
          Create New Drip Sequence
        </h1>
        <p className="mt-2 text-gray-600">
          Build an automated email sequence with custom delays between messages
        </p>
      </div>

      {templates.length === 0 && (
        <div className="mb-6 rounded-md bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm text-yellow-800">
            You need at least one email template to create a sequence.{' '}
            <Link
              href="/dashboard/templates"
              className="font-medium underline"
            >
              Create a template
            </Link>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sequence Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Nonprofit Welcome Series"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What is this sequence for?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Send From (Email Account) *
            </label>
            <select
              value={emailAccountId}
              onChange={(e) => setEmailAccountId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select email account...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.email} {a.displayName ? `(${a.displayName})` : ''} — {a.type === 'GMAIL' ? 'Gmail' : a.type === 'ZOHO_SMTP' ? 'Zoho' : 'Titan'}
                </option>
              ))}
            </select>
            {accounts.length === 0 && (
              <p className="mt-1 text-xs text-red-600">
                No active email accounts found.{' '}
                <Link href="/dashboard/accounts/connect" className="font-medium underline">
                  Connect an account
                </Link>
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              All emails in this drip sequence will be sent from this account.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipient List (optional)
            </label>
            <select
              value={googleSheetId}
              onChange={(e) => setGoogleSheetId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">None (enroll manually later)</option>
              {sheets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.recipientCount || 0} contacts)
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Choose a sheet now or select one when you enroll recipients.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sending Speed (minutes between emails)
            </label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 5, 10, 15, 30, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setSendingIntervalMinutes(mins)}
                  className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                    sendingIntervalMinutes === mins
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {mins < 60 ? `${mins} min` : '1 hour'}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              How long to wait between sending each email. Slower = better deliverability.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Sequence Steps ({steps.length})
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addStep}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Step
            </Button>
          </div>

          <div className="space-y-4">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg shadow border border-gray-200 p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 rounded-full h-8 w-8 flex items-center justify-center">
                      <span className="text-sm font-bold text-purple-700">
                        {idx + 1}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Step {idx + 1}
                    </h3>
                  </div>
                  {steps.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeStep(idx)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Template *
                    </label>
                    <select
                      value={step.templateId}
                      onChange={(e) =>
                        onTemplateSelected(idx, e.target.value)
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select template...</option>
                      <optgroup label="My Templates">
                        {templates.filter((t: any) => !t.isSample).map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Sample Templates">
                        {templates.filter((t: any) => t.isSample).map((t: any) => (
                          <option key={t.id} value={t.id}>
                            [{t.category.replace('_', ' ')}] {t.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Subject *
                    </label>
                    <input
                      type="text"
                      value={step.subject}
                      onChange={(e) =>
                        updateStep(idx, { subject: e.target.value })
                      }
                      required
                      placeholder="Email subject for this step"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {idx === 0
                        ? 'Send delay (from enrollment)'
                        : `Delay after step ${idx}`}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={step.delayDays}
                        onChange={(e) =>
                          updateStep(idx, {
                            delayDays: Number(e.target.value),
                          })
                        }
                        min={0}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">days</span>
                      <input
                        type="number"
                        value={step.delayHours}
                        onChange={(e) =>
                          updateStep(idx, {
                            delayHours: Number(e.target.value),
                          })
                        }
                        min={0}
                        max={23}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">hours</span>
                    </div>
                    {idx === 0 && (
                      <p className="mt-1 text-xs text-gray-500">
                        Set to 0/0 to send the first email immediately on enrollment.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href="/dashboard/drip-sequences">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={submitting || templates.length === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Workflow className="mr-2 h-4 w-4" />
                Create Sequence
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

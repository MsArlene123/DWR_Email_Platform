'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';

export default function NewCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [accounts, setAccounts] = useState<any[]>([]);
  const [sheets, setSheets] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  const [name, setName] = useState('');
  const [emailAccountId, setEmailAccountId] = useState('');
  const [googleSheetId, setGoogleSheetId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [sendingRate, setSendingRate] = useState(3);
  const [scheduledStart, setScheduledStart] = useState('');
  const [startNow, setStartNow] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [accRes, shRes, tmpRes] = await Promise.all([
          fetch('/api/accounts'),
          fetch('/api/sheets'),
          fetch('/api/templates'),
        ]);
        const [accData, shData, tmpData] = await Promise.all([
          accRes.json(),
          shRes.json(),
          tmpRes.json(),
        ]);
        setAccounts(accData.accounts || []);
        setSheets(shData.sheets || []);
        setTemplates(tmpData.templates || []);

        // Prefill from query params (e.g. ?templateId=xxx)
        const preTpl = searchParams?.get('templateId');
        if (preTpl) setTemplateId(preTpl);
      } catch (err) {
        toast.error('Failed to load options');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [searchParams]);

  // Auto-fill subject from template
  useEffect(() => {
    if (templateId) {
      const t = templates.find((x) => x.id === templateId);
      if (t && !subject) setSubject(t.subject || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, templates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !emailAccountId || !googleSheetId || !templateId || !subject) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (accounts.length === 0) {
      toast.error('No email accounts connected');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          emailAccountId,
          googleSheetId,
          templateId,
          subject,
          sendingRate,
          scheduledStart: scheduledStart || null,
          startNow,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create campaign');
      }
      toast.success(
        startNow
          ? 'Campaign created and started!'
          : 'Campaign created'
      );
      router.push(`/dashboard/campaigns/${data.campaign.id}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create campaign');
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

  const hasAllPrereqs =
    accounts.length > 0 && sheets.length > 0 && templates.length > 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
      <div className="mb-8">
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create New Campaign</h1>
        <p className="mt-2 text-gray-600">
          Configure an email marketing campaign
        </p>
      </div>

      {!hasAllPrereqs && (
        <div className="mb-6 rounded-md bg-yellow-50 border border-yellow-200 p-4">
          <h3 className="text-sm font-medium text-yellow-900 mb-2">
            Setup required before creating a campaign:
          </h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            {accounts.length === 0 && (
              <li>
                •{' '}
                <Link
                  href="/dashboard/accounts/connect"
                  className="underline"
                >
                  Connect an email account
                </Link>
              </li>
            )}
            {sheets.length === 0 && (
              <li>
                •{' '}
                <Link href="/dashboard/sheets/add" className="underline">
                  Add a Google Sheet with recipients
                </Link>
              </li>
            )}
            {templates.length === 0 && (
              <li>
                •{' '}
                <Link href="/dashboard/templates" className="underline">
                  Create or select an email template
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-6"
      >
        {/* Campaign Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Campaign Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Spring Newsletter 2026"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Email Account */}
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
                {a.email} ({a.provider === 'GMAIL' ? 'Gmail' : 'Titan SMTP'}) — {a.emailsSentToday}/{a.dailyLimit} today
              </option>
            ))}
          </select>
        </div>

        {/* Google Sheet */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recipient List (Google Sheet) *
          </label>
          <select
            value={googleSheetId}
            onChange={(e) => setGoogleSheetId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Select recipient list...</option>
            {sheets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.recipientCount || 0} contacts)
              </option>
            ))}
          </select>
        </div>

        {/* Template */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Template *
          </label>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
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

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Subject *
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            placeholder="e.g. Important Update from {{COMPANY_NAME}}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            You can use personalization tags like {'{{FIRST_NAME}}'}, {'{{COMPANY_NAME}}'}, etc.
          </p>
        </div>

        {/* Sending Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sending Rate (minutes between each email) *
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={sendingRate}
              onChange={(e) => setSendingRate(Number(e.target.value))}
              min={1}
              max={60}
              required
              className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              minutes between each email
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Default: 3 minutes. Lower values send faster but may trigger spam filters.
          </p>
        </div>

        {/* Schedule */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Launch Options
          </h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={startNow}
                onChange={(e) => {
                  setStartNow(e.target.checked);
                  if (e.target.checked) setScheduledStart('');
                }}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Start sending immediately after creation
              </span>
            </label>

            {!startNow && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule Start (optional)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty to save as draft. You can start it later from the campaign detail page.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <Link href="/dashboard/campaigns">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={submitting || !hasAllPrereqs}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {startNow ? 'Create & Start' : 'Create Campaign'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

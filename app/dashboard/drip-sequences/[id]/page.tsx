'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  Users,
  Mail,
  CheckCircle2,
  Clock,
  Loader2,
  Workflow,
  UserPlus,
  Send,
  AlertCircle,
  Zap,
  Timer,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';

export default function DripSequenceDetailPage() {
  const params = useParams() as { id: string };
  const router = useRouter();
  const [sequence, setSequence] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [sheets, setSheets] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<any>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [progressPage, setProgressPage] = useState(0);
  const PROGRESS_PAGE_SIZE = 50;
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSequence = useCallback(async () => {
    try {
      const res = await fetch(`/api/drip-sequences/${params.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSequence(data.sequence);
      setSelectedSheetId(data.sequence.googleSheetId || '');
      setSelectedAccountId(data.sequence.emailAccountId || '');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load sequence');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchSequence();
    fetch('/api/sheets')
      .then((r) => r.json())
      .then((d) => setSheets(d.sheets || []))
      .catch(() => {});
    fetch('/api/accounts')
      .then((r) => r.json())
      .then((d) => setAccounts((d.accounts || []).filter((a: any) => a.isActive)))
      .catch(() => {});
  }, [fetchSequence]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    let pollCount = 0;
    pollRef.current = setInterval(async () => {
      pollCount++;
      await fetchSequence();
      if (pollCount >= 12) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 5000);
  };

  const handleToggleActive = async () => {
    if (!sequence) return;

    // Validate before activating
    if (!sequence.isActive) {
      if (!sequence.googleSheetId) {
        toast.error('Please assign a recipient list first');
        return;
      }
      if (!sequence.emailAccountId && accounts.length === 0) {
        toast.error('Please connect an email account first');
        return;
      }
      if (sequence.steps?.length === 0) {
        toast.error('Please add at least one step to the sequence');
        return;
      }
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/drip-sequences/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !sequence.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error('Failed to update');

      if (!sequence.isActive) {
        // Just activated
        if (data.enrollResult?.enrolled > 0) {
          toast.success(
            `Activated! Enrolled ${data.enrollResult.enrolled} recipients. Sending will begin shortly.`
          );
        } else if (data.enrollResult?.enrolled === 0) {
          toast.success('Activated! All recipients already enrolled. Processing will begin shortly.');
        } else if (data.enrollResult?.error) {
          toast.error(`Activated but enrollment issue: ${data.enrollResult.error}`);
        } else {
          toast.success('Sequence activated! Processing will begin shortly.');
        }
        startPolling();
      } else {
        toast.success('Sequence paused');
      }
      await fetchSequence();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!sequence?.googleSheetId) {
      toast.error('Please assign a recipient list first');
      return;
    }
    setEnrolling(true);
    try {
      const res = await fetch(`/api/drip-sequences/${params.id}/enroll`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to enroll');
      if (data.enrolled > 0) {
        toast.success(
          `Enrolled ${data.enrolled} recipient${data.enrolled > 1 ? 's' : ''}! ${sequence.isActive ? 'Processing started.' : 'Activate the sequence to start sending.'}`
        );
        startPolling();
      } else {
        toast(data.message || 'No new recipients to enroll');
      }
      await fetchSequence();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  };

  const handleProcessNow = async () => {
    setProcessing(true);
    setProcessResult(null);
    let totalSent = 0;
    let totalFailed = 0;
    let totalProcessed = 0;
    let keepGoing = true;
    let rounds = 0;
    const maxRounds = 20; // safety limit

    while (keepGoing && rounds < maxRounds) {
      rounds++;
      try {
        const res = await fetch('/api/drip-sequences/process', {
          method: 'POST',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Processing failed');

        totalSent += data.sent || 0;
        totalFailed += data.failed || 0;
        totalProcessed += data.processed || 0;

        // Update result display after each round
        setProcessResult({ sent: totalSent, failed: totalFailed, processed: totalProcessed, details: data.details, round: rounds });

        // If we sent emails this round, fetch updated data and try again
        if (data.sent > 0) {
          toast.success(`Round ${rounds}: Sent ${data.sent} emails (${totalSent} total)`);
          await fetchSequence();
          // Continue to next round
        } else {
          // Nothing left to send
          keepGoing = false;
        }
      } catch (err: any) {
        toast.error(err?.message || 'Processing failed');
        keepGoing = false;
      }
    }

    if (totalSent > 0) {
      toast.success(`Done! Sent ${totalSent} email${totalSent !== 1 ? 's' : ''} total.`);
    } else if (totalProcessed === 0) {
      toast('No emails due for sending right now');
    }

    await fetchSequence();
    setProcessing(false);
  };

  const handleSaveSheet = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/drip-sequences/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleSheetId: selectedSheetId || null }),
      });
      if (!res.ok) throw new Error('Failed to update sheet');
      toast.success('Recipient list updated');
      await fetchSequence();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveInterval = async (minutes: number) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/drip-sequences/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendingIntervalMinutes: minutes }),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success(`Sending interval updated to ${minutes} minutes`);
      await fetchSequence();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this sequence? All progress will be lost.')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/drip-sequences/${params.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Sequence deleted');
      router.push('/dashboard/drip-sequences');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete');
      setActionLoading(false);
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

  if (!sequence) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-500">Sequence not found</p>
        <Link
          href="/dashboard/drip-sequences"
          className="mt-4 inline-block text-blue-600 hover:underline"
        >
          Back to Drip Sequences
        </Link>
      </div>
    );
  }

  const totalEnrolled = sequence.progress?.length || 0;
  const totalCompleted = sequence.progress?.filter((p: any) => p.completed).length || 0;
  const totalInProgress = totalEnrolled - totalCompleted;
  const totalDue = sequence.progress?.filter(
    (p: any) => !p.completed && p.nextEmailDue && new Date(p.nextEmailDue) <= new Date()
  ).length || 0;

  // Readiness checks
  const hasSheet = !!sequence.googleSheetId;
  const hasAccount = !!sequence.emailAccountId || accounts.length > 0;
  const hasSteps = sequence.steps?.length > 0;
  const isReady = hasSheet && hasAccount && hasSteps;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/drip-sequences"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Drip Sequences
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">
                {sequence.name}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  sequence.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {sequence.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {sequence.description && (
              <p className="mt-2 text-gray-600">{sequence.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {sequence.isActive && (
              <Button
                onClick={handleProcessNow}
                disabled={processing}
                variant="default"
                className="bg-teal-600 hover:bg-teal-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Send Now
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={handleToggleActive}
              disabled={actionLoading || (!sequence.isActive && !isReady)}
              variant={sequence.isActive ? 'outline' : 'default'}
              title={!isReady && !sequence.isActive ? 'Complete setup first' : ''}
            >
              {actionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : sequence.isActive ? (
                <Pause className="mr-2 h-4 w-4" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {sequence.isActive ? 'Pause' : 'Activate & Start Sending'}
            </Button>
            <Button
              onClick={handleDelete}
              variant="outline"
              disabled={actionLoading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Readiness Checklist (only show when not active) */}
      {!sequence.isActive && (
        <div className="mb-6 bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Setup Checklist</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {hasSteps ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              <span className={hasSteps ? 'text-gray-700' : 'text-red-600 font-medium'}>
                {hasSteps ? `${sequence.steps.length} step${sequence.steps.length > 1 ? 's' : ''} configured` : 'No steps configured'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {hasSheet ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              <span className={hasSheet ? 'text-gray-700' : 'text-red-600 font-medium'}>
                {hasSheet ? 'Recipient list assigned' : 'No recipient list assigned'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {sequence.emailAccountId ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              <span className={sequence.emailAccountId ? 'text-gray-700' : 'text-red-600 font-medium'}>
                {sequence.emailAccountId
                  ? `Sending from: ${sequence.emailAccount?.email || 'assigned account'}`
                  : 'No email account assigned'}
              </span>
            </div>
          </div>
          {isReady && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">
                <CheckCircle2 className="inline h-4 w-4 mr-1" />
                Ready to go! Click <strong>&ldquo;Activate & Start Sending&rdquo;</strong> to begin.
                Recipients will be enrolled automatically from your sheet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Process Result Banner */}
      {processResult && (
        <div className={`mb-6 rounded-lg border p-4 ${
          processResult.sent > 0
            ? 'bg-green-50 border-green-200'
            : processResult.failed > 0
            ? 'bg-red-50 border-red-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            {processResult.sent > 0 ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            ) : processResult.failed > 0 ? (
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            ) : (
              <Mail className="h-5 w-5 text-blue-600 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">
                {processResult.sent > 0
                  ? `Sent ${processResult.sent} email${processResult.sent !== 1 ? 's' : ''}`
                  : processResult.processed > 0
                  ? `Processed ${processResult.processed} — ${processResult.failed} failed`
                  : 'No emails were due for sending'}
                {processResult.pendingCount > 0 && (
                  <span className="text-gray-500"> — {processResult.pendingCount} more scheduled</span>
                )}
              </p>
              {processResult.details?.length > 0 && (
                <p className="text-xs mt-1 opacity-75">
                  {processResult.details.map((d: any) => d.reason || d.note || d.error).filter(Boolean).join('; ')}
                </p>
              )}
            </div>
            <button
              onClick={() => setProcessResult(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center">
            <Workflow className="h-5 w-5 text-purple-600" />
            <div className="ml-3">
              <div className="text-2xl font-bold text-gray-900">{sequence.steps?.length || 0}</div>
              <div className="text-xs text-gray-500">Steps</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center">
            <Users className="h-5 w-5 text-blue-600" />
            <div className="ml-3">
              <div className="text-2xl font-bold text-gray-900">{totalEnrolled}</div>
              <div className="text-xs text-gray-500">Enrolled</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-orange-600" />
            <div className="ml-3">
              <div className="text-2xl font-bold text-gray-900">{totalInProgress}</div>
              <div className="text-xs text-gray-500">In Progress</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center">
            <Send className="h-5 w-5 text-amber-600" />
            <div className="ml-3">
              <div className="text-2xl font-bold text-gray-900">{totalDue}</div>
              <div className="text-xs text-gray-500">Due Now</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div className="ml-3">
              <div className="text-2xl font-bold text-gray-900">{totalCompleted}</div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sending Interval */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Timer className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Sending Speed</h2>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          How many minutes between each email send. Slower = safer for deliverability.
        </p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 5, 10, 15, 30, 60].map((mins) => (
            <button
              key={mins}
              onClick={() => handleSaveInterval(mins)}
              disabled={actionLoading}
              className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                (sequence.sendingIntervalMinutes || 5) === mins
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {mins < 60 ? `${mins} min` : '1 hour'}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Currently: 1 email every {sequence.sendingIntervalMinutes || 5} minute{(sequence.sendingIntervalMinutes || 5) !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Send From Account */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Send From</h2>
        {sequence.emailAccount ? (
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 rounded-full h-10 w-10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{sequence.emailAccount.email}</p>
              <p className="text-xs text-gray-500">
                {sequence.emailAccount.displayName ? `${sequence.emailAccount.displayName} — ` : ''}
                {sequence.emailAccount.type === 'GMAIL' ? 'Gmail' : sequence.emailAccount.type === 'ZOHO_SMTP' ? 'Zoho Mail' : 'Titan SMTP'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-md p-3 mb-4">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">No email account assigned — emails cannot be sent.</span>
          </div>
        )}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {sequence.emailAccount ? 'Change Email Account' : 'Assign Email Account'}
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select email account...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.email} {a.displayName ? `(${a.displayName})` : ''} — {a.type === 'GMAIL' ? 'Gmail' : a.type === 'ZOHO_SMTP' ? 'Zoho' : 'Titan'}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={async () => {
              setActionLoading(true);
              try {
                const res = await fetch(`/api/drip-sequences/${params.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ emailAccountId: selectedAccountId || null }),
                });
                if (!res.ok) throw new Error('Failed to update');
                toast.success('Email account updated');
                await fetchSequence();
              } catch (err: any) {
                toast.error(err?.message || 'Failed to update');
              } finally {
                setActionLoading(false);
              }
            }}
            variant="outline"
            disabled={actionLoading || selectedAccountId === (sequence.emailAccountId || '')}
          >
            Save
          </Button>
        </div>
      </div>

      {/* Recipient List Assignment */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recipient List</h2>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigned Google Sheet
            </label>
            <select
              value={selectedSheetId}
              onChange={(e) => setSelectedSheetId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">None</option>
              {sheets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.recipientCount || 0} contacts)
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={handleSaveSheet}
            variant="outline"
            disabled={actionLoading || selectedSheetId === (sequence.googleSheetId || '')}
          >
            Save
          </Button>
          {totalEnrolled > 0 && (
            <Button
              onClick={handleEnroll}
              disabled={enrolling || !sequence.googleSheetId}
              variant="outline"
            >
              {enrolling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Re-Enroll
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {totalEnrolled === 0
            ? 'Recipients will be enrolled automatically when you activate the sequence.'
            : `${totalEnrolled} recipients enrolled. Use "Re-Enroll" to add new contacts from the sheet.`}
        </p>
      </div>

      {/* Steps */}
      <div className="bg-white rounded-lg shadow border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Sequence Steps</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {sequence.steps?.map((step: any, idx: number) => (
            <div key={step.id} className="p-6 flex items-start gap-4">
              <div className="bg-purple-100 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-purple-700">{idx + 1}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {step.template?.name || 'Unknown Template'}
                    </h3>
                    <p className="text-sm text-gray-600">{step.subject}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Delay</div>
                    <div className="text-sm font-medium text-gray-900">
                      {step.delayDays === 0 && step.delayHours === 0
                        ? 'Immediate'
                        : `${step.delayDays}d ${step.delayHours}h`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {(!sequence.steps || sequence.steps.length === 0) && (
            <div className="p-12 text-center">
              <p className="text-gray-500">No steps configured</p>
            </div>
          )}
        </div>
      </div>

      {/* Recipient Progress */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recipient Progress</h2>
          <Button variant="outline" size="sm" onClick={fetchSequence}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
        {totalEnrolled === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-2 text-gray-500">No recipients enrolled yet</p>
            <p className="mt-1 text-xs text-gray-400">
              {sequence.isActive
                ? 'Something went wrong with enrollment. Try clicking "Re-Enroll" above.'
                : 'Click "Activate & Start Sending" to enroll recipients and begin sending.'}
            </p>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">
                  {totalCompleted} of {totalEnrolled} completed
                </span>
                <span className="text-gray-500 font-medium">
                  {totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${totalEnrolled > 0 ? (totalCompleted / totalEnrolled) * 100 : 0}%` }}
                />
              </div>
              {totalDue > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  {totalDue} recipient{totalDue !== 1 ? 's' : ''} due now — click &ldquo;Send Now&rdquo; to process
                </p>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Step</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Sent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Due</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sequence.progress?.slice(progressPage * PROGRESS_PAGE_SIZE, (progressPage + 1) * PROGRESS_PAGE_SIZE).map((p: any) => {
                    const isDue = !p.completed && p.nextEmailDue && new Date(p.nextEmailDue) <= new Date();
                    return (
                      <tr key={p.id} className={`hover:bg-gray-50 ${isDue ? 'bg-amber-50' : ''}`}>
                        <td className="px-6 py-3 text-sm text-gray-900">{p.recipientEmail}</td>
                        <td className="px-6 py-3 text-sm text-gray-900">
                          {p.currentStep} of {sequence.steps?.length || 0}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.completed
                              ? 'bg-green-100 text-green-700'
                              : isDue
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {p.completed ? 'Completed' : isDue ? 'Due Now' : 'Scheduled'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500">
                          {p.lastEmailSent ? new Date(p.lastEmailSent).toLocaleString() : '—'}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500">
                          {p.completed ? '—' : p.nextEmailDue ? new Date(p.nextEmailDue).toLocaleString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalEnrolled > PROGRESS_PAGE_SIZE && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {progressPage * PROGRESS_PAGE_SIZE + 1}–{Math.min((progressPage + 1) * PROGRESS_PAGE_SIZE, totalEnrolled)} of {totalEnrolled}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProgressPage((p) => Math.max(0, p - 1))}
                    disabled={progressPage === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProgressPage((p) => p + 1)}
                    disabled={(progressPage + 1) * PROGRESS_PAGE_SIZE >= totalEnrolled}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

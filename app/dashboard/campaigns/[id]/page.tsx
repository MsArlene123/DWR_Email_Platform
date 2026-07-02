'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  Trash2,
  RefreshCw,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Mail,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  RUNNING: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-purple-100 text-purple-700',
  STOPPED: 'bg-red-100 text-red-700',
  FAILED: 'bg-red-100 text-red-700',
  PENDING: 'bg-gray-100 text-gray-700',
  SENT: 'bg-green-100 text-green-700',
  BOUNCED: 'bg-orange-100 text-orange-700',
  OPENED: 'bg-blue-100 text-blue-700',
};

export default function CampaignDetailPage() {
  const params = useParams() as { id: string };
  const router = useRouter();
  const [campaign, setCampaign] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchCampaign = useCallback(
    async (silent = false) => {
      try {
        const res = await fetch(`/api/campaigns/${params.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setCampaign(data.campaign);
        setLogs(data.logs || []);
        setStats(data.stats || []);
      } catch (err: any) {
        if (!silent) toast.error(err?.message || 'Failed to load campaign');
      } finally {
        setLoading(false);
      }
    },
    [params.id]
  );

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  // Auto-refresh and sending trigger when running
  useEffect(() => {
    if (!campaign) return;
    const shouldPoll = campaign.status === 'RUNNING';
    setAutoRefresh(shouldPoll);
    if (!shouldPoll) return;

    const interval = setInterval(() => {
      // Trigger processing
      fetch(`/api/campaigns/process?campaignId=${params.id}`, {
        method: 'POST',
      }).catch(() => {});
      // Refresh campaign data
      fetchCampaign(true);
    }, 15000); // poll every 15s

    return () => clearInterval(interval);
  }, [campaign, fetchCampaign, params.id]);

  const handleStart = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${params.id}/start`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start');
      toast.success('Campaign started');
      await fetchCampaign();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to start campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${params.id}/pause`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to pause');
      toast.success('Campaign paused');
      await fetchCampaign();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to pause');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    if (!confirm('Stop this campaign? It will cancel all pending sends.'))
      return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${params.id}/stop`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to stop');
      toast.success('Campaign stopped');
      await fetchCampaign();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to stop');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this campaign? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${params.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Campaign deleted');
      router.push('/dashboard/campaigns');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete');
      setActionLoading(false);
    }
  };

  const handleProcessNow = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/campaigns/process?campaignId=${params.id}`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process');
      if (data.sent) {
        toast.success(`Email sent: ${data.recipientEmail || 'success'}`);
      } else {
        toast(data.reason || 'No email sent (rate limit or nothing due)');
      }
      await fetchCampaign();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to process');
    } finally {
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

  if (!campaign) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-500">Campaign not found</p>
          <Link
            href="/dashboard/campaigns"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  const totalSent = stats.find((s) => s.status === 'SENT')?._count || 0;
  const totalPending = stats.find((s) => s.status === 'PENDING')?._count || 0;
  const totalFailed = stats.find((s) => s.status === 'FAILED')?._count || 0;
  const totalRetry = stats.find((s) => s.status === 'RETRY')?._count || 0;
  const totalBounced = stats.find((s) => s.status === 'BOUNCED')?._count || 0;
  const totalOpened = stats.find((s) => s.status === 'OPENED')?._count || 0;
  const totalDelivered = totalSent + totalOpened;
  const openRate = totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 100) : 0;
  const bounceRate = campaign.totalRecipients > 0 ? Math.round((totalBounced / campaign.totalRecipients) * 100) : 0;

  const progress =
    campaign.totalRecipients > 0
      ? Math.round(((totalDelivered + totalBounced + totalFailed) / campaign.totalRecipients) * 100)
      : 0;

  const canStart =
    campaign.status === 'DRAFT' ||
    campaign.status === 'PAUSED' ||
    campaign.status === 'SCHEDULED' ||
    campaign.status === 'STOPPED';
  const canPause = campaign.status === 'RUNNING';
  const canStop =
    campaign.status === 'RUNNING' || campaign.status === 'PAUSED';

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">
                {campaign.name}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  statusColors[campaign.status]
                }`}
              >
                {campaign.status}
              </span>
              {autoRefresh && (
                <span className="inline-flex items-center text-xs text-gray-500">
                  <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                  Live
                </span>
              )}
            </div>
            <p className="mt-2 text-gray-600">
              From: {campaign.emailAccount?.email} • Subject: {campaign.subject}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canStart && (
              <Button onClick={handleStart} disabled={actionLoading}>
                <Play className="mr-2 h-4 w-4" />
                Start
              </Button>
            )}
            {canPause && (
              <Button
                onClick={handlePause}
                variant="outline"
                disabled={actionLoading}
              >
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
            )}
            {canStop && (
              <Button
                onClick={handleStop}
                variant="outline"
                disabled={actionLoading}
              >
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            )}
            {campaign.status === 'RUNNING' && (
              <Button
                onClick={handleProcessNow}
                variant="outline"
                disabled={actionLoading}
                title="Force send the next email now (ignores rate limit)"
              >
                <Send className="mr-2 h-4 w-4" />
                Send Next
              </Button>
            )}
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

      {/* Progress Card */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Progress</h2>
          <span className="text-sm text-gray-600">
            {totalDelivered} of {campaign.totalRecipients} delivered ({progress}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-3 rounded-md bg-green-50 border border-green-200">
            <CheckCircle2 className="mx-auto h-5 w-5 text-green-600" />
            <div className="mt-1 text-xl font-bold text-gray-900">{totalDelivered}</div>
            <div className="text-xs text-gray-500">Delivered</div>
          </div>
          <div className="text-center p-3 rounded-md bg-blue-50 border border-blue-200">
            <Mail className="mx-auto h-5 w-5 text-blue-600" />
            <div className="mt-1 text-xl font-bold text-gray-900">
              {totalOpened}
              {totalDelivered > 0 && <span className="text-sm font-normal text-gray-500 ml-1">({openRate}%)</span>}
            </div>
            <div className="text-xs text-gray-500">Opened</div>
          </div>
          <div className="text-center p-3 rounded-md bg-gray-50 border border-gray-200">
            <Clock className="mx-auto h-5 w-5 text-gray-500" />
            <div className="mt-1 text-xl font-bold text-gray-900">
              {totalPending}
            </div>
            <div className="text-xs text-gray-500">Pending</div>
          </div>
          <div className="text-center p-3 rounded-md bg-orange-50 border border-orange-200">
            <AlertCircle className="mx-auto h-5 w-5 text-orange-600" />
            <div className="mt-1 text-xl font-bold text-gray-900">
              {totalBounced}
              {campaign.totalRecipients > 0 && totalBounced > 0 && <span className="text-sm font-normal text-gray-500 ml-1">({bounceRate}%)</span>}
            </div>
            <div className="text-xs text-gray-500">Bounced</div>
          </div>
          <div className="text-center p-3 rounded-md bg-red-50 border border-red-200">
            <XCircle className="mx-auto h-5 w-5 text-red-600" />
            <div className="mt-1 text-xl font-bold text-gray-900">
              {totalFailed}
            </div>
            <div className="text-xs text-gray-500">Failed</div>
          </div>
          <div className="text-center p-3 rounded-md bg-yellow-50 border border-yellow-200">
            <RefreshCw className="mx-auto h-5 w-5 text-yellow-600" />
            <div className="mt-1 text-xl font-bold text-gray-900">
              {totalRetry}
            </div>
            <div className="text-xs text-gray-500">Retrying</div>
          </div>
        </div>
      </div>

      {/* Campaign Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider">
            Recipient List
          </div>
          <div className="mt-1 font-medium text-gray-900">
            {campaign.googleSheet?.name || 'N/A'}
          </div>
          <div className="text-xs text-gray-500">
            {campaign.totalRecipients} contacts
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider">
            Template
          </div>
          <div className="mt-1 font-medium text-gray-900">
            {campaign.template?.name || 'N/A'}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider">
            Sending Rate
          </div>
          <div className="mt-1 font-medium text-gray-900">
            1 email every {campaign.sendingRate} minute
            {campaign.sendingRate > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Recent Emails */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Activity (Last 100)
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCampaign()}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-2 text-gray-500">No activity yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Opened
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <div className="text-sm text-gray-900">
                        {log.recipientName || '—'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {log.recipientEmail}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[log.status] || statusColors.PENDING
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {log.sentAt
                        ? new Date(log.sentAt).toLocaleString()
                        : '—'}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {log.status === 'OPENED' ? (
                        <span className="text-blue-600 font-medium">
                          Yes{log.openCount > 1 ? ` (${log.openCount}x)` : ''}
                        </span>
                      ) : log.status === 'SENT' ? (
                        <span className="text-gray-400">Not yet</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-xs text-red-600 max-w-xs truncate">
                      {log.error || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

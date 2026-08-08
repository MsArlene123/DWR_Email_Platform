'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Loader2, BarChart3, Mail, MousePointerClick, AlertTriangle, CheckCircle2, Clock, Pause, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: Clock },
  SCHEDULED: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', icon: Clock },
  RUNNING: { label: 'Running', color: 'bg-green-100 text-green-700', icon: Mail },
  PAUSED: { label: 'Paused', color: 'bg-yellow-100 text-yellow-700', icon: Pause },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  STOPPED: { label: 'Stopped', color: 'bg-red-100 text-red-700', icon: XCircle },
  FAILED: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

export default function CampaignAnalyticsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/campaigns/analytics');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCampaigns(data.campaigns || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Summary stats across all campaigns
  const totalSent = campaigns.reduce((sum, c) => sum + c.totalSent, 0);
  const totalOpened = campaigns.reduce((sum, c) => sum + c.totalOpened, 0);
  const totalClicked = campaigns.reduce((sum, c) => sum + c.totalClicked, 0);
  const totalBounced = campaigns.reduce((sum, c) => sum + c.totalBounced, 0);
  const overallOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
  const overallClickRate = totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0;

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
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-full">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Campaign Analytics</h1>
            <p className="mt-2 text-gray-600">Performance metrics across all campaigns at a glance.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAnalytics}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{totalSent.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Total Delivered</div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{overallOpenRate}%</div>
          <div className="text-xs text-gray-500">Overall Open Rate</div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{overallClickRate}%</div>
          <div className="text-xs text-gray-500">Overall Click Rate</div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{totalBounced}</div>
          <div className="text-xs text-gray-500">Total Bounced</div>
        </div>
      </div>

      {/* Campaign Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-4 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Campaigns ({campaigns.length})</h2>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-2 text-gray-500">No campaigns yet. Create your first campaign to see analytics.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Recipients</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Sent</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Open Rate</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Click Rate</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Bounced</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sending From</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sheet</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((c: any) => {
                  const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.DRAFT;
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <Link href={`/dashboard/campaigns/${c.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                          {c.name}
                        </Link>
                        <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{c.subject}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-center text-gray-700">{c.totalRecipients}</td>
                      <td className="px-3 py-3 text-sm text-center text-gray-700">{c.totalSent}</td>
                      <td className="px-3 py-3 text-sm text-center text-gray-500">{c.totalPending}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-sm font-semibold ${c.openRate >= 30 ? 'text-green-600' : c.openRate >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {c.totalSent > 0 ? `${c.openRate}%` : '-'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-sm font-semibold ${c.clickRate >= 5 ? 'text-green-600' : c.clickRate >= 2 ? 'text-yellow-600' : 'text-gray-500'}`}>
                          {c.totalSent > 0 ? `${c.clickRate}%` : '-'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-sm ${c.totalBounced > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                          {c.totalBounced}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{c.emailAccount}</td>
                      <td className="px-3 py-3 text-xs text-gray-500 truncate max-w-[150px]">{c.sheetName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
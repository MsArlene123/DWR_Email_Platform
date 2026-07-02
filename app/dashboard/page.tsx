import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  Send,
  Mail,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sheet as SheetIcon,
  Workflow,
  Zap,
  Users,
  MailOpen,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

async function getDashboardData(userId: string) {
  const [campaigns, emailAccounts, templates, sheets, recentLogs, dripSequences] =
    await Promise.all([
      prisma.campaign.count({ where: { userId } }),
      prisma.emailAccount.count({ where: { userId, isActive: true } }),
      prisma.emailTemplate.count({ where: { userId } }),
      prisma.googleSheet.count({ where: { userId } }),
      prisma.emailLog.findMany({
        where: { emailAccount: { userId } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.dripSequence.findMany({
        where: { userId },
        include: {
          emailAccount: true,
          steps: true,
          _count: { select: { progress: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

  // Get today's email count
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const emailsSentToday = await prisma.emailLog.count({
    where: {
      emailAccount: { userId },
      status: { in: ['SENT', 'OPENED'] },
      sentAt: { gte: today },
    },
  });

  const totalEmailsSent = await prisma.emailLog.count({
    where: {
      emailAccount: { userId },
      status: { in: ['SENT', 'OPENED'] },
    },
  });

  const totalOpened = await prisma.emailLog.count({
    where: {
      emailAccount: { userId },
      status: 'OPENED',
    },
  });

  // Active campaigns
  const activeCampaigns = await prisma.campaign.count({
    where: { userId, status: { in: ['RUNNING', 'SCHEDULED'] } },
  });

  // Drip sequence stats
  const activeDripSequences = dripSequences.filter((d) => d.isActive).length;

  // Get progress stats for drip sequences
  const dripProgressStats = await Promise.all(
    dripSequences.map(async (seq) => {
      const [total, completed, due] = await Promise.all([
        prisma.recipientProgress.count({ where: { dripSequenceId: seq.id } }),
        prisma.recipientProgress.count({ where: { dripSequenceId: seq.id, completed: true } }),
        prisma.recipientProgress.count({
          where: { dripSequenceId: seq.id, completed: false, nextEmailDue: { lte: new Date() } },
        }),
      ]);
      return { id: seq.id, total, completed, due, inProgress: total - completed };
    })
  );

  return {
    totalCampaigns: campaigns,
    emailAccounts,
    templates,
    sheets,
    emailsSentToday,
    totalEmailsSent,
    totalOpened,
    activeCampaigns,
    activeDripSequences,
    recentLogs,
    dripSequences,
    dripProgressStats,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  const data = await getDashboardData(session.user.id);

  const stats = [
    {
      name: 'Active Campaigns',
      value: data.activeCampaigns,
      icon: Send,
      color: 'bg-blue-500',
      href: '/dashboard/campaigns',
    },
    {
      name: 'Active Drip Sequences',
      value: data.activeDripSequences,
      icon: Workflow,
      color: 'bg-purple-500',
      href: '/dashboard/drip-sequences',
    },
    {
      name: 'Emails Sent Today',
      value: data.emailsSentToday,
      icon: Mail,
      color: 'bg-green-500',
      href: '#activity',
    },
    {
      name: 'Total Opened',
      value: data.totalOpened,
      icon: MailOpen,
      color: 'bg-orange-500',
      href: '#activity',
    },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Manage your email campaigns and drip sequences
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`${stat.color} rounded-lg p-3`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Drip Sequences Section */}
      <div className="bg-white rounded-lg shadow border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Drip Sequences</h2>
          </div>
          <Link href="/dashboard/drip-sequences">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </div>
        {data.dripSequences.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Workflow className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No drip sequences yet</h3>
            <p className="mt-1 text-sm text-gray-500">Create a drip sequence to automate follow-up emails</p>
            <div className="mt-4">
              <Link href="/dashboard/drip-sequences/new">
                <Button><Zap className="mr-2 h-4 w-4" />Create Drip Sequence</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {data.dripSequences.map((seq: any) => {
              const stats = data.dripProgressStats.find((s) => s.id === seq.id);
              const progressPct = stats && stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
              return (
                <Link
                  key={seq.id}
                  href={`/dashboard/drip-sequences/${seq.id}`}
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-gray-900">{seq.name}</h3>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            seq.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {seq.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {seq.emailAccount?.email || 'No account'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Workflow className="h-3 w-3" />
                          {seq.steps?.length || 0} steps
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {stats?.total || 0} recipients
                        </span>
                        {stats && stats.due > 0 && (
                          <span className="flex items-center gap-1 text-amber-600 font-medium">
                            <Zap className="h-3 w-3" />
                            {stats.due} due now
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 w-32">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">{stats?.completed || 0}/{stats?.total || 0}</span>
                        <span className="text-gray-600 font-medium">{progressPct}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions + Today's Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div id="activity" className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Activity</h2>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-sm text-gray-600">Emails Sent Today</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">{data.emailsSentToday}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <MailOpen className="h-5 w-5 text-orange-500 mr-3" />
                <span className="text-sm text-gray-600">Total Emails Sent</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">{data.totalEmailsSent}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-blue-500 mr-3" />
                <span className="text-sm text-gray-600">Total Opened</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">{data.totalOpened}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/dashboard/drip-sequences/new">
              <Button className="w-full justify-start" variant="outline">
                <Workflow className="mr-2 h-4 w-4" />
                New Drip Sequence
              </Button>
            </Link>
            <Link href="/dashboard/campaigns/new">
              <Button className="w-full justify-start" variant="outline">
                <Send className="mr-2 h-4 w-4" />
                New Campaign
              </Button>
            </Link>
            <Link href="/dashboard/templates">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Manage Templates
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Email Activity</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {data.recentLogs?.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Mail className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No email activity yet</h3>
              <p className="mt-1 text-sm text-gray-500">Start by creating a drip sequence or campaign</p>
            </div>
          ) : (
            data.recentLogs?.map((log: any) => (
              <div key={log.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {log.status === 'SENT' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : log.status === 'OPENED' ? (
                      <MailOpen className="h-5 w-5 text-blue-500" />
                    ) : log.status === 'BOUNCED' ? (
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                    ) : log.status === 'FAILED' ? (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{log.recipientEmail}</p>
                      <p className="text-sm text-gray-500">{log.subject}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      log.status === 'SENT' ? 'bg-green-100 text-green-700'
                        : log.status === 'OPENED' ? 'bg-blue-100 text-blue-700'
                        : log.status === 'BOUNCED' ? 'bg-orange-100 text-orange-700'
                        : log.status === 'FAILED' ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {log.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {log.sentAt ? new Date(log.sentAt).toLocaleString() : log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

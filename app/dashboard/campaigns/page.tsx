import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Send, Plus, Clock, CheckCircle2, XCircle, Pause } from 'lucide-react';

export const dynamic = 'force-dynamic';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  RUNNING: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-purple-100 text-purple-700',
  STOPPED: 'bg-red-100 text-red-700',
  FAILED: 'bg-red-100 text-red-700',
};

const statusIcons: Record<string, any> = {
  DRAFT: Clock,
  SCHEDULED: Clock,
  RUNNING: Send,
  PAUSED: Pause,
  COMPLETED: CheckCircle2,
  STOPPED: XCircle,
  FAILED: XCircle,
};

async function getCampaigns(userId: string) {
  const campaigns = await prisma.campaign.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      emailAccount: true,
      googleSheet: true,
      template: true,
    },
  });

  return campaigns;
}

export default async function CampaignsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const campaigns = await getCampaigns(session.user.id);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="mt-2 text-gray-600">
            Manage and monitor your email campaigns
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Campaign
          </Button>
        </Link>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <Send className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No campaigns yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first campaign to start sending emails
          </p>
          <div className="mt-6">
            <Link href="/dashboard/campaigns/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((campaign: any) => {
                  const StatusIcon = statusIcons[campaign.status] || Clock;
                  const progress =
                    campaign.totalRecipients > 0
                      ? Math.round(
                          (campaign.emailsSent / campaign.totalRecipients) * 100
                        )
                      : 0;

                  return (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {campaign.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {campaign.emailAccount?.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            statusColors[campaign.status]
                          }`}
                        >
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">
                            {campaign.emailsSent}/{campaign.totalRecipients}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {campaign.template?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/dashboard/campaigns/${campaign.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

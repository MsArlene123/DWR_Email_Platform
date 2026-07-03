import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Mail, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { AccountHealthCheck } from '@/components/account-health-check';

export const dynamic = 'force-dynamic';

async function getEmailAccounts(userId: string) {
  const accounts = await prisma.emailAccount.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return accounts;
}

export default async function EmailAccountsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const accounts = await getEmailAccounts(session.user.id);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Accounts</h1>
          <p className="mt-2 text-gray-600">
            Connect and manage your email sending accounts
          </p>
        </div>
        <Link href="/dashboard/accounts/connect">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Connect Account
          </Button>
        </Link>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-900">
              Email Account Options
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              Connect a Gmail account via OAuth or configure a Titan SMTP account to start sending campaigns.
            </p>
          </div>
        </div>
      </div>

      {/* Fleet Health Check */}
      {accounts.length > 0 && <AccountHealthCheck />}

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <Mail className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No email accounts connected
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Connect your first email account to start sending campaigns
          </p>
          <div className="mt-6">
            <Link href="/dashboard/accounts/connect">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Connect Account
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {accounts.map((account: any) => (
            <div
              key={account.id}
              className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="bg-blue-100 rounded-lg p-3">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {account.displayName || account.email}
                    </h3>
                    <p className="text-sm text-gray-600">{account.email}</p>
                  </div>
                </div>
                {account.isActive ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      account.type === 'GMAIL'
                        ? 'bg-blue-100 text-blue-700'
                        : account.type === 'ZOHO_SMTP'
                        ? 'bg-yellow-100 text-yellow-700'
                        : account.type === 'GENERIC_SMTP' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {account.type === 'GMAIL' ? 'Gmail' : account.type === 'ZOHO_SMTP' ? 'Zoho Mail' : account.type === 'GENERIC_SMTP' ? 'Other SMTP' : 'Titan SMTP'}
                  </span>
                  <span className="ml-3 text-sm text-gray-500">
                    {account.emailsSentToday}/{account.dailyLimit} sent today
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Status: {account.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <Link href={`/dashboard/accounts/${account.id}`}>
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

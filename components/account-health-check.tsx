'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Stethoscope, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface HealthResult {
  id: string;
  email: string;
  type: string;
  displayName?: string | null;
  isActive: boolean;
  ok: boolean;
  stage?: 'decryption' | 'login';
  error?: string;
}

interface HealthResponse {
  checkedAt: string;
  total: number;
  healthy: number;
  unhealthy: number;
  accounts: HealthResult[];
}

/**
 * One-click health check for every connected email account.
 * Attempts an SMTP login for each account (no email is sent) and
 * reports which accounts can send and which cannot, with the reason
 * in plain language. Run this before launching a campaign.
 */
export function AccountHealthCheck() {
  const [checking, setChecking] = useState(false);
  const [report, setReport] = useState<HealthResponse | null>(null);

  const runCheck = async () => {
    setChecking(true);
    setReport(null);
    try {
      const res = await fetch('/api/accounts/health');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Health check failed');
      setReport(data);
      if (data.unhealthy === 0) {
        toast.success(`All ${data.total} accounts can send.`);
      } else {
        toast.error(
          `${data.unhealthy} of ${data.total} accounts cannot send. See details below.`
        );
      }
    } catch (err: any) {
      toast.error(err?.message || 'Health check failed');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={runCheck} disabled={checking}>
          {checking ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Stethoscope className="mr-2 h-4 w-4" />
          )}
          {checking ? 'Checking every account...' : 'Check All Accounts'}
        </Button>
        {report && (
          <span className="text-sm text-gray-600">
            {report.healthy} of {report.total} accounts healthy, checked{' '}
            {new Date(report.checkedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {checking && (
        <p className="mt-2 text-sm text-gray-500">
          Logging into each mail server to verify credentials. No emails are
          sent. This can take up to 15 seconds per slow account.
        </p>
      )}

      {report && (
        <div className="mt-4 bg-white rounded-lg shadow border border-gray-200 divide-y divide-gray-100">
          {report.accounts.map((account) => (
            <div key={account.id} className="px-4 py-3 flex items-start gap-3">
              {account.ok ? (
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  {account.displayName || account.email}
                  {account.displayName && (
                    <span className="ml-2 font-normal text-gray-500">
                      {account.email}
                    </span>
                  )}
                  {!account.isActive && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Inactive
                    </span>
                  )}
                </div>
                {account.ok ? (
                  <p className="text-sm text-green-700">
                    Login succeeded. This account can send.
                  </p>
                ) : (
                  <p className="text-sm text-red-700">
                    {account.stage === 'decryption'
                      ? 'Stored password problem: '
                      : 'Mail server refused the login: '}
                    {account.error}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

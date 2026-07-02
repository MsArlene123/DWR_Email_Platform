'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export default function AccountDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAccount();
  }, [id]);

  const fetchAccount = async () => {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      const acc = data.accounts?.find((a: any) => a.id === id);
      setAccount(acc);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }
    setTesting(true);
    try {
      const res = await fetch('/api/accounts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: id, testEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Test email sent successfully!');
      setTestEmail('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this account? This will also delete all associated campaigns and logs.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Account deleted');
      router.push('/dashboard/accounts');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
      setDeleting(false);
    }
  };

  const toggleActive = async () => {
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !account.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAccount(data.account);
      toast.success(`Account ${data.account.isActive ? 'activated' : 'deactivated'}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <p>Account not found</p>
        <Link href="/dashboard/accounts" className="text-blue-600">
          Back to accounts
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard/accounts"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Email Accounts
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {account.displayName || account.email}
            </h1>
            <p className="mt-2 text-gray-600">{account.email}</p>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              account.isActive
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {account.isActive ? (
              <CheckCircle className="mr-1 h-4 w-4" />
            ) : (
              <AlertCircle className="mr-1 h-4 w-4" />
            )}
            {account.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Account Info</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Type</dt>
              <dd className="font-medium">
                {account.type === 'GMAIL' ? 'Gmail' : account.type === 'ZOHO_SMTP' ? 'Zoho Mail' : 'Titan SMTP'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">SMTP Host</dt>
              <dd className="font-medium">{account.smtpHost}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">SMTP Port</dt>
              <dd className="font-medium">{account.smtpPort}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Daily Limit</dt>
              <dd className="font-medium">
                {account.emailsSentToday} / {account.dailyLimit} emails sent today
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Send Test Email</h2>
          <p className="text-sm text-gray-600 mb-4">
            Verify your connection by sending a test email.
          </p>
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3"
          />
          <Button onClick={handleTest} disabled={testing} className="w-full">
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Test Email
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={toggleActive}>
            {account.isActive ? 'Deactivate' : 'Activate'} Account
          </Button>
          <Button variant="outline" onClick={handleDelete} disabled={deleting}>
            {deleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete Account
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export default function ConnectAccountPage() {
  const router = useRouter();
  const [type, setType] = useState<'GMAIL' | 'TITAN_SMTP' | 'ZOHO_SMTP' | 'GENERIC_SMTP'>('GMAIL');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    password: '',
    smtpHost: 'smtp.titan.email',
    smtpPort: 587,
    dailyLimit: 500,
    businessName: '',
    businessAddress: '',
    businessPhone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          ...formData,
          smtpHost: type === 'GMAIL' ? 'smtp.gmail.com' : formData.smtpHost,
          dailyLimit: type === 'GMAIL' ? 500 : formData.dailyLimit,
          businessName: formData.businessName || null,
          businessAddress: formData.businessAddress || null,
          businessPhone: formData.businessPhone || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect account');

      toast.success('Account connected successfully!');
      router.push('/dashboard/accounts');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard/accounts"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Email Accounts
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Connect Email Account</h1>
        <p className="mt-2 text-gray-600">
          Add a Gmail, Titan, Zoho, or other SMTP email account to send campaigns
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <button
          type="button"
          onClick={() => { setType('GMAIL'); setFormData(f => ({ ...f, smtpHost: 'smtp.gmail.com', smtpPort: 587 })); }}
          className={`p-4 rounded-lg border-2 transition-all ${
            type === 'GMAIL'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <Mail className="h-6 w-6 text-red-600 mx-auto mb-2" />
          <div className="font-semibold">Gmail</div>
          <div className="text-xs text-gray-500">Using App Password</div>
        </button>
        <button
          type="button"
          onClick={() => { setType('TITAN_SMTP'); setFormData(f => ({ ...f, smtpHost: 'smtp.titan.email', smtpPort: 587 })); }}
          className={`p-4 rounded-lg border-2 transition-all ${
            type === 'TITAN_SMTP'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <Mail className="h-6 w-6 text-purple-600 mx-auto mb-2" />
          <div className="font-semibold">Titan SMTP</div>
          <div className="text-xs text-gray-500">Custom email provider</div>
        </button>
        <button
          type="button"
          onClick={() => { setType('ZOHO_SMTP'); setFormData(f => ({ ...f, smtpHost: 'smtp.zoho.com', smtpPort: 587 })); }}
          className={`p-4 rounded-lg border-2 transition-all ${
            type === 'ZOHO_SMTP'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <Mail className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
          <div className="font-semibold">Zoho Mail</div>
          <div className="text-xs text-gray-500">Zoho SMTP</div>
        </button>
        <button
          type="button"
          onClick={() => { setType('GENERIC_SMTP'); setFormData(f => ({ ...f, smtpHost: '', smtpPort: 587 })); }}
          className={`p-4 rounded-lg border-2 transition-all ${
            type === 'GENERIC_SMTP'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <Mail className="h-6 w-6 text-green-600 mx-auto mb-2" />
          <div className="font-semibold">Other SMTP</div>
          <div className="text-xs text-gray-500">PrivateEmail, Hostinger, etc.</div>
        </button>
      </div>

      {type === 'GMAIL' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-amber-900">
                Gmail App Password Required
              </h3>
              <p className="mt-1 text-sm text-amber-800">
                Gmail requires an <strong>App Password</strong> (not your regular password).
                To create one:
              </p>
              <ol className="mt-2 text-sm text-amber-800 list-decimal pl-5 space-y-1">
                <li>
                  Enable 2-Step Verification in your Google Account:{' '}
                  <a
                    href="https://myaccount.google.com/security"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    myaccount.google.com/security
                  </a>
                </li>
                <li>
                  Go to{' '}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    App Passwords
                  </a>
                </li>
                <li>Create a new app password for "Mail" and copy it</li>
                <li>Paste that 16-character password below (spaces are OK)</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {type === 'TITAN_SMTP' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <Info className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-purple-900">Titan SMTP Settings</h3>
              <p className="mt-1 text-sm text-purple-800">
                Default Titan SMTP settings: Host <code>smtp.titan.email</code>, Port{' '}
                <code>587</code> (TLS) or <code>465</code> (SSL).
                Use your regular Titan email password.
              </p>
            </div>
          </div>
        </div>
      )}

      {type === 'ZOHO_SMTP' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <Info className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-yellow-900">Zoho Mail SMTP Settings</h3>
              <p className="mt-1 text-sm text-yellow-800">
                Default Zoho SMTP settings: Host <code>smtp.zoho.com</code>, Port{' '}
                <code>587</code> (TLS) or <code>465</code> (SSL).
              </p>
              <p className="mt-2 text-sm text-yellow-800">
                You need to generate an <strong>App Password</strong> in your Zoho account:
              </p>
              <ol className="mt-2 text-sm text-yellow-800 list-decimal pl-5 space-y-1">
                <li>
                  Go to{' '}
                  <a
                    href="https://accounts.zoho.com/home#security/security_pwd"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Zoho Security Settings
                  </a>
                </li>
                <li>Enable Two-Factor Authentication if not already enabled</li>
                <li>Navigate to <strong>App Passwords</strong> section</li>
                <li>Generate a new app password and paste it below</li>
              </ol>
              <p className="mt-2 text-sm text-yellow-800">
                <strong>Note:</strong> If you use a regional Zoho domain (e.g., zoho.eu, zoho.in),
                update the SMTP host accordingly (e.g., <code>smtp.zoho.eu</code>).
              </p>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder={type === 'GMAIL' ? 'you@gmail.com' : 'you@yourdomain.com'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Display Name <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            placeholder="Your Name or Business Name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Recipients will see this name in the "From" field.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {type === 'GMAIL' ? 'App Password' : type === 'ZOHO_SMTP' ? 'App Password' : 'SMTP Password'} <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder={type === 'GMAIL' ? 'xxxx xxxx xxxx xxxx' : type === 'ZOHO_SMTP' ? 'Your Zoho app password' : 'Your email password'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {(type === 'TITAN_SMTP' || type === 'ZOHO_SMTP' || type === 'GENERIC_SMTP') && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={formData.smtpHost}
                  onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={formData.smtpPort}
                  onChange={(e) =>
                    setFormData({ ...formData, smtpPort: parseInt(e.target.value) || 587 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Daily Sending Limit
              </label>
              <input
                type="number"
                value={formData.dailyLimit}
                onChange={(e) =>
                  setFormData({ ...formData, dailyLimit: parseInt(e.target.value) || 500 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {type === 'ZOHO_SMTP' ? 'Zoho free accounts allow ~500 emails/day.' : 'Check with Titan for your sending limit.'}
              </p>
            </div>
          </>
        )}

        {/* Business Identity for CAN-SPAM Footer */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Business Identity (for email footer)</h3>
          <p className="text-xs text-gray-500 mb-3">
            Every email includes a CAN-SPAM compliant footer with your business name, address, and phone. Set these to match the brand sending from this account.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="e.g., WomenShield or DocWriteReview LLC"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Address
              </label>
              <input
                type="text"
                value={formData.businessAddress}
                onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                placeholder='e.g., 714 "H" Street, Unit 1205, Washington, DC 20002'
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Phone
              </label>
              <input
                type="text"
                value={formData.businessPhone}
                onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
                placeholder="e.g., (202) 800-1899"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            If left blank, defaults to DocWriteReview LLC.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect Account'
            )}
          </Button>
          <Link href="/dashboard/accounts">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/password-input';

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');

    setLoading(true);
    try {
      const res = await fetch('/api/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
      } else {
        setDone(true);
        setTimeout(() => router.replace('/login'), 2000);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <p className="text-center text-gray-700">
        This link is missing its reset code.{' '}
        <Link href="/forgot-password" className="font-semibold text-[hsl(210,100%,23%)]">
          Request a new one
        </Link>
        .
      </p>
    );
  }

  if (done) {
    return (
      <p className="text-center text-gray-700">
        Password updated. Taking you to Sign In...
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}{' '}
          {error.includes('expired') && (
            <Link href="/forgot-password" className="font-semibold underline">
              Request a new link
            </Link>
          )}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-gray-700 font-medium">New Password</Label>
        <PasswordInput
          id="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="h-12 border-gray-200 focus:border-[hsl(43,89%,52%)] focus:ring-[hsl(43,89%,52%)] rounded-xl"
          disabled={loading}
        />
        <p className="text-xs text-gray-500">Minimum 8 characters</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm" className="text-gray-700 font-medium">Confirm New Password</Label>
        <PasswordInput
          id="confirm"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          className="h-12 border-gray-200 focus:border-[hsl(43,89%,52%)] focus:ring-[hsl(43,89%,52%)] rounded-xl"
          disabled={loading}
        />
      </div>
      <Button
        type="submit"
        className="w-full h-12 bg-[hsl(43,89%,52%)] hover:bg-[hsl(43,89%,45%)] text-[hsl(210,100%,15%)] font-bold rounded-xl text-base transition-colors shadow-lg shadow-[hsl(43,89%,52%)]/20"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Saving...
          </>
        ) : (
          'Update Password'
        )}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[hsl(210,100%,23%)]">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sign In
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/">
              <Image
                src="/dwr-logo.png"
                alt="DocWriteReview LLC Logo"
                width={220}
                height={109}
                className="h-16 w-auto mx-auto mb-6"
                priority
              />
            </Link>
            <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-bold text-white mb-2">
              Choose a new password
            </h1>
          </div>
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <Suspense fallback={null}>
              <ResetForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

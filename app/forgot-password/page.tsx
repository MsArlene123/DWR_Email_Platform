'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
              Forgot your password?
            </h1>
            <p className="font-[family-name:var(--font-body)] text-white/60">
              Enter your email and we will send you a reset link
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {sent ? (
              <div className="text-center space-y-4">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
                <p className="text-gray-700">
                  If an account exists for <strong>{email}</strong>, a reset link is on its way.
                  It expires in 1 hour. Check your spam folder if you do not see it.
                </p>
                <Link
                  href="/login"
                  className="inline-block text-[hsl(210,100%,23%)] hover:text-[hsl(210,100%,30%)] font-semibold"
                >
                  Return to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 h-12 border-gray-200 focus:border-[hsl(43,89%,52%)] focus:ring-[hsl(43,89%,52%)] rounded-xl"
                      disabled={loading}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-[hsl(43,89%,52%)] hover:bg-[hsl(43,89%,45%)] text-[hsl(210,100%,15%)] font-bold rounded-xl text-base transition-colors shadow-lg shadow-[hsl(43,89%,52%)]/20"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

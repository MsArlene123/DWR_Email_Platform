'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Image from 'next/image';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success') === 'true';
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center">
        <div className="mb-6">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <Image src="/dwr-logo.png" alt="DocWriteReview" fill className="object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">
            {success ? "You've Been Unsubscribed" : 'Unsubscribe'}
          </h1>
        </div>

        {success ? (
          <div className="space-y-4">
            <p className="text-gray-600">
              <strong>{email}</strong> has been removed from our mailing list.
            </p>
            <p className="text-gray-500 text-sm">
              No hard feelings — you are always welcome back.
            </p>
            {token && (
              <div className="pt-4 border-t">
                <p className="text-gray-500 text-sm mb-3">
                  Changed your mind? You can re-subscribe anytime.
                </p>
                <a
                  href={`/api/resubscribe?token=${encodeURIComponent(token)}`}
                  className="inline-block px-6 py-2 bg-[#c9a84c] text-white rounded-lg font-semibold hover:bg-[#b8963e] transition-colors"
                >
                  Re-Subscribe
                </a>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-600">Invalid or missing unsubscribe link.</p>
        )}

        <div className="mt-8 pt-4 border-t text-xs text-gray-400">
          <p>DocWriteReview LLC | 714 "H" Street, Unit 1205, Washington, DC 20002</p>
          <p>(202) 800-1899</p>
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}

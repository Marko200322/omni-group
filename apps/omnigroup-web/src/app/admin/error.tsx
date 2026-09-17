'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin]', error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a12] px-4">
      <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-rose-300" />
        <h1 className="mt-4 font-display text-xl font-semibold text-white">Operator console error</h1>
        <p className="mt-2 text-sm text-slate-400">
          Something failed while loading the admin panel. Metrics and actions may be incomplete.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-xs text-slate-500">Ref: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" onClick={() => reset()} className="btn-primary inline-flex items-center justify-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link href="/admin/mobile" className="btn-glass inline-flex items-center justify-center text-sm">
            Mobile admin
          </Link>
        </div>
      </div>
    </div>
  );
}

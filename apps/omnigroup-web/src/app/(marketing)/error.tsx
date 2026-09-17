'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Error</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-white">We could not load this page</h1>
      <p className="mt-3 max-w-md text-slate-400">Please try again or contact us if the issue continues.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" className="btn-primary text-sm" onClick={() => reset()}>
          Try again
        </button>
        <Link href="/contact" className="btn-glass text-sm">
          Contact
        </Link>
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';

export default function GlobalError({
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
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Error</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-white">Something went wrong</h1>
      <p className="mt-3 max-w-md text-slate-400">Please try again. If the problem persists, contact support.</p>
      <button type="button" className="btn-primary mt-8 text-sm" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}

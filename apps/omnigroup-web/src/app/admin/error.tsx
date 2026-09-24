'use client';

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030508] px-4">
      <div className="glass-strong max-w-md p-8 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-rose-300">Console unavailable</p>
        <h1 className="mt-3 font-display text-2xl font-bold text-white">We could not load the operator console</h1>
        <p className="mt-3 text-sm text-slate-400">
          Operator data was not changed. Retry the request, or check Atina API health if the problem continues.
        </p>
        <button type="button" className="btn-primary mt-6" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[#030508] p-6 md:p-10" role="status" aria-label="Loading operator console">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-10 w-80 rounded-xl bg-white/10" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-white/5" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-28 rounded-2xl border border-white/5 bg-white/[0.03]" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading operator console…</span>
    </div>
  );
}

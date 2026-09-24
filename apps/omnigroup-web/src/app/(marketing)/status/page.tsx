import type { Metadata } from 'next';
import { collectPublicStatus, statusLabel, type StatusLevel } from '@/lib/public-status';

export const metadata: Metadata = {
  title: 'System status',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

function tone(level: StatusLevel): string {
  switch (level) {
    case 'operational':
      return 'text-emerald-300';
    case 'degraded':
      return 'text-amber-300';
    case 'partial_outage':
    case 'major_outage':
      return 'text-rose-300';
    default:
      return 'text-slate-300';
  }
}

export default async function StatusPage() {
  const { overall, checks } = await collectPublicStatus();

  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Operations</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">System status</h1>
        <p className="mt-4 text-slate-400">
          Live and ready probes, plus dependency signals from Atina <code className="text-violet-300">/health</code>.
          Stripe and email are listed only when we can honestly say they were probed — a HTTP 200 on the API is not
          enough to call checkout operational.
        </p>
        <p className={`mt-6 text-lg font-semibold ${tone(overall)}`}>Overall · {statusLabel(overall)}</p>
        <dl className="mt-8 space-y-4">
          {checks.map((check) => (
            <div key={check.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <dt className="text-sm text-slate-400">{check.label}</dt>
              <dd className={`mt-1 text-lg font-semibold ${tone(check.level)}`}>
                {statusLabel(check.level)}
                {check.httpStatus ? ` · ${check.httpStatus}` : ''}
              </dd>
              <p className="mt-2 text-sm text-slate-500">{check.detail}</p>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-xs text-slate-600">
          UptimeRobot: <code>/api/health/live</code> (process up) and <code>/api/health/ready</code> (API coupling).
        </p>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import { resolveAtinaApiBase } from '@/lib/atina-api-base';

export const metadata: Metadata = {
  title: 'System status',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

async function probe(url: string): Promise<{ ok: boolean; status: number }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timer);
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

export default async function StatusPage() {
  const atinaBase = resolveAtinaApiBase();
  const [web, api] = await Promise.all([
    probe(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3010'}/api/health/live`),
    probe(`${atinaBase}/health`),
  ]);

  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Operations</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">System status</h1>
        <p className="mt-4 text-slate-400">
          Public probes for uptime monitors. Point UptimeRobot at <code className="text-violet-300">/api/health/live</code>{' '}
          (always 200) and <code className="text-violet-300">/api/health/ready</code> for API coupling.
        </p>
        <dl className="mt-10 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <dt className="text-sm text-slate-400">Marketing site</dt>
            <dd className={`mt-1 text-lg font-semibold ${web.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
              {web.ok ? 'Operational' : 'Degraded'}
            </dd>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <dt className="text-sm text-slate-400">Atina API</dt>
            <dd className={`mt-1 text-lg font-semibold ${api.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
              {api.ok ? 'Operational' : 'Degraded'}
              {api.status ? ` · ${api.status}` : ''}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

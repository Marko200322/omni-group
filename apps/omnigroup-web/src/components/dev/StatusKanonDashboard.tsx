'use client';

import Link from 'next/link';
import {
  KANON_SECTIONS,
  STATUS_KANON_UPDATED,
  countByStatus,
  type KanonItem,
  type KanonStatus,
} from '@/lib/status-kanon-data';

type EmptyKeyRow = { name: string; source: string };

type Props = {
  emptyKeys: EmptyKeyRow[];
  emptyCount: number;
  setCount: number;
};

const STATUS_STYLE: Record<KanonStatus, string> = {
  DONE: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  READY: 'bg-cyan-500/15 text-cyan-200 ring-cyan-500/40',
  TI: 'bg-amber-500/15 text-amber-200 ring-amber-500/40',
  BLOCKED: 'bg-orange-500/15 text-orange-200 ring-orange-500/40',
  DEFERRED: 'bg-slate-500/15 text-slate-400 ring-white/10',
  CANCELLED: 'bg-red-500/10 text-red-300/80 ring-red-500/20',
  'N/A': 'bg-white/5 text-slate-600 ring-white/10',
  PARTIAL: 'bg-violet-500/15 text-violet-200 ring-violet-500/30',
};

function StatusBadge({ status }: { status: KanonStatus }) {
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${STATUS_STYLE[status]}`}>
      {status}
    </span>
  );
}

function ItemRow({ item }: { item: KanonItem }) {
  return (
    <li className="flex flex-wrap items-start gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5">
      <span className="font-mono text-[10px] text-slate-600">{item.id}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white">{item.title}</p>
        {item.note && <p className="mt-0.5 text-xs text-slate-500">{item.note}</p>}
        {item.link && item.link.startsWith('http') && (
          <a href={item.link} className="mt-1 inline-block text-xs text-cyan-400 hover:underline" target="_blank" rel="noreferrer">
            Otvori →
          </a>
        )}
      </div>
      {item.owner && <span className="text-[10px] text-slate-500">{item.owner}</span>}
      <StatusBadge status={item.status} />
    </li>
  );
}

export function StatusKanonDashboard({ emptyKeys, emptyCount, setCount }: Props) {
  const stats = countByStatus(KANON_SECTIONS);
  const p0Total = KANON_SECTIONS.find((s) => s.id === 'p0')?.items.length ?? 7;
  const p1Total = KANON_SECTIONS.find((s) => s.id === 'p1')?.items.length ?? 8;
  const p0Done = p0Total - stats.p0Open;
  const p1Done = p1Total - stats.p1Open;

  return (
    <div className="min-h-screen bg-[#050a10] text-slate-200">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">STATUS-KANON</p>
          <h1 className="mt-1 text-3xl font-bold text-white">Šta fali · šta radi · šta čeka tebe</h1>
          <p className="mt-2 text-sm text-slate-400">
            Ažurirano {STATUS_KANON_UPDATED} · izvor{' '}
            <Link href="/dev/docs" className="text-cyan-400 hover:underline">
              docs/STATUS-KANON.md
            </Link>
          </p>
        </header>

        {/* Summary cards */}
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
            <p className="text-2xl font-bold text-emerald-300">{stats.done}</p>
            <p className="text-xs text-slate-500">LIVE / DONE</p>
          </div>
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
            <p className="text-2xl font-bold text-amber-300">
              {stats.p0Open} <span className="text-sm font-normal text-slate-500">/ {p0Total}</span>
            </p>
            <p className="text-xs text-slate-500">P0 — tvoj klik (DNS/UI)</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-amber-400 transition-all" style={{ width: `${(p0Done / p0Total) * 100}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4">
            <p className="text-2xl font-bold text-cyan-300">
              {stats.p1Open} <span className="text-sm font-normal text-slate-500">/ {p1Total}</span>
            </p>
            <p className="text-xs text-slate-500">P1 — deploy queue</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-cyan-400 transition-all" style={{ width: `${(p1Done / p1Total) * 100}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-2xl font-bold text-slate-300">{emptyCount}</p>
            <p className="text-xs text-slate-500">EMPTY ključeva ({setCount} SET)</p>
          </div>
        </div>

        {/* P0 highlight */}
        {stats.p0Open > 0 && (
          <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="text-sm font-semibold text-amber-100">
              Sledeće za tebe (P0): DMARC → Resend Verify → Instantly warmup → Slack ×2 → mystery shopper → legal
            </p>
            <p className="mt-1 text-xs text-amber-200/70">
              Ovo agent ne može završiti — treba tvoj DNS panel i provider UI.
            </p>
          </div>
        )}

        {/* Sections */}
        <div className="space-y-8">
          {KANON_SECTIONS.map((section) => (
            <section key={section.id}>
              <h2 className="text-lg font-bold text-white">{section.title}</h2>
              {section.subtitle && <p className="text-xs text-slate-500">{section.subtitle}</p>}
              <ul className="mt-3 space-y-2">
                {section.items.map((item) => (
                  <ItemRow key={item.id} item={item} />
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* Empty keys */}
        <section className="mt-10">
          <h2 className="text-lg font-bold text-white">Prazni ključevi (prioritet)</h2>
          <p className="text-xs text-slate-500">
            Pun audit: <code className="text-cyan-400">.\scripts\audit-empty-keys.ps1</code> → docs/generated/EMPTY-KEYS.md
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {emptyKeys.slice(0, 40).map((k) => (
              <span
                key={k.name}
                className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 font-mono text-[10px] text-slate-400"
              >
                {k.name}
              </span>
            ))}
            {emptyKeys.length > 40 && (
              <span className="text-xs text-slate-600">+{emptyKeys.length - 40} više u EMPTY-KEYS.md</span>
            )}
          </div>
        </section>

        <footer className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-slate-600">
          <Link href="/dev/docs" className="text-cyan-500 hover:underline">
            ← Dev docs
          </Link>
          {' · '}
          <Link href="/dashboard" className="text-slate-500 hover:underline">
            Dashboard
          </Link>
        </footer>
      </div>
    </div>
  );
}

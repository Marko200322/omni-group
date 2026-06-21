'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  CreditCard,
  Workflow,
  AlertTriangle,
  Server,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import type { AtinaPublicSnapshot } from '@/lib/atina';
import { AdminPendingPaymentsPanel } from '@/components/platform/AdminPendingPaymentsPanel';
import type { AtinaAdminOverview, AtinaAdminPayment } from '@/lib/atina-live-types';
import type { SessionUser } from '@/lib/auth-session';
import { isAdminRole } from '@/lib/auth-roles';
import { describeSource, formatPlanLine } from '@/lib/atina-display';
import { buildAdminMetrics } from '@/lib/platform-metrics';
import { PlatformShell } from '@/components/platform/PlatformShell';
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { SparkChart } from '@/components/ui/SparkChart';
import { FormatLocalDateTime } from '@/components/ui/FormatLocalDateTime';
import { formatEur, getCategoryPricingMatrix } from '@/lib/category-pricing';
import { AutonomyLoopPanel } from '@/components/platform/AutonomyLoopPanel';
import { ResourceShopPanel } from '@/components/platform/ResourceShopPanel';
import { HuntingStackPanel } from '@/components/platform/HuntingStackPanel';
import { ProductFactoryPanel } from '@/components/platform/ProductFactoryPanel';
type Props = {
  snapshot: AtinaPublicSnapshot;
  sessionUser: SessionUser | null;
  isDemo: boolean;
  overview?: AtinaAdminOverview | null;
  pendingPayments?: AtinaAdminPayment[];
};

const severityColor = {
  info: 'border-l-cyan-500/60',
  warn: 'border-l-amber-500/60',
  error: 'border-l-rose-500/60',
};

export default function AdminClient({ snapshot, sessionUser, isDemo, overview, pendingPayments = [] }: Props) {
  const router = useRouter();
  const metrics = buildAdminMetrics(snapshot, overview);
  const status = overview ? 'live' : snapshot.source === 'live' ? 'live' : snapshot.source;

  return (
    <PlatformShell
      variant="admin"
      title="Operator pregled"
      subtitle={
        isDemo
          ? 'Demo sesija · prijavi se pravim nalogom za operator podatke.'
          : overview
            ? `Live operator podaci · ${sessionUser?.email ?? 'ulogovan korisnik'}.`
            : `Omni Group operator konzola — ${sessionUser?.email ?? 'ulogovan korisnik'}.`
      }
      badge={<StatusPill status={status} />}
      sessionUser={sessionUser}
      isDemo={isDemo}
    >
      <div id="users" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Aktivni korisnici"
          value={metrics.activeUsers}
          sub="30d rolling"
          icon={Users}
          accent="violet"
          trend={{ value: '+8.2% vs prošli mesec', positive: true }}
          delay={0}
        />
        <StatCard
          label="MRR"
          value={metrics.mrr}
          sub="Stripe + interni katalog"
          icon={CreditCard}
          accent="cyan"
          trend={{ value: '+12% QoQ', positive: true }}
          delay={0.05}
        />
        <StatCard
          label="Workflow uspeh"
          value={metrics.workflowSuccess}
          sub="7d prosek"
          icon={Workflow}
          accent="emerald"
          delay={0.1}
        />
        <StatCard
          label="Otvoreni alerti"
          value={metrics.openAlerts}
          sub="Forge + execution stats"
          icon={AlertTriangle}
          accent="rose"
          trend={
            Number(metrics.openAlerts) > 0
              ? { value: 'Pregledaj execution-stats', positive: false }
              : undefined
          }
          delay={0.15}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <GlassCard delay={0.2}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-white">Workflow performanse</h2>
            <span className="text-xs text-slate-500">7 dana</span>
          </div>
          <SparkChart data={metrics.sparkWorkflow} gradientFrom="#8b5cf6" gradientTo="#22d3ee" />
        </GlassCard>
        <GlassCard delay={0.25}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-white">Prihod (indeks)</h2>
            <span className="text-xs text-slate-500">YTD</span>
          </div>
          <SparkChart data={metrics.sparkRevenue} gradientFrom="#22d3ee" gradientTo="#34d399" />
        </GlassCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3" id="system">
        <GlassCard delay={0.3} className="xl:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Server className="h-5 w-5 text-violet-400" />
            <h2 className="font-display text-lg font-semibold text-white">Atina API</h2>
          </div>
          <p className="text-sm text-slate-400">{describeSource(snapshot)}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <dt className="text-slate-500">Base URL</dt>
              <dd className="mt-1 font-mono text-xs text-cyan-300">{snapshot.apiBase}</dd>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <dt className="text-slate-500">Snapshot</dt>
              <dd className="mt-1 text-white">
                <FormatLocalDateTime iso={snapshot.generatedAt} />
              </dd>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <dt className="text-slate-500">Health</dt>
              <dd className="mt-1">{snapshot.health?.ok ? 'OK' : '—'}</dd>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <dt className="text-slate-500">Planovi u katalogu</dt>
              <dd className="mt-1 text-2xl font-bold text-white">{snapshot.plansCount}</dd>
            </div>
          </dl>
          {snapshot.errors.length > 0 && (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
              <p className="font-medium">Greške pri fetch-u</p>
              <ul className="mt-2 list-inside list-disc text-rose-300/90">
                {snapshot.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </GlassCard>

        <GlassCard delay={0.35}>
          <h2 className="font-display text-lg font-semibold text-white">Live feed</h2>
          <ul className="mt-4 space-y-3">
            {metrics.recentEvents.map((ev, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                className={`border-l-2 pl-3 ${severityColor[ev.severity]}`}
              >
                <p className="text-xs text-slate-500">
                  {ev.time} · {ev.type}
                </p>
                <p className="text-sm text-slate-200">{ev.message}</p>
              </motion.li>
            ))}
          </ul>
        </GlassCard>
      </div>

      <section id="billing" className="mt-6">
        <GlassCard delay={0.4}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-white">Interni planovi (operator)</h2>
            <p className="mt-1 text-xs text-slate-500">
              Ovo nije cenovnik za klijente — samo RBAC/limiti u bazi. Klijentima prodaješ isporuke sa /pricing.
            </p>
            <button
              type="button"
              className="btn-ghost flex items-center gap-1 text-violet-300"
              onClick={() => router.refresh()}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Osveži katalog
            </button>
          </div>
          {snapshot.plans.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {snapshot.plans.map((p, i) => (
                <motion.div
                  key={p.slug ?? i}
                  whileHover={{ scale: 1.02 }}
                  className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-transparent p-4"
                >
                  <p className="font-semibold text-white">{p.name ?? p.slug}</p>
                  <p className="mt-1 text-sm text-slate-400">{formatPlanLine(p)}</p>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Pokreni Atina API sa billing modulom ili postavi{' '}
              <code className="text-violet-300">NEXT_PUBLIC_ATINA_API_BASE</code>.
            </p>
          )}
        </GlassCard>

        <div className="mt-4">
          <AdminPendingPaymentsPanel
            initialPayments={pendingPayments}
            disabled={isDemo || !sessionUser || !isAdminRole(sessionUser.role)}
          />
        </div>

        <div className="mt-6">
          <h3 className="mb-3 font-display text-base font-semibold text-white">Cene po industrijskoj kategoriji</h3>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-white/[0.03] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2">Kategorija</th>
                  <th className="px-3 py-2">Tarifa</th>
                  <th className="px-3 py-2">Poslovni</th>
                  <th className="px-3 py-2">Rast</th>
                  <th className="px-3 py-2">Partner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {getCategoryPricingMatrix().slice(0, 12).map((row) => (
                  <tr key={row.slug}>
                    <td className="px-3 py-2 text-white">{row.nameSr}</td>
                    <td className="px-3 py-2">{row.tierLabel}</td>
                    <td className="px-3 py-2">{formatEur(row.plans[0].monthly)}</td>
                    <td className="px-3 py-2">{formatEur(row.plans[1].monthly)}</td>
                    <td className="px-3 py-2">{formatEur(row.plans[2].monthly)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Prikaz prvih 12 kategorija ·{' '}
            <Link href="/pricing" className="text-violet-300 underline-offset-2 hover:underline">
              cenovnik isporuka
            </Link>
          </p>
        </div>
      </section>

      <section id="factory" className="mt-6">
        <GlassCard delay={0.38}>
          <h2 className="font-display text-lg font-semibold text-white">Product Factory</h2>
          <p className="mt-2 text-sm text-slate-400">
            Izolovane klijentske narudžbine i interni SaaS lane — greenfield scaffold, test gate, deploy prep.
          </p>
          <ProductFactoryPanel
            isAdmin={sessionUser ? isAdminRole(sessionUser.role) : false}
            disabled={isDemo || !sessionUser}
          />
        </GlassCard>
      </section>

      <section id="hunting" className="mt-6">
        <GlassCard delay={0.385}>
          <h2 className="font-display text-lg font-semibold text-white">Lovacki modul</h2>
          <p className="mt-2 text-sm text-slate-400">
            Client Hunter → Lead Scoring → Outreach → CRM. Jedan klik za bootstrap i nurture-loop pipeline.
          </p>
          <div className="mt-4">
            <HuntingStackPanel
              isAdmin={sessionUser ? isAdminRole(sessionUser.role) : false}
              disabled={isDemo || !sessionUser}
            />
          </div>
        </GlassCard>
      </section>

      <section id="resources" className="mt-6">
        <GlassCard delay={0.395}>
          <h2 className="font-display text-lg font-semibold text-white">Prodavnica resursa</h2>
          <p className="mt-2 text-sm text-slate-400">
            Kupi API kredite kroz sistem — uplata na IBAN, bez logovanja na HeyGen/OpenRouter sajtove.
            Auto-nabavka kreira narudžbinu kad resursi padnu (ON/OFF).
          </p>
          <div className="mt-4">
            <ResourceShopPanel disabled={isDemo || !sessionUser || !isAdminRole(sessionUser.role)} />
          </div>
        </GlassCard>
      </section>

      <section id="autonomy" className="mt-6">
        <GlassCard delay={0.39}>
          <h2 className="font-display text-lg font-semibold text-white">Autonomy Loop</h2>
          <p className="mt-2 text-sm text-slate-400">
            Operator petlja — rollout, outbound, evolution tick. Samo za interni tim.
          </p>
          <AutonomyLoopPanel
            isAdmin={sessionUser ? isAdminRole(sessionUser.role) : false}
            disabled={isDemo || !sessionUser}
          />
        </GlassCard>
      </section>

      <section id="settings" className="mt-6">
        <GlassCard delay={0.42}>
          <h2 className="font-display text-lg font-semibold text-white">Podešavanja</h2>
          <p className="mt-2 text-sm text-slate-400">
            Brzi linkovi za marketing sajt, klijentski workspace i internu dokumentaciju.
          </p>
          <motion.div className="mt-4 flex flex-wrap gap-3">
            <Link href="/admin/mobile" className="btn-primary text-sm">
              Mobilni admin (telefon)
            </Link>
            <Link href="/" className="btn-glass text-sm">
              Marketing sajt
            </Link>
            <Link href="/dashboard" className="btn-glass text-sm">
              Klijent workspace
            </Link>
            <Link href="/dev/docs" className="btn-primary text-sm">
              Dev dokumentacija
            </Link>
          </motion.div>
        </GlassCard>
      </section>

      <section id="workflows" className="mt-6 grid gap-4 md:grid-cols-3">
        {(overview?.modules?.slice(0, 3) ?? [
          { name: 'Onboarding chain', slug: 'onboarding' },
          { name: 'Forge health', slug: 'forge' },
          { name: 'Proxy rotation', slug: 'proxy' },
        ]).map((mod, i) => (
          <GlassCard key={mod.slug ?? mod.name} delay={0.45 + i * 0.05}>
            <p className="text-xs uppercase tracking-wider text-slate-500">Modul</p>
            <p className="mt-1 font-display text-lg font-semibold text-white">{mod.name}</p>
            <p className="mt-2 text-sm text-slate-400">
              {overview
                ? `Registrovan u Atina Core${'version' in mod && mod.version ? ` · v${mod.version}` : ''}.`
                : 'Prijavi se admin nalogom da učitaš live pregled modula.'}
            </p>
            <a
              href={`${snapshot.apiBase}/health`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs text-violet-300 hover:text-white"
            >
              Health probe <ExternalLink className="h-3 w-3" />
            </a>
          </GlassCard>
        ))}
      </section>
    </PlatformShell>
  );
}



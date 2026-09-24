'use client';

import { Suspense } from 'react';
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
import { AdminFulfillmentPanel } from '@/components/platform/AdminFulfillmentPanel';
import { AdminRevenueAllocationPanel } from '@/components/platform/AdminRevenueAllocationPanel';
import { AdminMarketAnalyticsPanel } from '@/components/platform/AdminMarketAnalyticsPanel';
import { AdminEnterpriseControls } from '@/components/platform/AdminEnterpriseControls';
import type { LiveMarketKpi } from '@/lib/market-analytics';
import { InviteClientPanel } from '@/components/platform/InviteClientPanel';
import { CrmContactsPanel } from '@/components/platform/CrmContactsPanel';
import type { AtinaAdminOverview, AtinaAdminPayment } from '@/lib/atina-live-types';
import type { SessionUser } from '@/lib/auth-session';
import { isAdminRole } from '@/lib/auth-roles';
import { describeSource, formatPlanLine } from '@/lib/atina-display';
import { buildAdminMetrics } from '@/lib/platform-metrics';
import { buildAdminNavItems } from '@/lib/platform-nav';
import { PlatformShell } from '@/components/platform/PlatformShell';
import { WorkspaceHashRedirect } from '@/components/platform/WorkspaceHashRedirect';
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { SparkChart } from '@/components/ui/SparkChart';
import { FormatLocalDateTime } from '@/components/ui/FormatLocalDateTime';
import { formatPlanMoney, SAAS_PLANS } from '@/lib/saas-plans';
import { AutonomyLoopPanel } from '@/components/platform/AutonomyLoopPanel';
import { ResourceShopPanel } from '@/components/platform/ResourceShopPanel';
import { HuntingStackPanel } from '@/components/platform/HuntingStackPanel';
import { ProductFactoryPanel } from '@/components/platform/ProductFactoryPanel';
import { AiMemoryPanel } from '@/components/platform/AiMemoryPanel';
import { getFactoryPhase, getFactoryPhaseLabel } from '@/lib/factory-phase';
import { isFactoryModuleAllowed } from '@/lib/factory-phase-guard';
import { FactoryPhasePanel } from '@/components/platform/FactoryPhasePanel';
import { isLeanProdMode } from '@/lib/prod-mode';
import { getMonthlyBudgetEur, getBudgetAllocationHint, isBudgetLaunchMode } from '@/lib/prod-budget';
import { getSellablePackageHint } from '@/lib/sellable-packages';
import { ADMIN_SECTION_META, type AdminWorkspaceSection } from '@/lib/workspace-routes';

type Props = {
  snapshot: AtinaPublicSnapshot;
  sessionUser: SessionUser | null;
  isDemo: boolean;
  overview?: AtinaAdminOverview | null;
  overviewError?: string;
  pendingPayments?: AtinaAdminPayment[];
  marketKpi?: LiveMarketKpi | null;
  section?: AdminWorkspaceSection;
};

const severityColor = {
  info: 'border-l-cyan-500/60',
  warn: 'border-l-amber-500/60',
  error: 'border-l-rose-500/60',
};

function LockedModule({ title, reason }: { title: string; reason: string }) {
  return (
    <GlassCard delay={0.1}>
      <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{reason}</p>
    </GlassCard>
  );
}

export default function AdminClient({
  snapshot,
  sessionUser,
  isDemo,
  overview,
  overviewError,
  pendingPayments = [],
  marketKpi = null,
  section = 'overview',
}: Props) {
  const router = useRouter();
  const metrics = buildAdminMetrics(snapshot, overview);
  const status = overviewError
    ? 'partial'
    : overview
      ? 'live'
      : snapshot.source === 'live'
        ? 'live'
        : snapshot.source;
  const leanProd = isLeanProdMode();
  const factoryPhase = getFactoryPhase();
  const budgetEur = getMonthlyBudgetEur();
  const budgetHints = getBudgetAllocationHint();
  const hunterAllowed = isFactoryModuleAllowed('hunter', factoryPhase);
  const autonomyAllowed = isFactoryModuleAllowed('autonomy', factoryPhase);
  const factoryOverview = (overview as { factory?: Record<string, unknown> } | null)?.factory ?? null;
  const adminNavItems = buildAdminNavItems({ leanProd, hunterAllowed, autonomyAllowed });
  const meta = ADMIN_SECTION_META[section];
  const operatorLocked = isDemo || !sessionUser || !isAdminRole(sessionUser.role);

  return (
    <PlatformShell
      variant="admin"
      navItems={adminNavItems}
      title={meta.title}
      subtitle={
        isDemo
          ? 'Demo session · sign in with a real account for operator data.'
          : overview
            ? `${meta.subtitle} · ${sessionUser?.email ?? 'signed-in user'}.`
            : `${meta.subtitle} · ${sessionUser?.email ?? 'signed-in user'}.`
      }
      badge={<StatusPill status={status} />}
      sessionUser={sessionUser}
      isDemo={isDemo}
    >
      <Suspense fallback={null}>
        <WorkspaceHashRedirect />
      </Suspense>
      {!isDemo && overviewError ? (
        <GlassCard delay={0} className="mb-6 border border-rose-500/40 bg-rose-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
            <div>
              <p className="text-sm font-medium text-rose-100">
                Live operator data is unavailable — Atina API did not respond ({overviewError}).
              </p>
              <p className="mt-1 text-xs text-rose-200/80">
                Shown numbers may be incomplete or catalog fallback. Refresh to retry.
              </p>
            </div>
          </div>
        </GlassCard>
      ) : null}

      {section === 'overview' ? (
        <>
          <FactoryPhasePanel initial={factoryOverview as Parameters<typeof FactoryPhasePanel>[0]['initial']} />

          <GlassCard
            delay={0}
            className={`mb-6 border ${leanProd ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}
          >
            <p className={`text-sm font-medium ${leanProd ? 'text-amber-100' : 'text-emerald-100'}`}>
              Factory {factoryPhase} — {getFactoryPhaseLabel(factoryPhase)} · €{budgetEur}/mo budget
              {!leanProd ? ' · prodMode full' : ' · prodMode lean'}
            </p>
            <p className={`mt-1 text-sm ${leanProd ? 'text-amber-200/80' : 'text-emerald-200/80'}`}>
              {getSellablePackageHint()}
            </p>
            <p className={`mt-2 text-xs ${leanProd ? 'text-amber-200/70' : 'text-emerald-200/70'}`}>
              {leanProd
                ? 'Lean profile: limited checkout · AI cap enforced · Sales: contact → manual checkout → confirm → fulfillment.'
                : 'Live ops: Hunting + Autonomy routes · scraper/Hunter/outbound per readiness · Confirm payments → fulfillment.'}
            </p>
            <p className={`mt-2 text-xs ${leanProd ? 'text-amber-200/60' : 'text-emerald-200/60'}`}>
              Jump:{' '}
              {hunterAllowed ? (
                <>
                  <Link href="/admin/hunting" className="underline underline-offset-2">
                    Hunting
                  </Link>
                  {' · '}
                </>
              ) : null}
              {autonomyAllowed ? (
                <>
                  <Link href="/admin/autonomy" className="underline underline-offset-2">
                    Autonomy
                  </Link>
                  {' · '}
                </>
              ) : null}
              <Link href="/admin/billing" className="underline underline-offset-2">
                Pending payments
              </Link>
            </p>
            {leanProd && isBudgetLaunchMode() ? (
              <ul className="mt-3 space-y-1 text-xs text-amber-100/80">
                {budgetHints.map((h) => (
                  <li key={h.label}>
                    {h.label}: ~€{h.eur}
                  </li>
                ))}
              </ul>
            ) : null}
          </GlassCard>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Active users"
              value={metrics.activeUsers}
              sub="30d rolling"
              icon={Users}
              accent="violet"
              trend={metrics.trends?.activeUsers}
              delay={0}
            />
            <StatCard
              label="Recorded revenue"
              value={metrics.mrr}
              sub="Confirmed payments · not MRR"
              icon={CreditCard}
              accent="cyan"
              trend={metrics.trends?.mrr}
              delay={0.05}
            />
            <StatCard
              label="Workflow success"
              value={metrics.workflowSuccess}
              sub="7d average"
              icon={Workflow}
              accent="emerald"
              delay={0.1}
            />
            <StatCard
              label="Open alerts"
              value={metrics.openAlerts}
              sub="Forge + execution stats"
              icon={AlertTriangle}
              accent="rose"
              trend={
                Number(metrics.openAlerts) > 0
                  ? { value: 'Review execution stats', positive: false }
                  : undefined
              }
              delay={0.15}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <GlassCard delay={0.2}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-white">Workflow performance</h2>
                <span className="text-xs text-slate-500">7 days</span>
              </div>
              <SparkChart data={metrics.sparkWorkflow} gradientFrom="#8b5cf6" gradientTo="#22d3ee" />
            </GlassCard>
            <GlassCard delay={0.25}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-white">Revenue (index)</h2>
                <span className="text-xs text-slate-500">YTD</span>
              </div>
              <SparkChart data={metrics.sparkRevenue} gradientFrom="#22d3ee" gradientTo="#34d399" />
            </GlassCard>
          </div>
        </>
      ) : null}

      {section === 'customers' ? (
        <>
          <InviteClientPanel disabled={operatorLocked} plans={snapshot.plans} />
          <div className="mt-6">
            <AdminEnterpriseControls disabled={operatorLocked} currentUserId={sessionUser?.id} />
          </div>
          <div className="mt-6">
            <GlassCard delay={0.18}>
              <h2 className="font-display text-lg font-semibold text-white">CRM contacts</h2>
              <p className="mt-2 text-sm text-slate-400">
                Leads, prospects, and clients — operator view only.
              </p>
              <div className="mt-4">
                <CrmContactsPanel disabled={operatorLocked} />
              </div>
            </GlassCard>
          </div>
        </>
      ) : null}

      {section === 'system' ? (
        <div className="grid gap-6 xl:grid-cols-3">
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
                <dt className="text-slate-500">Plans in catalog</dt>
                <dd className="mt-1 text-2xl font-bold text-white">{snapshot.plansCount}</dd>
              </div>
            </dl>
            {snapshot.errors.length > 0 && (
              <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                <p className="font-medium">Fetch errors</p>
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
      ) : null}

      {section === 'billing' ? (
        <>
          <GlassCard delay={0.4}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-white">SaaS price book</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Canonical Launch / Growth / Scale prices in EUR and USD. Client checkout uses this book.
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost flex items-center gap-1 text-violet-300"
                onClick={() => router.refresh()}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh catalog
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SAAS_PLANS.map((plan) => (
                <motion.div
                  key={plan.slug}
                  whileHover={{ scale: 1.02 }}
                  className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-transparent p-4"
                >
                  <p className="font-semibold text-white">{plan.name}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {formatPlanMoney(plan.monthly.EUR, 'EUR')} / {formatPlanMoney(plan.monthly.USD, 'USD')} monthly
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatPlanMoney(plan.yearly.EUR, 'EUR')} / {formatPlanMoney(plan.yearly.USD, 'USD')} yearly
                  </p>
                </motion.div>
              ))}
            </div>
            {snapshot.plans.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {snapshot.plans.map((p, i) => (
                  <div key={p.slug ?? i} className="rounded-xl border border-white/10 p-3 text-sm text-slate-400">
                    <p className="font-medium text-white">{p.name ?? p.slug}</p>
                    <p className="mt-1">{formatPlanLine(p)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Start the Atina API with the billing module or set{' '}
                <code className="text-violet-300">NEXT_PUBLIC_ATINA_API_BASE</code>.
              </p>
            )}
          </GlassCard>

          <div className="mt-4">
            <AdminPendingPaymentsPanel initialPayments={pendingPayments} disabled={operatorLocked} />
          </div>
          <div className="mt-4">
            <AdminFulfillmentPanel disabled={operatorLocked} />
          </div>
          <div className="mt-4">
            <AdminRevenueAllocationPanel disabled={operatorLocked} />
          </div>
          <div className="mt-4">
            <AdminMarketAnalyticsPanel disabled={operatorLocked} initialKpi={marketKpi} />
          </div>
        </>
      ) : null}

      {section === 'factory' ? (
        leanProd ? (
          <LockedModule
            title="Product Factory"
            reason="Hidden in lean mode — enable after MRR gate (prodMode: full)."
          />
        ) : (
          <GlassCard delay={0.38}>
            <h2 className="font-display text-lg font-semibold text-white">Product Factory</h2>
            <p className="mt-2 text-sm text-slate-400">
              Isolated client orders and internal SaaS lane — greenfield scaffold, test gate, deploy prep.
            </p>
            <ProductFactoryPanel
              isAdmin={sessionUser ? isAdminRole(sessionUser.role) : false}
              disabled={isDemo || !sessionUser}
            />
          </GlassCard>
        )
      ) : null}

      {section === 'hunting' ? (
        hunterAllowed ? (
          <GlassCard delay={0.385}>
            <h2 className="font-display text-lg font-semibold text-white">Hunting module</h2>
            <p className="mt-2 text-sm text-slate-400">
              Client Hunter, outreach drafts, CRM pipeline. Factory M2+.
            </p>
            <div className="mt-4">
              <HuntingStackPanel
                isAdmin={sessionUser ? isAdminRole(sessionUser.role) : false}
                disabled={isDemo || !sessionUser}
              />
            </div>
          </GlassCard>
        ) : (
          <LockedModule title="Hunting" reason="Unlocks at Factory M2+." />
        )
      ) : null}

      {section === 'resources' ? (
        hunterAllowed && !leanProd ? (
          <GlassCard delay={0.395}>
            <h2 className="font-display text-lg font-semibold text-white">Resource shop</h2>
            <p className="mt-2 text-sm text-slate-400">
              Purchase API credits through the system — pay via IBAN without logging into HeyGen/OpenRouter sites.
            </p>
            <div className="mt-4">
              <ResourceShopPanel disabled={operatorLocked} />
            </div>
          </GlassCard>
        ) : (
          <LockedModule
            title="Resource shop"
            reason="Available when Hunting is unlocked and prodMode is full."
          />
        )
      ) : null}

      {section === 'autonomy' ? (
        autonomyAllowed ? (
          <GlassCard delay={0.39}>
            <h2 className="font-display text-lg font-semibold text-white">Autonomy Loop</h2>
            <p className="mt-2 text-sm text-slate-400">
              Scheduler, outbound stats, vertical rollout. Live from Factory M4+.
            </p>
            <AutonomyLoopPanel
              isAdmin={sessionUser ? isAdminRole(sessionUser.role) : false}
              disabled={isDemo || !sessionUser}
            />
          </GlassCard>
        ) : (
          <LockedModule title="Autonomy Loop" reason="Unlocks at Factory M4+." />
        )
      ) : null}

      {section === 'settings' ? (
        <GlassCard delay={0.42}>
          <h2 className="font-display text-lg font-semibold text-white">Settings</h2>
          <p className="mt-2 text-sm text-slate-400">
            The operator console is the same on phone and desktop — use the menu button on small screens.
          </p>
          <motion.div className="mt-4 flex flex-wrap gap-3">
            <Link href="/" className="btn-glass text-sm">
              Marketing site
            </Link>
            <Link href="/dashboard" className="btn-glass text-sm">
              Client portal preview
            </Link>
            <Link href="/dev/docs" className="btn-primary text-sm">
              Dev documentation
            </Link>
          </motion.div>
          <div className="mt-8 border-t border-white/5 pt-6">
            <h3 className="font-display text-base font-semibold text-white">AI memory</h3>
            <p className="mt-1 text-sm text-slate-500">Operator context store — not visible to clients.</p>
            <div className="mt-4">
              <AiMemoryPanel
                disabled={operatorLocked}
                operatorMode={!isDemo && !!sessionUser && isAdminRole(sessionUser.role)}
              />
            </div>
          </div>
        </GlassCard>
      ) : null}

      {section === 'workflows' ? (
        <section className="grid gap-4 md:grid-cols-3">
          {(overview?.modules?.slice(0, 3) ?? [
            { name: 'Onboarding chain', slug: 'onboarding' },
            { name: 'Forge health', slug: 'forge' },
            { name: 'Proxy rotation', slug: 'proxy' },
          ]).map((mod, i) => (
            <GlassCard key={mod.slug ?? mod.name} delay={0.45 + i * 0.05}>
              <p className="text-xs uppercase tracking-wider text-slate-500">Module</p>
              <p className="mt-1 font-display text-lg font-semibold text-white">{mod.name}</p>
              <p className="mt-2 text-sm text-slate-400">
                {overview
                  ? `Registered in Atina Core${'version' in mod && mod.version ? ` · v${mod.version}` : ''}.`
                  : 'Sign in with an admin account to load the live module overview.'}
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
      ) : null}
    </PlatformShell>
  );
}

'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  FolderKanban,
  Zap,
  Gauge,
  Crown,
  Play,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import type { AtinaPublicSnapshot } from '@/lib/atina';
import type { AtinaDashboardLive } from '@/lib/atina-live-types';
import type { SessionUser } from '@/lib/auth-session';
import { describeSource, formatPlanLine } from '@/lib/atina-display';
import { isAdminRole } from '@/lib/auth-roles';
import { buildClientMetrics } from '@/lib/platform-metrics';
import { PlatformShell } from '@/components/platform/PlatformShell';
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { AiMemoryPanel } from '@/components/platform/AiMemoryPanel';
import { BillingCheckoutPanel } from '@/components/platform/BillingCheckoutPanel';
import { AutonomyLoopPanel } from '@/components/platform/AutonomyLoopPanel';
import { SupportMeetingPanel } from '@/components/platform/SupportMeetingPanel';
import { SalesMeetingPanel } from '@/components/platform/SalesMeetingPanel';
import { StatusPill } from '@/components/ui/StatusPill';
import { SparkChart } from '@/components/ui/SparkChart';

type Props = {
  snapshot: AtinaPublicSnapshot;
  live: AtinaDashboardLive | null;
  sessionUser: SessionUser | null;
  isDemo: boolean;
  unreadCount: number | null;
  unreadError?: string;
};

const taskStatus = {
  running: { label: 'U toku', color: 'text-cyan-400', icon: Play },
  queued: { label: 'U redu', color: 'text-amber-400', icon: Clock },
  done: { label: 'Završeno', color: 'text-emerald-400', icon: CheckCircle2 },
};

export default function DashboardClient({
  snapshot,
  live,
  sessionUser,
  isDemo,
  unreadCount,
  unreadError,
}: Props) {
  const metrics = buildClientMetrics(snapshot, live, { authenticated: !isDemo && Boolean(sessionUser) });
  const status =
    live?.me || live?.tasks.length ? 'live' : snapshot.source === 'live' ? 'live' : snapshot.source;
  const greeting = sessionUser?.name ? `Zdravo, ${sessionUser.name.split(' ')[0]}` : 'Dobrodošli nazad';

  return (
    <PlatformShell
      variant="client"
      title={greeting}
      subtitle={
        isDemo
          ? 'Demo sesija · podaci su ilustrativni dok ne povežeš Atina API.'
          : `Plan ${metrics.planName} · live podaci kad je Atina API dostupan.`
      }
      badge={<StatusPill status={status} />}
      sessionUser={sessionUser}
      isDemo={isDemo}
    >
      {isDemo && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-medium text-amber-200">Demo režim</p>
          <p className="mt-1">
            Za plan, uplatu, avatare i AI memoriju{' '}
            <Link href="/login" className="font-medium text-white underline-offset-2 hover:underline">
              prijavi se pravim nalogom
            </Link>{' '}
            (admin@atina.io).
          </p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Aktivni projekti"
          value={metrics.projectsActive}
          icon={FolderKanban}
          accent="emerald"
          delay={0}
        />
        <StatCard
          label="Automacije (30d)"
          value={metrics.automationsRun}
          icon={Zap}
          accent="cyan"
          trend={{ value: '+340 ovaj mesec', positive: true }}
          delay={0.05}
        />
        <StatCard
          label="Potrošnja kvote"
          value={metrics.creditsUsed}
          sub="reset za 8 dana"
          icon={Gauge}
          accent="violet"
          delay={0.1}
        />
        <StatCard
          label="Trenutni plan"
          value={metrics.planName}
          icon={Crown}
          accent="rose"
          delay={0.15}
        />
      </div>

      <div id="automations" className="mt-6 grid gap-6 lg:grid-cols-3">
        <GlassCard delay={0.2} className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-white">Potrošnja resursa</h2>
            <span className="text-xs text-slate-500">Poslednjih 6 perioda</span>
          </div>
          <SparkChart data={metrics.sparkUsage} gradientFrom="#34d399" gradientTo="#60a5fa" />
        </GlassCard>

        <GlassCard delay={0.25}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-white">Obaveštenja</h2>
            {!isDemo && unreadCount !== null && (
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                {unreadCount} nepročitanih
              </span>
            )}
          </div>
          {!isDemo && unreadCount === null && unreadError && (
            <p className="mb-3 text-xs text-slate-500">{unreadError}</p>
          )}
          {!isDemo && metrics.notifications.length === 0 && unreadCount === null && !unreadError && (
            <p className="mb-3 text-xs text-slate-500">Nema novih obaveštenja.</p>
          )}
          <ul className="mt-4 space-y-3">
            {metrics.notifications.map((n) => (
              <motion.li
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02, x: 4 }}
                className={`rounded-xl border p-3 text-sm ${
                  n.read
                    ? 'border-white/5 bg-white/[0.02] text-slate-400'
                    : 'border-emerald-500/20 bg-emerald-500/5 text-slate-200'
                }`}
              >
                <p className="font-medium">{n.title}</p>
                <p className="mt-1 text-xs text-slate-500">{n.time}</p>
              </motion.li>
            ))}
          </ul>
        </GlassCard>
      </div>

      <section id="autonomy" className="mt-6">
        <GlassCard delay={0.28}>
          <h2 className="font-display text-lg font-semibold text-white">Autonomy Loop</h2>
          <p className="mt-2 text-sm text-slate-400">
            Zatvorena petlja — istraži tržište, generiši module, deploy, feedback. Tick pokreće do 2 vertikale po
            ciklusu.
          </p>
          <AutonomyLoopPanel
            isAdmin={sessionUser ? isAdminRole(sessionUser.role) : false}
            disabled={isDemo || !sessionUser}
          />
        </GlassCard>
      </section>

      <section id="projects" className="mt-6">
        <GlassCard delay={0.3}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-white">Aktivni zadaci</h2>
            <Link href="/contact" className="btn-ghost flex items-center gap-1 text-emerald-300">
              Novi projekat <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-4">
            {metrics.tasks.map((task) => {
              const meta = taskStatus[task.status];
              const Icon = meta.icon;
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ x: 6 }}
                  className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-emerald-500/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{task.title}</p>
                      <p className={`mt-1 flex items-center gap-1 text-xs ${meta.color}`}>
                        <Icon className="h-3.5 w-3.5" /> {meta.label}
                      </p>
                    </div>
                    <span className="font-display text-lg font-bold text-white">{task.progress}%</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${task.progress}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </GlassCard>
      </section>

      <section id="billing" className="mt-6 grid gap-6 lg:grid-cols-2">
        <GlassCard delay={0.35}>
          <h2 className="font-display text-lg font-semibold text-white">Atina modul — status</h2>
          <p className="mt-2 text-sm text-slate-400">{describeSource(snapshot)}</p>
          {live?.me && (
            <p className="mt-2 text-sm text-emerald-300/90">
              Prijavljen: {live.me.email} · uloga {live.me.role}
            </p>
          )}
          {live && live.errors.length > 0 && (
            <p className="mt-2 text-xs text-amber-400/90">API: {live.errors.join('; ')}</p>
          )}
          <p className="mt-4 font-mono text-xs text-cyan-300/80">{snapshot.apiBase}</p>
        </GlassCard>
        <GlassCard delay={0.4}>
          <h2 className="font-display text-lg font-semibold text-white">Dostupni planovi</h2>
          {snapshot.plans.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {snapshot.plans.map((p, i) => (
                <li
                  key={p.slug ?? i}
                  className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2 text-sm"
                >
                  <span className="text-white">{p.name ?? p.slug}</span>
                  <span className="text-slate-400">{formatPlanLine(p)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Katalog planova će se učitati sa Atina API-ja.</p>
          )}
          {sessionUser && !isDemo ? (
            <BillingCheckoutPanel plans={snapshot.plans} />
          ) : (
            <p className="mt-4 text-xs text-slate-500">
              Prijavi se na Atina nalog da generišeš uputstvo za uplatu (režim bez firme).
            </p>
          )}
          <Link href="/pricing" className="btn-primary mt-6 inline-block text-sm">
            Nadogradi plan
          </Link>
        </GlassCard>
      </section>

      <section id="support" className="mt-6">
        <GlassCard delay={0.45}>
          <h2 className="font-display text-lg font-semibold text-white">Podrška</h2>
          <p className="mt-2 text-sm text-slate-400">
            Pričaj sa AI avatarom — izaberi člana support tima (Mila, Stefan, Jelena). Ispod možeš zakazati i live poziv.
          </p>
          {sessionUser && !isDemo ? (
            <SupportMeetingPanel />
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/contact" className="btn-primary text-sm">
                Kontaktiraj tim
              </Link>
              <Link href="/login" className="btn-glass text-sm">
                Prijavi se za video podršku
              </Link>
            </div>
          )}
        </GlassCard>
      </section>

      <section id="sales" className="mt-6">
        <GlassCard delay={0.48}>
          <h2 className="font-display text-lg font-semibold text-white">Prodaja</h2>
          <p className="mt-2 text-sm text-slate-400">
            AI prodajni avatar — izaberi jednog od 4 članova tima (Nikola, Ana, Marko, Ivana). Prijavi se da započneš razgovor.
          </p>
          {sessionUser && !isDemo ? (
            <SalesMeetingPanel />
          ) : (
            <div className="mt-4">
              <Link href="/login" className="btn-glass text-sm">
                Prijavi se za prodajni avatar
              </Link>
            </div>
          )}
        </GlassCard>
      </section>

      <section id="account" className="mt-6">
        <GlassCard delay={0.5}>
          <h2 className="font-display text-lg font-semibold text-white">Nalog</h2>
          {sessionUser ? (
            <div className="mt-3 space-y-1 text-sm text-slate-300">
              <p>
                <span className="text-slate-500">Email:</span> {sessionUser.email}
              </p>
              <p>
                <span className="text-slate-500">Uloga:</span> {sessionUser.role}
              </p>
              {isDemo && (
                <p className="text-xs text-amber-400/90">Demo sesija — ai-memory zahteva pravu Atina prijavu.</p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Niste prijavljeni.</p>
          )}
          <Link href="/login" className="btn-glass mt-4 inline-block text-sm">
            Prijava / podešavanja
          </Link>
        </GlassCard>

        {!isDemo && sessionUser && (
          <GlassCard delay={0.55} className="mt-6">
            <h2 className="font-display text-lg font-semibold text-white">AI memorija</h2>
            <p className="mt-2 text-sm text-slate-400">
              Testiraj Atina <span className="font-mono text-violet-300">ai-memory</span> tok bez izlaganja JWT-a u
              browseru.
            </p>
            <div className="mt-4">
              <AiMemoryPanel />
            </div>
          </GlassCard>
        )}
      </section>
    </PlatformShell>
  );
}



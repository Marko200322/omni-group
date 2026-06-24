'use client';

import { Suspense } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  FolderKanban,
  Crown,
  Play,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Headphones,
  ShoppingBag,
  Shield,
} from 'lucide-react';
import type { AtinaPublicSnapshot } from '@/lib/atina';
import type { AtinaDashboardLive } from '@/lib/atina-live-types';
import type { SessionUser } from '@/lib/auth-session';
import { isAdminRole } from '@/lib/auth-roles';
import { buildClientMetrics } from '@/lib/platform-metrics';
import { describeAtinaError } from '@/lib/atina-errors';
import { PlatformShell } from '@/components/platform/PlatformShell';
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { DeliverableQuotePanel } from '@/components/platform/DeliverableQuotePanel';
import { ClientOrdersPanel } from '@/components/platform/ClientOrdersPanel';
import { SupportMeetingPanel } from '@/components/platform/SupportMeetingPanel';
import { SalesMeetingPanel } from '@/components/platform/SalesMeetingPanel';
import { FileUploadPanel } from '@/components/platform/FileUploadPanel';
import { StatusPill } from '@/components/ui/StatusPill';

type Props = {
  snapshot: AtinaPublicSnapshot;
  live: AtinaDashboardLive | null;
  sessionUser: SessionUser | null;
  isDemo: boolean;
  unreadCount: number | null;
  unreadError?: string;
};

const taskStatus = {
  running: { label: 'In progress', color: 'text-cyan-400', icon: Play },
  queued: { label: 'Queued', color: 'text-amber-400', icon: Clock },
  done: { label: 'Completed', color: 'text-emerald-400', icon: CheckCircle2 },
};

export default function DashboardClient({
  snapshot,
  live,
  sessionUser,
  isDemo,
  unreadCount,
  unreadError,
}: Props) {
  const isAdmin = sessionUser ? isAdminRole(sessionUser.role) : false;
  const metrics = buildClientMetrics(snapshot, live, { authenticated: !isDemo && Boolean(sessionUser) });
  const status =
    live?.me || live?.tasks.length ? 'live' : snapshot.source === 'live' ? 'live' : snapshot.source;
  const firstName = sessionUser?.name?.split(' ')[0] ?? 'there';
  const greeting = `Welcome, ${firstName}`;

  return (
    <PlatformShell
      variant="client"
      title={greeting}
      subtitle={
        isDemo
          ? 'Demo preview — sign in to place real orders, get support, and track delivery status.'
          : 'Your client portal — track projects, orders, and communication with our team.'
      }
      badge={<StatusPill status={status} />}
      sessionUser={sessionUser}
      isDemo={isDemo}
    >
      {isDemo && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-medium text-amber-200">Demo mode</p>
          <p className="mt-1">
            For real orders, support, and video consultations{' '}
            <Link href="/login" className="font-medium text-white underline-offset-2 hover:underline">
              sign in
            </Link>
            .
          </p>
        </div>
      )}

      {isAdmin && !isDemo && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-500/25 bg-violet-500/10 px-4 py-3 text-sm">
          <p className="flex items-center gap-2 text-violet-100">
            <Shield className="h-4 w-4 text-violet-300" />
            You have operator access — Autonomy and factory tools are in the{' '}
            <Link href="/admin" className="font-medium text-white underline-offset-2 hover:underline">
              admin console
            </Link>
            .
          </p>
        </div>
      )}

      {!isDemo && (live?.errors?.length || unreadError) ? (
        <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <p className="font-medium">Live data is partially unavailable</p>
          {live?.errors?.length ? (
            <ul className="mt-2 list-inside list-disc text-rose-300/90">
              {live.errors.map((e, i) => (
                <li key={i}>{describeAtinaError(e)}</li>
              ))}
            </ul>
          ) : null}
          {unreadError ? <p className="mt-2 text-rose-300/90">{unreadError}</p> : null}
          <p className="mt-2 text-xs text-rose-300/80">
            Use the web app at <strong>http://localhost:3010</strong> and ensure the API is running on port{' '}
            <strong>3000</strong> (<code className="text-rose-200">.\scripts\ensure-dev-stack.ps1</code>).
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active projects"
          value={metrics.projectsActive}
          sub={metrics.projectsActive === '0' ? 'None active' : undefined}
          icon={FolderKanban}
          accent="emerald"
          delay={0}
        />
        <StatCard
          label="Automations"
          value={metrics.automationsRun}
          sub="last 30 days"
          icon={ShoppingBag}
          accent="cyan"
          delay={0.05}
        />
        <StatCard
          label="Notifications"
          value={unreadCount !== null ? String(unreadCount) : metrics.notifications.length > 0 ? String(metrics.notifications.filter((n) => !n.read).length) : '0'}
          sub="unread"
          icon={Headphones}
          accent="violet"
          delay={0.1}
        />
        <StatCard
          label="Your plan"
          value={metrics.planName}
          icon={Crown}
          accent="rose"
          delay={0.15}
        />
      </div>

      <section id="orders" className="mt-6">
        <GlassCard delay={0.18}>
          <h2 className="font-display text-lg font-semibold text-white">Your orders</h2>
          <p className="mt-2 text-sm text-slate-400">
            Custom software — each order is fully isolated, built from scratch, and tested before delivery.
          </p>
          <div className="mt-4">
            <ClientOrdersPanel disabled={isDemo || !sessionUser} />
          </div>
        </GlassCard>
      </section>

      <section id="documents" className="mt-6">
        <GlassCard delay={0.2}>
          <h2 className="font-display text-lg font-semibold text-white">Documents</h2>
          <p className="mt-2 text-sm text-slate-400">
            Upload briefs, contracts, or reference files for your project team.
          </p>
          <div className="mt-4">
            <FileUploadPanel disabled={isDemo || !sessionUser} />
          </div>
        </GlassCard>
      </section>

      <section id="projects" className="mt-6">
        <GlassCard delay={0.22}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-white">Project status</h2>
            <Link href="/contact" className="btn-ghost flex items-center gap-1 text-emerald-300">
              New request <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {metrics.tasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
              <p className="text-sm text-slate-400">
                {isDemo
                  ? 'No active projects in demo mode.'
                  : 'No active projects — book a consultation or submit a new delivery request.'}
              </p>
              <Link href="/pricing" className="btn-primary mt-4 inline-block text-sm">
                View pricing
              </Link>
            </div>
          ) : (
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
                    className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
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
                        transition={{ duration: 1, delay: 0.2 }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </section>

      <section id="quote" className="mt-6">
        <GlassCard delay={0.28}>
          <h2 className="font-display text-lg font-semibold text-white">New order</h2>
          <p className="mt-2 text-sm text-slate-400">
            Choose a deliverable — pricing is transparent (market, resources, payment method). You pay for what
            you receive, not platform access.
          </p>
          {sessionUser && !isDemo ? (
            <Suspense fallback={<p className="mt-4 text-sm text-slate-500">Loading calculator…</p>}>
              <DeliverableQuotePanel />
            </Suspense>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              <Link href="/login?next=/dashboard%23quote" className="text-violet-300 underline">
                Sign in
              </Link>{' '}
              to create an order and pay via bank transfer.
            </p>
          )}
          <Link href="/pricing" className="btn-glass mt-6 inline-block text-sm">
            Full deliverable pricing
          </Link>
        </GlassCard>
      </section>

      <section id="support" className="mt-6">
        <GlassCard delay={0.32}>
          <h2 className="font-display text-lg font-semibold text-white">Support</h2>
          <p className="mt-2 text-sm text-slate-400">
            AI assistant or live call with our team — response within your plan&apos;s support window.
          </p>
          {sessionUser && !isDemo ? (
            <SupportMeetingPanel />
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/contact" className="btn-primary text-sm">
                Contact us
              </Link>
              <Link href="/login" className="btn-glass text-sm">
                Sign in for video support
              </Link>
            </div>
          )}
        </GlassCard>
      </section>

      <section id="consultation" className="mt-6">
        <GlassCard delay={0.36}>
          <h2 className="font-display text-lg font-semibold text-white">Consultations & sales</h2>
          <p className="mt-2 text-sm text-slate-400">
            Book a call with our sales team — we&apos;ll define scope, timelines, and the right delivery package.
          </p>
          {sessionUser && !isDemo ? (
            <SalesMeetingPanel />
          ) : (
            <Link href="/login" className="btn-glass mt-4 inline-block text-sm">
              Sign in to schedule a meeting
            </Link>
          )}
        </GlassCard>
      </section>

      <section id="account" className="mt-6">
        <GlassCard delay={0.4}>
          <h2 className="font-display text-lg font-semibold text-white">Your account</h2>
          {sessionUser ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="text-slate-500">Name:</dt>
                <dd className="text-white">{sessionUser.name}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-slate-500">Email:</dt>
                <dd className="text-white">{sessionUser.email}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-slate-500">Plan:</dt>
                <dd className="text-violet-300">{metrics.planName}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-slate-400">You are not signed in.</p>
          )}
          {!isDemo && unreadError && (
            <p className="mt-3 text-xs text-slate-500">{unreadError}</p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/pricing" className="btn-glass text-sm">
              Pricing
            </Link>
            <Link href="/contact" className="btn-primary text-sm">
              Contact
            </Link>
          </div>
        </GlassCard>
      </section>
    </PlatformShell>
  );
}

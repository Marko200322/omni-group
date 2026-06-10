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
import { PlatformShell } from '@/components/platform/PlatformShell';
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { DeliverableQuotePanel } from '@/components/platform/DeliverableQuotePanel';
import { ClientOrdersPanel } from '@/components/platform/ClientOrdersPanel';
import { SupportMeetingPanel } from '@/components/platform/SupportMeetingPanel';
import { SalesMeetingPanel } from '@/components/platform/SalesMeetingPanel';
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
  const isAdmin = sessionUser ? isAdminRole(sessionUser.role) : false;
  const metrics = buildClientMetrics(snapshot, live, { authenticated: !isDemo && Boolean(sessionUser) });
  const status =
    live?.me || live?.tasks.length ? 'live' : snapshot.source === 'live' ? 'live' : snapshot.source;
  const firstName = sessionUser?.name?.split(' ')[0] ?? 'klijent';
  const greeting = `Dobrodošli, ${firstName}`;

  return (
    <PlatformShell
      variant="client"
      title={greeting}
      subtitle={
        isDemo
          ? 'Demo pregled — prijavite se za pravu porudžbinu, podršku i status isporuke.'
          : 'Vaš klijentski portal — pratite projekte, porudžbine i komunikaciju sa timom.'
      }
      badge={<StatusPill status={status} />}
      sessionUser={sessionUser}
      isDemo={isDemo}
    >
      {isDemo && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-medium text-amber-200">Demo režim</p>
          <p className="mt-1">
            Za pravu porudžbinu, podršku i video konsultacije{' '}
            <Link href="/login" className="font-medium text-white underline-offset-2 hover:underline">
              prijavite se
            </Link>
            .
          </p>
        </div>
      )}

      {isAdmin && !isDemo && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-500/25 bg-violet-500/10 px-4 py-3 text-sm">
          <p className="flex items-center gap-2 text-violet-100">
            <Shield className="h-4 w-4 text-violet-300" />
            Imate operatorski pristup — Autonomy i fabrika su u{' '}
            <Link href="/admin" className="font-medium text-white underline-offset-2 hover:underline">
              admin konzoli
            </Link>
            .
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Aktivni projekti"
          value={metrics.projectsActive}
          sub={metrics.projectsActive === '0' ? 'Nema aktivnih' : undefined}
          icon={FolderKanban}
          accent="emerald"
          delay={0}
        />
        <StatCard
          label="Automatizacije"
          value={metrics.automationsRun}
          sub="poslednjih 30 dana"
          icon={ShoppingBag}
          accent="cyan"
          delay={0.05}
        />
        <StatCard
          label="Obaveštenja"
          value={unreadCount !== null ? String(unreadCount) : metrics.notifications.length > 0 ? String(metrics.notifications.filter((n) => !n.read).length) : '0'}
          sub="nepročitanih"
          icon={Headphones}
          accent="violet"
          delay={0.1}
        />
        <StatCard
          label="Vaš paket"
          value={metrics.planName}
          icon={Crown}
          accent="rose"
          delay={0.15}
        />
      </div>

      <section id="orders" className="mt-6">
        <GlassCard delay={0.18}>
          <h2 className="font-display text-lg font-semibold text-white">Vaše porudžbine</h2>
          <p className="mt-2 text-sm text-slate-400">
            Softver po meri — svaka porudžbina je potpuno izolovana, razvijena od nule i testirana pre isporuke.
          </p>
          <div className="mt-4">
            <ClientOrdersPanel disabled={isDemo || !sessionUser} />
          </div>
        </GlassCard>
      </section>

      <section id="projects" className="mt-6">
        <GlassCard delay={0.22}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-white">Status projekata</h2>
            <Link href="/contact" className="btn-ghost flex items-center gap-1 text-emerald-300">
              Novi zahtev <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {metrics.tasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
              <p className="text-sm text-slate-400">
                {isDemo
                  ? 'U demo režimu nema aktivnih projekata.'
                  : 'Nema aktivnih projekata — zakažite konsultaciju ili pošaljite zahtev za novu isporuku.'}
              </p>
              <Link href="/pricing" className="btn-primary mt-4 inline-block text-sm">
                Pogledajte ponudu
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
          <h2 className="font-display text-lg font-semibold text-white">Nova porudžbina</h2>
          <p className="mt-2 text-sm text-slate-400">
            Izaberite isporuku — cena se računa transparentno (tržište, resursi, način plaćanja). Plaćate ono što
            dobijete, ne pristup platformi.
          </p>
          {sessionUser && !isDemo ? (
            <Suspense fallback={<p className="mt-4 text-sm text-slate-500">Učitavam kalkulator…</p>}>
              <DeliverableQuotePanel />
            </Suspense>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              <Link href="/login?next=/dashboard%23quote" className="text-violet-300 underline">
                Prijavite se
              </Link>{' '}
              da kreirate porudžbinu i uplatite preko banke.
            </p>
          )}
          <Link href="/pricing" className="btn-glass mt-6 inline-block text-sm">
            Kompletan cenovnik isporuka
          </Link>
        </GlassCard>
      </section>

      <section id="support" className="mt-6">
        <GlassCard delay={0.32}>
          <h2 className="font-display text-lg font-semibold text-white">Podrška</h2>
          <p className="mt-2 text-sm text-slate-400">
            AI asistent ili live poziv sa članom našeg tima — odgovor u roku vašeg paketa podrške.
          </p>
          {sessionUser && !isDemo ? (
            <SupportMeetingPanel />
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/contact" className="btn-primary text-sm">
                Kontaktirajte nas
              </Link>
              <Link href="/login" className="btn-glass text-sm">
                Prijava za video podršku
              </Link>
            </div>
          )}
        </GlassCard>
      </section>

      <section id="consultation" className="mt-6">
        <GlassCard delay={0.36}>
          <h2 className="font-display text-lg font-semibold text-white">Konsultacije i prodaja</h2>
          <p className="mt-2 text-sm text-slate-400">
            Zakažite razgovor sa prodajnim timom — definisaćemo obim, rokove i paket isporuke za vašu firmu.
          </p>
          {sessionUser && !isDemo ? (
            <SalesMeetingPanel />
          ) : (
            <Link href="/login" className="btn-glass mt-4 inline-block text-sm">
              Prijava za zakazivanje sastanka
            </Link>
          )}
        </GlassCard>
      </section>

      <section id="account" className="mt-6">
        <GlassCard delay={0.4}>
          <h2 className="font-display text-lg font-semibold text-white">Vaš nalog</h2>
          {sessionUser ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="text-slate-500">Ime:</dt>
                <dd className="text-white">{sessionUser.name}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-slate-500">Email:</dt>
                <dd className="text-white">{sessionUser.email}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-slate-500">Paket:</dt>
                <dd className="text-violet-300">{metrics.planName}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Niste prijavljeni.</p>
          )}
          {!isDemo && unreadError && (
            <p className="mt-3 text-xs text-slate-500">{unreadError}</p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/pricing" className="btn-glass text-sm">
              Cenovnik
            </Link>
            <Link href="/contact" className="btn-primary text-sm">
              Kontakt
            </Link>
          </div>
        </GlassCard>
      </section>
    </PlatformShell>
  );
}

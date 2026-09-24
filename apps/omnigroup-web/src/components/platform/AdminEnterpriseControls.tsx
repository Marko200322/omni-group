'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'moderator' | 'user';
  is_active: boolean;
  plan_name?: string | null;
  plan_slug?: string | null;
};

type AdminPlan = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  is_popular?: boolean;
  price_monthly?: number | string;
};

type AdminModule = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  is_core?: boolean;
};

type OnboardingStatus = {
  summary?: {
    totalEvents?: number;
    successEvents?: number;
    failedEvents?: number;
    templatesBlocked?: number;
  };
};

type ApiResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  detail?: string;
  message?: string;
};

type Props = {
  disabled?: boolean;
  currentUserId?: string;
};

function errorMessage(body: ApiResult<unknown>, fallback: string): string {
  return body.detail ?? body.error ?? fallback;
}

export function AdminEnterpriseControls({ disabled, currentUserId }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [modules, setModules] = useState<AdminModule[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (disabled) return;
    setLoading(true);
    setError(null);
    try {
      const responses = await Promise.all([
        fetch('/api/atina/admin/users?limit=50', { cache: 'no-store' }),
        fetch('/api/atina/admin/plans', { cache: 'no-store' }),
        fetch('/api/atina/admin/modules', { cache: 'no-store' }),
        fetch('/api/atina/admin/onboarding-status?limit=1', { cache: 'no-store' }),
      ]);
      const [usersBody, plansBody, modulesBody, onboardingBody] = await Promise.all(
        responses.map((response) => response.json()),
      ) as [
        ApiResult<AdminUser[]>,
        ApiResult<AdminPlan[]>,
        ApiResult<AdminModule[]>,
        ApiResult<OnboardingStatus>,
      ];
      if (!usersBody.ok) throw new Error(errorMessage(usersBody, 'users_list_failed'));
      if (!plansBody.ok) throw new Error(errorMessage(plansBody, 'plans_list_failed'));
      if (!modulesBody.ok) throw new Error(errorMessage(modulesBody, 'modules_list_failed'));

      setUsers(usersBody.data ?? []);
      setPlans(plansBody.data ?? []);
      setModules(modulesBody.data ?? []);
      setOnboarding(onboardingBody.ok ? (onboardingBody.data ?? null) : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enterprise controls failed to load.');
    } finally {
      setLoading(false);
    }
  }, [disabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const patch = async <T extends { id: string }>(
    kind: 'users' | 'plans' | 'modules',
    entity: T,
    changes: Record<string, unknown>,
    description: string,
    apply: (item: T) => T,
    setItems: React.Dispatch<React.SetStateAction<T[]>>,
  ) => {
    if (!window.confirm(`Confirm ${description}? This changes live access or catalog configuration.`)) return;
    const key = `${kind}:${entity.id}`;
    setBusyKey(key);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/atina/admin/${kind}/${encodeURIComponent(entity.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      const body = (await response.json()) as ApiResult<T>;
      if (!response.ok || !body.ok) throw new Error(errorMessage(body, `${kind}_update_failed`));
      setItems((items) => items.map((item) => (item.id === entity.id ? apply(item) : item)));
      setMessage(body.message ?? 'Change saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusyKey(null);
    }
  };

  const summary = onboarding?.summary;

  return (
    <GlassCard delay={0.19}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-cyan-500/15 p-2 text-cyan-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Enterprise controls</h2>
            <p className="mt-1 text-sm text-slate-400">
              Live identities, internal plans, modules, and onboarding health. Workspace roles are owner, admin,
              operator, member, and viewer — billing and CRM writes follow those permissions.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={disabled || loading || busyKey !== null}
          className="btn-ghost flex items-center gap-1 text-violet-300 disabled:opacity-50"
          onClick={() => void refresh()}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      {disabled ? (
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          Sign in with a non-demo admin account to manage enterprise controls.
        </p>
      ) : null}

      {!disabled && summary ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {[
            ['Onboarding events', summary.totalEvents ?? 0],
            ['Successful', summary.successEvents ?? 0],
            ['Failed', summary.failedEvents ?? 0],
            ['Blocked templates', summary.templatesBlocked ?? 0],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 text-xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {!disabled && (
        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Users</h3>
            <div className="mt-2 max-h-96 space-y-2 overflow-y-auto pr-1">
              {users.map((user) => {
                const key = `users:${user.id}`;
                const isSelf = user.id === currentUserId;
                return (
                  <div key={user.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{user.name}</p>
                        <p className="truncate text-xs text-slate-500">{user.email}</p>
                        <p className="mt-1 text-xs text-cyan-300">{user.plan_name ?? 'No plan'}</p>
                      </div>
                      {busyKey === key ? <Loader2 className="h-4 w-4 animate-spin text-violet-300" /> : null}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <select
                        aria-label={`Role for ${user.email}`}
                        value={user.role}
                        disabled={busyKey !== null || isSelf}
                        className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white disabled:opacity-50"
                        onChange={(event) => {
                          const role = event.target.value as AdminUser['role'];
                          void patch('users', user, { role }, `changing ${user.email} role to ${role}`, (item) => ({ ...item, role }), setUsers);
                        }}
                      >
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                      <select
                        aria-label={`Plan for ${user.email}`}
                        value={plans.find((plan) => plan.slug === user.plan_slug)?.id ?? ''}
                        disabled={busyKey !== null}
                        className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white disabled:opacity-50"
                        onChange={(event) => {
                          const planId = event.target.value || null;
                          const selected = plans.find((plan) => plan.id === planId);
                          void patch(
                            'users',
                            user,
                            { planId },
                            `assigning ${user.email} to ${selected?.name ?? 'no plan'}`,
                            (item) => ({ ...item, plan_name: selected?.name ?? null, plan_slug: selected?.slug ?? null }),
                            setUsers,
                          );
                        }}
                      >
                        <option value="">No plan</option>
                        {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                      </select>
                    </div>
                    <button
                      type="button"
                      disabled={busyKey !== null || isSelf}
                      className={`mt-2 w-full rounded-lg border px-2 py-1.5 text-xs disabled:opacity-50 ${
                        user.is_active
                          ? 'border-rose-500/30 text-rose-200'
                          : 'border-emerald-500/30 text-emerald-200'
                      }`}
                      onClick={() => void patch(
                        'users',
                        user,
                        { isActive: !user.is_active },
                        `${user.is_active ? 'deactivating' : 'activating'} ${user.email}`,
                        (item) => ({ ...item, is_active: !item.is_active }),
                        setUsers,
                      )}
                    >
                      {isSelf ? 'Current operator' : user.is_active ? 'Deactivate user' : 'Activate user'}
                    </button>
                  </div>
                );
              })}
              {!loading && users.length === 0 ? <p className="text-sm text-slate-500">No users returned.</p> : null}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Plans</h3>
            <div className="mt-2 max-h-96 space-y-2 overflow-y-auto pr-1">
              {plans.map((plan) => {
                const key = `plans:${plan.id}`;
                return (
                  <div key={plan.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-white">{plan.name}</p>
                        <p className="text-xs text-slate-500">{plan.slug} · {String(plan.price_monthly ?? '—')}/mo</p>
                      </div>
                      {busyKey === key ? <Loader2 className="h-4 w-4 animate-spin text-violet-300" /> : null}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={busyKey !== null}
                        className="rounded-lg border border-white/10 px-2 py-1.5 text-xs text-slate-200 disabled:opacity-50"
                        onClick={() => void patch(
                          'plans',
                          plan,
                          { is_active: !plan.is_active },
                          `${plan.is_active ? 'disabling' : 'enabling'} plan ${plan.name}`,
                          (item) => ({ ...item, is_active: !item.is_active }),
                          setPlans,
                        )}
                      >
                        {plan.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        disabled={busyKey !== null}
                        className="rounded-lg border border-white/10 px-2 py-1.5 text-xs text-slate-200 disabled:opacity-50"
                        onClick={() => void patch(
                          'plans',
                          plan,
                          { is_popular: !Boolean(plan.is_popular) },
                          `${plan.is_popular ? 'removing' : 'adding'} popular status for ${plan.name}`,
                          (item) => ({ ...item, is_popular: !Boolean(item.is_popular) }),
                          setPlans,
                        )}
                      >
                        {plan.is_popular ? 'Unmark popular' : 'Mark popular'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Modules</h3>
            <div className="mt-2 max-h-96 space-y-2 overflow-y-auto pr-1">
              {modules.map((module) => {
                const key = `modules:${module.id}`;
                return (
                  <div key={module.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{module.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {module.slug}{module.is_core ? ' · core' : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyKey !== null || module.is_core}
                      className="rounded-lg border border-white/10 px-2 py-1.5 text-xs text-slate-200 disabled:opacity-50"
                      onClick={() => void patch(
                        'modules',
                        module,
                        { isActive: !module.is_active },
                        `${module.is_active ? 'disabling' : 'enabling'} module ${module.name}`,
                        (item) => ({ ...item, is_active: !item.is_active }),
                        setModules,
                      )}
                    >
                      {busyKey === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : module.is_core ? 'Core' : module.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {message ? <p className="mt-4 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
    </GlassCard>
  );
}

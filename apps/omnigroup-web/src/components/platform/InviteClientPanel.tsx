'use client';

import { useState } from 'react';
import { Copy, ExternalLink, Loader2, UserPlus } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import type { AtinaInviteClientResult } from '@/lib/atina-live-types';
import type { AtinaPublicSnapshot } from '@/lib/atina';

type Props = {
  disabled?: boolean;
  plans?: AtinaPublicSnapshot['plans'];
};

export function InviteClientPanel({ disabled, plans = [] }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [planSlug, setPlanSlug] = useState('starter');
  const [customPassword, setCustomPassword] = useState('');
  const [useCustomPassword, setUseCustomPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AtinaInviteClientResult | null>(null);
  const [copied, setCopied] = useState(false);

  const planOptions = plans.length
    ? plans.map((p) => ({ slug: p.slug ?? 'starter', name: p.name ?? p.slug ?? 'Plan' }))
    : [{ slug: 'starter', name: 'Starter' }];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    setCopied(false);

    const payload: Record<string, string | boolean> = {
      name: name.trim(),
      email: email.trim(),
      planSlug,
    };
    if (company.trim()) payload.company = company.trim();
    if (useCustomPassword && customPassword.trim()) payload.password = customPassword;

    try {
      const res = await fetch('/api/atina/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as {
        ok: boolean;
        data?: AtinaInviteClientResult;
        detail?: string;
        error?: string;
      };
      if (!body.ok || !body.data) {
        throw new Error(body.detail ?? body.error ?? 'invite_failed');
      }
      setResult(body.data);
      setName('');
      setEmail('');
      setCompany('');
      setCustomPassword('');
      setUseCustomPassword(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setBusy(false);
    }
  };

  const copyCredentials = async () => {
    if (!result) return;
    const lines = [
      `Login: ${result.loginUrl}`,
      `Email: ${result.email}`,
      ...(result.temporaryPassword ? [`Temporary password: ${result.temporaryPassword}`] : []),
      `Plan: ${result.planSlug}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <GlassCard delay={0.18}>
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-xl bg-violet-500/15 p-2 text-violet-300">
          <UserPlus className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Invite client</h2>
          <p className="mt-1 text-sm text-slate-400">
            Create a client dashboard account. Share the login link and password securely — each client has their own credentials.
          </p>
        </div>
      </div>

      {disabled && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          Sign in with an admin account (not demo) to invite clients.
        </p>
      )}

      {!disabled && (
        <form className="space-y-3" onSubmit={(e) => void submit(e)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-slate-400">
              Full name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-violet-500/50"
                placeholder="Ana Petrović"
              />
            </label>
            <label className="block text-sm text-slate-400">
              Email
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-violet-500/50"
                placeholder="client@company.com"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-slate-400">
              Company (optional)
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={busy}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-violet-500/50"
              />
            </label>
            <label className="block text-sm text-slate-400">
              Initial plan
              <select
                value={planSlug}
                onChange={(e) => setPlanSlug(e.target.value)}
                disabled={busy}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-violet-500/50"
              >
                {planOptions.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={useCustomPassword}
              onChange={(e) => setUseCustomPassword(e.target.checked)}
              disabled={busy}
              className="rounded border-white/20"
            />
            Set password manually (otherwise a secure temporary password is generated)
          </label>

          {useCustomPassword && (
            <label className="block text-sm text-slate-400">
              Password
              <input
                type="password"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                disabled={busy}
                minLength={8}
                required={useCustomPassword}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-violet-500/50"
                placeholder="Min 8 chars, upper + lower + number"
              />
            </label>
          )}

          {error && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account…
              </span>
            ) : (
              'Create client account'
            )}
          </button>
        </form>
      )}

      {result && (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-50">
          <p className="font-semibold text-white">Account created — {result.name}</p>
          <ul className="mt-2 space-y-1 font-mono text-xs text-emerald-100/90">
            <li>
              Login:{' '}
              <a
                href={result.loginUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-emerald-200 underline underline-offset-2 hover:text-white"
              >
                {result.loginUrl}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </li>
            <li>Email: {result.email}</li>
            {result.temporaryPassword && <li>Temporary password: {result.temporaryPassword}</li>}
            <li>Plan: {result.planSlug}</li>
          </ul>
          <p className="mt-2 text-xs text-emerald-200/80">
            The client signs in at /login with this email and password, then lands on their dashboard.
          </p>
          <button
            type="button"
            onClick={() => void copyCredentials()}
            className="btn-ghost mt-3 inline-flex items-center gap-1 text-emerald-200"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? 'Copied' : 'Copy credentials'}
          </button>
        </div>
      )}
    </GlassCard>
  );
}

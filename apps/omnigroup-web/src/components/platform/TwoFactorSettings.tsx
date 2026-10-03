'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react';
import { csrfFetch } from '@/lib/csrf-fetch';

type Status = { enabled: boolean; pending: boolean; demo: boolean };

export function TwoFactorSettings({ isDemo }: { isDemo: boolean }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  async function loadStatus() {
    const res = await csrfFetch('/api/auth/2fa/status', { cache: 'no-store' });
    const data = (await res.json()) as {
      ok?: boolean;
      enabled?: boolean;
      pending?: boolean;
      demo?: boolean;
      error?: string;
    };
    if (!res.ok || data.ok === false) {
      setError(data.error ?? 'Unable to load two-factor status.');
      return;
    }
    setStatus({
      enabled: data.enabled === true,
      pending: data.pending === true,
      demo: data.demo === true,
    });
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function startSetup() {
    setBusy(true);
    setError('');
    setBackupCodes([]);
    try {
      const res = await csrfFetch('/api/auth/2fa/setup', { method: 'POST' });
      const data = (await res.json()) as {
        ok?: boolean;
        secret?: string;
        otpauthUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.secret || !data.otpauthUrl) {
        setError(data.error ?? 'Could not start two-factor setup.');
        return;
      }
      setSecret(data.secret);
      setOtpauthUrl(data.otpauthUrl);
      setStatus((prev) => (prev ? { ...prev, pending: true } : { enabled: false, pending: true, demo: false }));
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await csrfFetch('/api/auth/2fa/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: confirmCode }),
      });
      const data = (await res.json()) as { ok?: boolean; backupCodes?: string[]; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'That code was not accepted. Try a new code from the app.');
        return;
      }
      setBackupCodes(Array.isArray(data.backupCodes) ? data.backupCodes : []);
      setSecret('');
      setOtpauthUrl('');
      setConfirmCode('');
      setStatus({ enabled: true, pending: false, demo: false });
    } finally {
      setBusy(false);
    }
  }

  async function disable(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await csrfFetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword, code: disableCode }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Could not disable two-factor authentication.');
        return;
      }
      setDisablePassword('');
      setDisableCode('');
      setBackupCodes([]);
      setStatus({ enabled: false, pending: false, demo: false });
    } finally {
      setBusy(false);
    }
  }

  async function copyBackup() {
    if (!backupCodes.length) return;
    await navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (isDemo || status?.demo) {
    return (
      <div className="mt-8 border-t border-white/10 pt-6">
        <h3 className="font-display text-base font-semibold text-white">Two-factor authentication</h3>
        <p className="mt-2 text-sm text-slate-400">
          Sign in with a live client account to enable authenticator protection for your workspace.
        </p>
      </div>
    );
  }

  const qrSrc = otpauthUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpauthUrl)}`
    : '';

  return (
    <div className="mt-8 border-t border-white/10 pt-6">
      <div className="flex items-start gap-3">
        {status?.enabled ? (
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
        ) : (
          <ShieldOff className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
        )}
        <div>
          <h3 className="font-display text-base font-semibold text-white">Two-factor authentication</h3>
          <p className="mt-1 text-sm text-slate-400">
            Protect client data with a 6-digit code from Google Authenticator, 1Password, or Authy. Optional, and
            recommended for every workspace.
          </p>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

      {status?.enabled && !backupCodes.length ? (
        <form className="mt-4 space-y-3" onSubmit={(e) => void disable(e)}>
          <p className="text-sm text-emerald-300">Authenticator is on. Sign-in now requires a code after your password.</p>
          <input
            type="password"
            required
            disabled={busy}
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            placeholder="Current password"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500/50"
          />
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            disabled={busy}
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)}
            placeholder="Authenticator or backup code"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500/50"
          />
          <button type="submit" disabled={busy} className="btn-glass text-sm disabled:opacity-60">
            {busy ? 'Turning off…' : 'Turn off 2FA'}
          </button>
        </form>
      ) : null}

      {backupCodes.length ? (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-100">Save these backup codes now. Each works once.</p>
          <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm text-white">
            {backupCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
          <button type="button" className="btn-glass mt-4 inline-flex items-center gap-2 text-sm" onClick={() => void copyBackup()}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy codes'}
          </button>
        </div>
      ) : null}

      {!status?.enabled ? (
        <div className="mt-4 space-y-4">
          {!otpauthUrl ? (
            <button type="button" disabled={busy} className="btn-primary text-sm disabled:opacity-60" onClick={() => void startSetup()}>
              {busy ? 'Preparing…' : 'Enable authenticator'}
            </button>
          ) : (
            <>
              <div className="flex flex-wrap items-start gap-4">
                {qrSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrSrc}
                    alt="QR code to add Omni Group Tech to your authenticator app"
                    width={180}
                    height={180}
                    className="rounded-xl bg-white p-2"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-300">Scan the QR, or enter this key manually:</p>
                  <p className="mt-2 break-all font-mono text-sm text-violet-200">{secret}</p>
                </div>
              </div>
              <form className="space-y-3" onSubmit={(e) => void confirmSetup(e)}>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  disabled={busy}
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  placeholder="6-digit code"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500/50"
                />
                <button type="submit" disabled={busy} className="btn-primary text-sm disabled:opacity-60">
                  {busy ? 'Verifying…' : 'Confirm and enable'}
                </button>
              </form>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

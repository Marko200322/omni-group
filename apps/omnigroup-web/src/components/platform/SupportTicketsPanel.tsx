'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { csrfFetch } from '@/lib/csrf-fetch';
import { LifeBuoy } from 'lucide-react';

type TicketRow = {
  id: string;
  subject: string;
  description?: string | null;
  status?: string | null;
  category?: string | null;
  createdAt?: string | null;
};

function unwrapTickets(payload: unknown): TicketRow[] {
  if (Array.isArray(payload)) return payload as TicketRow[];
  if (payload && typeof payload === 'object') {
    const root = payload as { data?: TicketRow[] | { data?: TicketRow[] }; tickets?: TicketRow[] };
    if (Array.isArray(root.tickets)) return root.tickets;
    if (Array.isArray(root.data)) return root.data;
    if (root.data && Array.isArray(root.data.data)) return root.data.data;
  }
  return [];
}

export function SupportTicketsPanel() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/atina/support/tickets?limit=20&page=1', { cache: 'no-store' });
      const json = (await res.json()) as { ok?: boolean; data?: unknown; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'tickets_failed');
        return;
      }
      setTickets(unwrapTickets(json.data));
    } catch {
      setError('network_error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || busy) return;
    setBusy(true);
    try {
      const res = await csrfFetch('/api/atina/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim(), category: 'general' }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'create_failed');
        return;
      }
      setSubject('');
      setMessage('');
      await reload();
    } catch {
      setError('network_error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-emerald-500/15 p-2 text-emerald-300">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Support tickets</h3>
            <p className="mt-1 text-xs text-slate-400">
              Kickoff and help tickets from your packages — same queue the AI support solver uses.
            </p>
          </div>
        </div>
        {loading ? <p className="mt-3 text-xs text-slate-500">Loading tickets…</p> : null}
        {error ? <p className="mt-3 text-xs text-rose-300">Could not load tickets ({error}).</p> : null}
        <ul className="mt-3 space-y-2">
          {tickets.map((t) => (
            <li key={t.id} className="rounded-lg border border-white/10 px-3 py-2 text-sm">
              <p className="font-medium text-white">{t.subject}</p>
              <p className="text-xs text-slate-500">
                {t.status ?? 'open'}
                {t.category ? ` · ${t.category}` : ''}
              </p>
            </li>
          ))}
          {!loading && tickets.length === 0 ? (
            <li className="text-xs text-slate-500">No tickets yet. Open one below or after a package kickoff.</li>
          ) : null}
        </ul>
      </div>

      <form onSubmit={onCreate} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <p className="text-sm font-medium text-white">Open a ticket</p>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          required
          minLength={3}
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What do you need help with?"
          className="min-h-[88px] w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          required
          minLength={3}
        />
        <button type="submit" disabled={busy} className="btn-primary text-sm disabled:opacity-50">
          {busy ? 'Sending…' : 'Create ticket'}
        </button>
      </form>
    </div>
  );
}

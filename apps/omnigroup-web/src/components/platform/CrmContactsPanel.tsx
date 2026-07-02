'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, UserPlus, Users } from 'lucide-react';

type ContactRow = {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  company?: string;
  status?: string;
  source?: string;
  created_at?: string;
};

type CrmStats = {
  total?: number;
  byStatus?: Record<string, number>;
};

function contactName(row: ContactRow): string {
  const parts = [row.first_name, row.last_name].filter(Boolean);
  return parts.length ? parts.join(' ') : row.email ?? 'Contact';
}

type Props = {
  disabled?: boolean;
};

export function CrmContactsPanel({ disabled }: Props) {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [stats, setStats] = useState<CrmStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');

  const load = useCallback(async () => {
    if (disabled) return;
    setLoading(true);
    setError(null);
    try {
      const [listRes, statsRes] = await Promise.all([
        fetch('/api/atina/crm/contacts?limit=8'),
        fetch('/api/atina/crm/stats'),
      ]);
      const listJson = (await listRes.json()) as { ok?: boolean; data?: ContactRow[]; detail?: string };
      const statsJson = (await statsRes.json()) as { ok?: boolean; data?: CrmStats; detail?: string };
      if (!listRes.ok || !listJson.ok) {
        throw new Error(listJson.detail ?? 'crm_list_failed');
      }
      setContacts(listJson.data ?? []);
      if (statsRes.ok && statsJson.ok) setStats(statsJson.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'crm_load_failed');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [disabled]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/atina/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          email: email.trim() || undefined,
          company: company.trim() || undefined,
          source: 'dashboard',
        }),
      });
      const json = (await res.json()) as { ok?: boolean; detail?: string };
      if (!res.ok || !json.ok) throw new Error(json.detail ?? 'crm_create_failed');
      setFirstName('');
      setLastName('');
      setEmail('');
      setCompany('');
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'crm_create_failed');
    } finally {
      setSaving(false);
    }
  }

  if (disabled) {
    return <p className="text-sm text-slate-500">Sign in to view CRM contacts.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Users className="h-4 w-4 text-violet-400" />
          {stats?.total != null ? (
            <span>
              <span className="text-white">{stats.total}</span> contacts
              {stats.byStatus?.lead != null ? (
                <span className="text-slate-500"> · {stats.byStatus.lead} leads</span>
              ) : null}
            </span>
          ) : (
            <span>CRM contacts</span>
          )}
        </div>
        <button
          type="button"
          className="btn-glass flex items-center gap-1 text-xs"
          onClick={() => setShowForm((v) => !v)}
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add contact
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-4 sm:grid-cols-2">
          <input
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
          <button type="submit" className="btn-primary text-sm sm:col-span-2" disabled={saving}>
            {saving ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : null}
            Save contact
          </button>
        </form>
      )}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading contacts…
        </p>
      ) : error ? (
        <p className="text-sm text-amber-400/90">
          CRM unavailable ({error}). Pro plan required or API offline.
        </p>
      ) : contacts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-slate-500">
          No contacts yet — website leads appear here after contact form + CRM ingress is configured.
        </p>
      ) : (
        <ul className="divide-y divide-white/5 rounded-xl border border-white/5 bg-white/[0.02]">
          {contacts.map((c) => (
            <li key={c.id ?? `${c.email}-${c.created_at}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-white">{contactName(c)}</p>
                <p className="text-xs text-slate-500">
                  {[c.email, c.company].filter(Boolean).join(' · ') || c.source || '—'}
                </p>
              </div>
              <span className="rounded-full border border-violet-500/30 px-2 py-0.5 text-xs capitalize text-violet-200">
                {c.status ?? 'lead'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

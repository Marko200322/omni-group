'use client';
import { csrfFetch } from '@/lib/csrf-fetch';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Video, Calendar } from 'lucide-react';
import { ConversationalAvatarPanel } from '@/components/platform/ConversationalAvatarPanel';
import { LiveCallPanel } from '@/components/platform/LiveCallPanel';

type MeetingMethod = {
  id: string;
  label: string;
  description: string;
  available: boolean;
};

type MeetingRow = {
  id: string;
  topic: string;
  status: string;
  provider: string;
  meeting_url?: string | null;
  scheduled_at?: string | null;
};

function providerLabel(id: string) {
  if (id === 'zoom') return 'Zoom';
  if (id === 'google_meet') return 'Google Meet';
  return 'Manual';
}

function statusLabel(status: string) {
  if (status === 'scheduled') return 'Scheduled';
  if (status === 'completed') return 'Completed';
  if (status === 'canceled') return 'Canceled';
  return 'Pending';
}

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
}

type FaqRow = { q: string; a: string };

function extractFaqs(payload: unknown): FaqRow[] {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { local?: unknown }).local)
      ? ((payload as { local: unknown[] }).local)
      : [];
  const faqs: FaqRow[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const raw = (row as { context?: unknown }).context;
    let value: unknown = raw;
    if (typeof raw === 'string') {
      try {
        value = JSON.parse(raw);
      } catch {
        value = null;
      }
    }
    const list = value && typeof value === 'object' ? (value as { faqs?: unknown }).faqs : null;
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const q = String((item as { q?: unknown }).q ?? '').trim();
      const a = String((item as { a?: unknown }).a ?? '').trim();
      if (q && a) faqs.push({ q, a });
    }
  }
  return faqs.slice(0, 8);
}

function SupportKnowledgePanel({ disabled }: { disabled?: boolean }) {
  const [faqs, setFaqs] = useState<FaqRow[]>([]);
  const [state, setState] = useState<'loading' | 'empty' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (disabled) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/atina/support/knowledge');
        const json = (await res.json()) as { ok?: boolean; data?: unknown };
        if (cancelled) return;
        if (!res.ok || !json.ok) {
          setState('empty');
          return;
        }
        const items = extractFaqs(json.data);
        setFaqs(items);
        setState(items.length ? 'ready' : 'empty');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [disabled]);

  return (
    <div className="border-b border-white/5 pb-6">
      <h3 className="font-display text-base font-semibold text-white">Support knowledge base</h3>
      <p className="mt-1 text-sm text-slate-500">
        Answers seeded by the AI support retainer. This page reads them back — a PDF download is not the assistant.
      </p>
      {state === 'loading' ? <p className="mt-3 text-sm text-slate-500">Loading knowledge base…</p> : null}
      {state === 'error' ? (
        <p className="mt-3 text-sm text-slate-500">Knowledge base is unavailable right now. Tickets in Tasks still work.</p>
      ) : null}
      {state === 'empty' ? (
        <p className="mt-3 text-sm text-slate-500">
          No support knowledge base on this account yet. The AI support retainer seeds it here. Priority and dedicated
          support still use the ticket queue.
        </p>
      ) : null}
      {state === 'ready' ? (
        <ul className="mt-4 space-y-3">
          {faqs.map((faq) => (
            <li key={faq.q} className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-sm font-medium text-white">{faq.q}</p>
              <p className="mt-1 text-sm text-slate-400">{faq.a}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

type Props = {
  disabled?: boolean;
};

export function SupportMeetingPanel({ disabled }: Props) {
  const [methods, setMethods] = useState<MeetingMethod[]>([]);
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState('manual');
  const [hostType, setHostType] = useState<'human' | 'ai_avatar'>('human');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadMeetings = useCallback(async () => {
    try {
      const res = await fetch('/api/atina/video-meetings/support/mine');
      const json = (await res.json()) as { ok?: boolean; data?: MeetingRow[] };
      if (json.ok && Array.isArray(json.data)) setMeetings(json.data);
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const methodsRes = await fetch('/api/atina/video-meetings/support/methods');
        const methodsJson = (await methodsRes.json()) as { ok?: boolean; data?: { methods?: MeetingMethod[] } };
        if (cancelled) return;
        if (methodsJson.ok && methodsJson.data?.methods) {
          const list = methodsJson.data.methods.filter((m) => m.available);
          setMethods(list);
          if (list.length > 0) setProvider(list[0].id);
        }
      } catch {
        if (!cancelled) setError('Could not load support options.');
      }
    })();
    void loadMeetings();
    return () => {
      cancelled = true;
    };
  }, [loadMeetings]);

  const bookMeeting = useCallback(async () => {
    if (topic.trim().length < 3) {
      setError('Topic must be at least 3 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await csrfFetch('/api/atina/video-meetings/support/book', { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          description: description.trim() || undefined,
          provider: hostType === 'ai_avatar' && provider === 'manual' ? 'zoom' : provider,
          hostType,
          agentId: hostType === 'ai_avatar' ? 'mila' : undefined,
          liveProvider: hostType === 'ai_avatar' ? 'auto' : undefined,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: MeetingRow;
        error?: string;
        detail?: string;
      };
      if (!res.ok || !json.ok) {
        const human = json.detail && /\s/.test(json.detail) ? json.detail : null;
        throw new Error(human ?? 'We couldn\u2019t schedule your call right now. Please try again shortly.');
      }
      setSuccess(
        json.data?.status === 'scheduled' && json.data.meeting_url
          ? 'Call scheduled — check your email for the link.'
          : 'Request sent — support will confirm the time and send a link.',
      );
      setTopic('');
      setDescription('');
      await loadMeetings();
    } catch (err) {
      setError(
        err instanceof Error && /\s/.test(err.message)
          ? err.message
          : 'We couldn\u2019t schedule your call right now. Please try again shortly.',
      );
    } finally {
      setLoading(false);
    }
  }, [topic, description, provider, hostType, loadMeetings]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-8">
      <SupportKnowledgePanel disabled={disabled} />
      <LiveCallPanel disabled={disabled} agentType="support" />
      <ConversationalAvatarPanel agentType="support" disabled={disabled} />

      <motion.div className="border-t border-white/5 pt-6">
        <h3 className="font-display text-base font-semibold text-white">Schedule a live call with our team</h3>
        <p className="mt-1 text-sm text-slate-500">Zoom, Google Meet, or manual scheduling — alongside the AI avatar.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">Call topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Help with API integration"
              disabled={disabled || loading}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Briefly describe the issue..."
              disabled={disabled || loading}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            {methods.length > 0 && (
              <>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">Host</label>
                <select
                  value={hostType}
                  onChange={(e) => setHostType(e.target.value as 'human' | 'ai_avatar')}
                  disabled={disabled || loading}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                >
                  <option value="human" className="bg-slate-900">Human support agent</option>
                  <option value="ai_avatar" className="bg-slate-900">AI avatar (Mila) — Zoom / Meet</option>
                </select>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">Platform</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  disabled={disabled || loading}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                >
                  {methods
                    .filter((m) => hostType === 'human' || m.id !== 'manual')
                    .map((m) => (
                    <option key={m.id} value={m.id} className="bg-slate-900">
                      {m.label} — {m.description}
                    </option>
                  ))}
                </select>
              </>
            )}
            <button
              type="button"
              onClick={() => void bookMeeting()}
              disabled={disabled || loading}
              className="btn-primary mt-2 inline-flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <Video className="h-4 w-4" />
              {loading ? 'Sending…' : 'Schedule support call'}
            </button>
            {error && <p className="text-sm text-rose-400">{error}</p>}
            {success && <p className="text-sm text-emerald-400">{success}</p>}
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-slate-400">
              <Calendar className="h-4 w-4" />
              Your support calls
            </div>
            {meetings.length === 0 ? (
              <p className="text-sm text-slate-500">No scheduled calls yet.</p>
            ) : (
              <ul className="space-y-2">
                {meetings.map((m) => (
                  <li key={m.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
                    <p className="font-medium text-white">{m.topic}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {statusLabel(m.status)} · {providerLabel(m.provider)}
                      {m.scheduled_at ? ` · ${formatDate(m.scheduled_at)}` : ''}
                    </p>
                    {m.meeting_url && m.status === 'scheduled' && (
                      <a
                        href={m.meeting_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex text-xs text-cyan-300 hover:underline"
                      >
                        Join call
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

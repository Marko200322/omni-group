'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Video, Calendar } from 'lucide-react';
import { ConversationalAvatarPanel } from '@/components/platform/ConversationalAvatarPanel';

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
  return 'Ručno';
}

function statusLabel(status: string) {
  if (status === 'scheduled') return 'Zakazan';
  if (status === 'completed') return 'Završen';
  if (status === 'canceled') return 'Otkazan';
  return 'Na čekanju';
}

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('sr-RS', { dateStyle: 'short', timeStyle: 'short' });
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
        if (!cancelled) setError('Ne mogu da učitam support opcije.');
      }
    })();
    void loadMeetings();
    return () => {
      cancelled = true;
    };
  }, [loadMeetings]);

  const bookMeeting = useCallback(async () => {
    if (topic.trim().length < 3) {
      setError('Tema mora imati bar 3 karaktera.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/atina/video-meetings/support/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          description: description.trim() || undefined,
          provider,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: MeetingRow;
        error?: string;
        detail?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.detail ?? json.error ?? 'book_failed');
      }
      setSuccess(
        json.data?.status === 'scheduled' && json.data.meeting_url
          ? 'Poziv je zakazan — proveri email za link.'
          : 'Zahtev je poslat — support tim će potvrditi termin i poslati link.',
      );
      setTopic('');
      setDescription('');
      await loadMeetings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri zakazivanju.');
    } finally {
      setLoading(false);
    }
  }, [topic, description, provider, loadMeetings]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-8">
      <ConversationalAvatarPanel agentType="support" disabled={disabled} />

      <motion.div className="border-t border-white/5 pt-6">
        <h3 className="font-display text-base font-semibold text-white">Zakaži live poziv sa timom</h3>
        <p className="mt-1 text-sm text-slate-500">Zoom, Google Meet ili ručno — pored AI avatara.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">Tema poziva</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="npr. Pomoć sa integracijom API-ja"
              disabled={disabled || loading}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">Opis (opciono)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Kratko opiši problem..."
              disabled={disabled || loading}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            {methods.length > 0 && (
              <>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">Platforma</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  disabled={disabled || loading}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                >
                  {methods.map((m) => (
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
              {loading ? 'Šaljem...' : 'Zakaži support poziv'}
            </button>
            {error && <p className="text-sm text-rose-400">{error}</p>}
            {success && <p className="text-sm text-emerald-400">{success}</p>}
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-slate-400">
              <Calendar className="h-4 w-4" />
              Tvoji support pozivi
            </div>
            {meetings.length === 0 ? (
              <p className="text-sm text-slate-500">Još nema zakazanih poziva.</p>
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
                        Pridruži se pozivu
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

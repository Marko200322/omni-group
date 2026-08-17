'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, PhoneOff, Radio, UserRound, Video } from 'lucide-react';

type LiveStatus = {
  enabled?: boolean;
  liveReady?: boolean;
  humanHandoffEnabled?: boolean;
  maxDurationMinutes?: number;
  recallConfigured?: boolean;
  providers?: Array<{ id: string; label: string; configured: boolean; mode: string }>;
};

type LiveSession = {
  sessionId: string;
  status: string;
  provider: string;
  platform: string;
  greeting?: string;
  joinUrl?: string | null;
  meetingUrl?: string | null;
  agent?: { id: string; name: string; title?: string; avatarUrl?: string };
  clientConfig?: Record<string, unknown>;
};

type TurnMessage = {
  role: 'user' | 'assistant';
  text: string;
  videoUrl?: string | null;
};

type Props = {
  disabled?: boolean;
  agentType?: 'support' | 'sales';
};

export function LiveCallPanel({ disabled, agentType = 'support' }: Props) {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [messages, setMessages] = useState<TurnMessage[]>([]);
  const [input, setInput] = useState('');
  const [platform, setPlatform] = useState<'browser' | 'zoom' | 'google_meet'>('browser');
  const [liveProvider, setLiveProvider] = useState('auto');
  const [bookTopic, setBookTopic] = useState('');
  const [bookProvider, setBookProvider] = useState<'zoom' | 'google_meet'>('zoom');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/atina/live-call-avatar/status');
        const json = (await res.json()) as { ok?: boolean; data?: LiveStatus };
        if (!cancelled && json.ok && json.data) setStatus(json.data);
      } catch {
        if (!cancelled) setError('Could not load live avatar status.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const liveReady =
    status?.liveReady === true ||
    Boolean(status?.providers?.some((p) => p.id !== 'stub' && p.configured));

  const startBrowserSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/atina/live-call-avatar/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'mila',
          agentType,
          platform,
          liveProvider,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; data?: LiveSession; error?: string; detail?: string };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.detail ?? json.error ?? 'Could not start live session.');
      }
      setSession(json.data);
      setMessages(json.data.greeting ? [{ role: 'assistant', text: json.data.greeting }] : []);
      setSuccess('Live avatar session started — Mila is ready.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start live session.');
    } finally {
      setLoading(false);
    }
  }, [agentType, platform, liveProvider]);

  const sendTurn = useCallback(async () => {
    if (!session?.sessionId || input.trim().length < 1) return;
    const userText = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/atina/live-call-avatar/session/${session.sessionId}/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { message?: TurnMessage; latencyMs?: number };
        detail?: string;
      };
      if (!res.ok || !json.ok || !json.data?.message) {
        throw new Error(json.detail ?? 'Turn failed.');
      }
      const msg = json.data.message;
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: msg.text, videoUrl: msg.videoUrl ?? null },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Turn failed.');
    } finally {
      setLoading(false);
    }
  }, [session?.sessionId, input]);

  const endSession = useCallback(async () => {
    if (!session?.sessionId) return;
    setLoading(true);
    try {
      await fetch(`/api/atina/live-call-avatar/session/${session.sessionId}/end`, { method: 'POST' });
      setSession(null);
      setSuccess('Session ended.');
    } catch {
      setError('Could not end session.');
    } finally {
      setLoading(false);
    }
  }, [session?.sessionId]);

  const requestHandoff = useCallback(async () => {
    if (!session?.sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/atina/live-call-avatar/session/${session.sessionId}/handoff`, {
        method: 'POST',
      });
      const json = (await res.json()) as { ok?: boolean; data?: { message?: string; meetingUrl?: string } };
      if (json.ok) {
        setSuccess(json.data?.message ?? 'Human handoff requested.');
      }
    } catch {
      setError('Handoff request failed.');
    } finally {
      setLoading(false);
    }
  }, [session?.sessionId]);

  const bookLiveMeeting = useCallback(async () => {
    if (bookTopic.trim().length < 3) {
      setError('Topic must be at least 3 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/atina/live-call-avatar/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: bookTopic.trim(),
          provider: bookProvider,
          agentId: 'mila',
          agentType,
          liveProvider,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { joinUrl?: string; liveSession?: LiveSession };
        detail?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.detail ?? 'Booking failed.');
      }
      const joinUrl = json.data?.joinUrl;
      setSuccess(
        joinUrl
          ? `AI avatar meeting scheduled — join link ready.`
          : 'AI avatar meeting scheduled — check your email.',
      );
      if (json.data?.liveSession) {
        setSession(json.data.liveSession);
        setMessages(
          json.data.liveSession.greeting
            ? [{ role: 'assistant', text: json.data.liveSession.greeting }]
            : [],
        );
      }
      setBookTopic('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed.');
    } finally {
      setLoading(false);
    }
  }, [bookTopic, bookProvider, agentType, liveProvider]);

  if (!status || !liveReady) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 to-slate-950/50 p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300">
          <Radio className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold text-white">Live call avatar — Mila</h3>
          <p className="mt-1 text-sm text-slate-400">
            Real-time talking avatar for Zoom & Google Meet (Recall.ai). Separate from the text assistant.
          </p>
          {status?.providers && (
            <p className="mt-2 text-xs text-slate-500">
              Providers:{' '}
              {status.providers
                .filter((p) => p.id !== 'stub')
                .map((p) => `${p.label} (${p.mode})`)
                .join(' · ')}
              {status.recallConfigured ? ' · Recall configured' : ' · Recall pending keys'}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Browser preview</p>
          <div className="flex flex-wrap gap-2">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as typeof platform)}
              disabled={disabled || loading || !!session}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
            >
              <option value="browser" className="bg-slate-900">Browser</option>
              <option value="zoom" className="bg-slate-900">Zoom target</option>
              <option value="google_meet" className="bg-slate-900">Google Meet target</option>
            </select>
            <select
              value={liveProvider}
              onChange={(e) => setLiveProvider(e.target.value)}
              disabled={disabled || loading || !!session}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
            >
              <option value="auto" className="bg-slate-900">Auto provider</option>
              <option value="heygen" className="bg-slate-900">HeyGen</option>
              <option value="d-id" className="bg-slate-900">D-ID</option>
            </select>
            {!session ? (
              <button
                type="button"
                onClick={() => void startBrowserSession()}
                disabled={disabled || loading}
                className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <Mic className="h-4 w-4" />
                {loading ? 'Starting…' : 'Start live session'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void endSession()}
                  disabled={disabled || loading}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5"
                >
                  <PhoneOff className="h-4 w-4" />
                  End
                </button>
                {status?.humanHandoffEnabled && (
                  <button
                    type="button"
                    onClick={() => void requestHandoff()}
                    disabled={disabled || loading}
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 px-3 py-1.5 text-sm text-amber-200 hover:bg-amber-500/10"
                  >
                    <UserRound className="h-4 w-4" />
                    Human handoff
                  </button>
                )}
              </>
            )}
          </div>

          {session && (
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-white/5 bg-black/20 p-3">
              {messages.map((m, i) => (
                <p
                  key={`${m.role}-${i}`}
                  className={`text-sm ${m.role === 'user' ? 'text-slate-300' : 'text-cyan-100'}`}
                >
                  <span className="font-medium">{m.role === 'user' ? 'You' : 'Mila'}:</span> {m.text}
                </p>
              ))}
            </div>
          )}

          {session && (
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void sendTurn()}
                placeholder="Say something to Mila…"
                disabled={disabled || loading}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
              <button
                type="button"
                onClick={() => void sendTurn()}
                disabled={disabled || loading || !input.trim()}
                className="btn-primary text-sm disabled:opacity-50"
              >
                Send
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Book Zoom / Meet with AI host</p>
          <input
            type="text"
            value={bookTopic}
            onChange={(e) => setBookTopic(e.target.value)}
            placeholder="e.g. Product demo with Mila"
            disabled={disabled || loading}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
          <select
            value={bookProvider}
            onChange={(e) => setBookProvider(e.target.value as typeof bookProvider)}
            disabled={disabled || loading}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            <option value="zoom" className="bg-slate-900">Zoom</option>
            <option value="google_meet" className="bg-slate-900">Google Meet</option>
          </select>
          <button
            type="button"
            onClick={() => void bookLiveMeeting()}
            disabled={disabled || loading}
            className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <Video className="h-4 w-4" />
            {loading ? 'Booking…' : 'Book AI avatar call'}
          </button>
          {session?.joinUrl && (
            <a
              href={session.joinUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-sm text-cyan-300 hover:underline"
            >
              Open meeting link
            </a>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
      {success && <p className="mt-3 text-sm text-emerald-400">{success}</p>}
    </motion.div>
  );
}

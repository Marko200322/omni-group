'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bot,
  Download,
  Loader2,
  MessageCircle,
  Minus,
  RotateCcw,
  Send,
  ThumbsDown,
  ThumbsUp,
  UserRound,
  X,
} from 'lucide-react';
import { ASSISTANT_NAME } from '@/lib/brand';
import { hasAnalyticsConsent } from '@/lib/cookie-consent';
import { buildOmiUiPageContext, omiQuickActions } from '@/lib/omi-page-context';
import { csrfFetch } from '@/lib/csrf-fetch';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

type AgentInfo = {
  id: string;
  name: string;
  title: string;
  avatarUrl: string | null;
};

type Audience = 'public' | 'portal';

type OmiMeta = {
  offerHandoff?: boolean;
  noSuitable?: boolean;
  promptVersion?: string;
  recommendEngineVersion?: string;
  abVersion?: string;
};

type Props = {
  userName?: string;
};

function friendlyError(raw: string | undefined): string {
  if (raw && /\s/.test(raw) && !/\.env|localhost|port \d|stub|undefined/i.test(raw)) {
    return raw;
  }
  return `${ASSISTANT_NAME} is temporarily unavailable. You can continue using Omni or contact support — nothing you typed was lost on our side.`;
}

function trackOmi(event: string): void {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) return;
  const plausible = (window as Window & { plausible?: (name: string) => void }).plausible;
  if (typeof plausible === 'function') plausible(event);
}

function currentHash(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.location.hash || undefined;
}

function exportTranscript(messages: ChatMessage[], sessionId: string | null): void {
  const header = [
    `${ASSISTANT_NAME} conversation export`,
    `Conversation ID: ${sessionId ?? 'unknown'}`,
    `Exported: ${new Date().toISOString()}`,
    '',
  ].join('\n');
  const body = messages.map((m) => `${m.role === 'user' ? 'You' : ASSISTANT_NAME}: ${m.text}`).join('\n\n');
  const blob = new Blob([`${header}${body}\n`], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `omi-conversation-${(sessionId ?? 'draft').slice(0, 8)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ClientAiAssistant({ userName }: Props) {
  const pathname = usePathname() ?? '';
  const isClientPortal = pathname.startsWith('/dashboard');
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [booting, setBooting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [audience, setAudience] = useState<Audience>('public');
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [hash, setHash] = useState<string | undefined>(undefined);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [offerHandoff, setOfferHandoff] = useState(false);
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState<Record<string, 'up' | 'down'>>({});
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [handoffName, setHandoffName] = useState(userName ?? '');
  const [handoffEmail, setHandoffEmail] = useState('');
  const [handoffNote, setHandoffNote] = useState('');
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [handoffStatus, setHandoffStatus] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    setHash(currentHash());
    const onHash = () => setHash(currentHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [messages, loading, reduceMotion, handoffOpen, feedbackFor]);

  useEffect(() => {
    if (!open || minimized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMinimized(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, minimized]);

  useEffect(() => {
    if (open && !minimized && sessionId) inputRef.current?.focus();
  }, [open, minimized, sessionId]);

  const startSession = useCallback(async (opts?: { freshConsultation?: boolean }) => {
    setBooting(true);
    setError(null);
    setOfferHandoff(false);
    setHandoffStatus(null);
    setFeedbackDone({});
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 8000);
      const res = await csrfFetch('/api/atina/atina-assistant/session', { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freshConsultation: opts?.freshConsultation === true,
        }),
        signal: controller.signal,
      });
      window.clearTimeout(timer);
      const json = (await res.json()) as {
        ok?: boolean;
        data?: {
          sessionId: string;
          audience?: Audience;
          greeting: ChatMessage;
          agent?: AgentInfo;
        };
        error?: string;
        detail?: string;
      };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.detail ?? json.error ?? 'session_failed');
      }
      setSessionId(json.data.sessionId);
      setAudience(json.data.audience === 'portal' ? 'portal' : 'public');
      if (json.data.agent) setAgent(json.data.agent);
      setMessages([json.data.greeting]);
    } catch (err) {
      startedRef.current = false;
      setSessionId(null);
      setMessages([]);
      setError(friendlyError(err instanceof Error ? err.message : undefined));
    } finally {
      setBooting(false);
    }
  }, []);

  const openPanel = useCallback(() => {
    setOpen(true);
    setMinimized(false);
    trackOmi('OMI Opened');
  }, []);

  useEffect(() => {
    if (!open || startedRef.current) return;
    startedRef.current = true;
    void startSession();
  }, [open, startSession]);

  const clearConsultation = useCallback(async () => {
    if (booting || loading) return;
    trackOmi('OMI New Consultation');
    setMessages([]);
    setSessionId(null);
    setInput('');
    setError(null);
    setOfferHandoff(false);
    setHandoffOpen(false);
    startedRef.current = true;
    await startSession({ freshConsultation: true });
  }, [booting, loading, startSession]);

  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
      if (!text || !sessionId || loading) return;

      setInput('');
      setLoading(true);
      setError(null);
      setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: 'user', text }]);
      trackOmi('OMI Message Sent');

      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 45000);
        const res = await csrfFetch('/api/atina/atina-assistant/chat', { method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            message: text,
            pageContext: buildOmiUiPageContext(pathname, hash ?? currentHash()),
          }),
          signal: controller.signal,
        });
        window.clearTimeout(timer);
        const json = (await res.json()) as {
          ok?: boolean;
          data?: {
            message: ChatMessage;
            agent?: AgentInfo;
            audience?: Audience;
            omi?: OmiMeta;
          };
          error?: string;
          detail?: string;
        };
        if (!res.ok || !json.ok || !json.data?.message) {
          throw new Error(json.detail ?? json.error ?? 'chat_failed');
        }
        if (json.data.agent) setAgent(json.data.agent);
        if (json.data.audience === 'portal' || json.data.audience === 'public') {
          setAudience(json.data.audience);
        }
        if (json.data.omi?.offerHandoff || json.data.omi?.noSuitable) {
          setOfferHandoff(true);
        }
        setMessages((prev) => [...prev, json.data!.message]);
      } catch (err) {
        setError(friendlyError(err instanceof Error ? err.message : undefined));
      } finally {
        setLoading(false);
      }
    },
    [input, loading, sessionId, pathname, hash],
  );

  const submitFeedback = useCallback(
    async (messageId: string, rating: 'up' | 'down') => {
      if (!sessionId || feedbackBusy) return;
      setFeedbackBusy(true);
      try {
        const res = await csrfFetch('/api/atina/atina-assistant/feedback', { method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            messageId,
            rating,
            note: feedbackNote.trim() || undefined,
          }),
        });
        const json = (await res.json()) as { ok?: boolean };
        if (!res.ok || !json.ok) throw new Error('feedback_failed');
        setFeedbackDone((prev) => ({ ...prev, [messageId]: rating }));
        setFeedbackFor(null);
        setFeedbackNote('');
        trackOmi(rating === 'up' ? 'OMI Feedback Up' : 'OMI Feedback Down');
      } catch {
        setError(`${ASSISTANT_NAME} could not save feedback right now. Please try again in a moment.`);
      } finally {
        setFeedbackBusy(false);
      }
    },
    [sessionId, feedbackBusy, feedbackNote],
  );

  const submitHandoff = useCallback(async () => {
    if (!sessionId || handoffBusy) return;
    setHandoffBusy(true);
    setHandoffStatus(null);
    try {
      const res = await csrfFetch('/api/atina/atina-assistant/handoff', { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          name: handoffName.trim() || undefined,
          email: handoffEmail.trim() || undefined,
          note: handoffNote.trim() || undefined,
          messages: messages.map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        if (json.error === 'email_required') {
          setHandoffStatus('Please enter a valid email so the team can reach you.');
        } else {
          throw new Error(json.error ?? 'handoff_failed');
        }
        return;
      }
      setHandoffStatus('Request sent. A human will follow up using this conversation ID.');
      setHandoffOpen(false);
      trackOmi('OMI Handoff Requested');
    } catch {
      setHandoffStatus('Could not create the support request. Use Contact or try again.');
    } finally {
      setHandoffBusy(false);
    }
  }, [sessionId, handoffBusy, handoffName, handoffEmail, handoffNote, messages]);

  const firstName = userName?.split(' ')[0];
  const displayName = ASSISTANT_NAME;
  const fabBottomClass = isClientPortal ? 'bottom-6' : 'bottom-5';
  const fabSideClass = isClientPortal ? 'right-6' : 'left-4 right-auto sm:left-6';
  const chips = omiQuickActions(pathname);
  const escalateHref = isClientPortal ? '/dashboard/support' : '/contact';
  const subtitle = error
    ? 'temporarily unavailable'
    : isClientPortal || audience === 'portal'
      ? `${firstName ? `Hi ${firstName} · ` : ''}OMI · your workspace`
      : 'OMI · Omni business assistant';
  const motionOff = reduceMotion ? { duration: 0 } : { type: 'spring' as const, damping: 26, stiffness: 320 };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={openPanel}
          className={`fixed z-40 flex min-h-12 items-center gap-2 rounded-full border border-white/15 bg-[#0b0d11]/95 px-4 py-2 text-slate-100 backdrop-blur-md transition hover:border-cyan-400/40 hover:text-white ${fabBottomClass} ${fabSideClass}`}
          aria-label={`Ask ${displayName}`}
        >
          <MessageCircle className="h-5 w-5 shrink-0 text-cyan-300" />
          <span className="hidden text-sm font-semibold sm:inline">Ask {displayName}</span>
        </button>
      )}

      {open && minimized && (
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className={`fixed z-50 flex min-h-12 items-center gap-2 rounded-full border border-white/15 bg-[#0b0d11]/95 px-4 py-2 text-slate-100 backdrop-blur-md ${fabBottomClass} ${fabSideClass}`}
          aria-label={`Restore ${displayName}`}
        >
          <MessageCircle className="h-5 w-5 shrink-0 text-cyan-300" />
          <span className="text-sm font-semibold">{displayName}</span>
        </button>
      )}

      <AnimatePresence>
        {open && !minimized && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
            transition={motionOff}
            className="fixed inset-x-3 bottom-3 z-50 flex h-[min(560px,calc(100dvh-5.5rem))] w-auto flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d11]/98 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[min(560px,calc(100vh-3rem))] sm:w-[min(380px,calc(100vw-2rem))]"
            role="dialog"
            aria-modal="true"
            aria-label={`${displayName} chat`}
          >
            <header className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                {agent?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={agent.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Bot className="h-5 w-5 text-cyan-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                <p className="truncate text-xs text-slate-400">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => void clearConsultation()}
                disabled={booting || loading}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-40"
                aria-label="Start a new consultation"
                title="New consultation"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => exportTranscript(messages, sessionId)}
                disabled={messages.length === 0}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-40"
                aria-label="Export conversation"
                title="Export / save summary"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setMinimized(true)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
                aria-label={`Minimize ${displayName}`}
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
                aria-label={`Close ${displayName}`}
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto p-4"
              aria-live="polite"
              aria-relevant="additions"
            >
              {booting && messages.length === 0 && (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting {displayName}…
                </p>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`max-w-[92%] space-y-1 ${m.role === 'user' ? 'ml-auto' : ''}`}>
                  <div
                    className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-white/10 text-slate-50'
                        : 'bg-white/[0.04] text-slate-100'
                    }`}
                  >
                    {m.text}
                  </div>
                  {m.role === 'assistant' && !m.id.startsWith('local-') && (
                    <div className="flex items-center gap-1 px-1">
                      {feedbackDone[m.id] ? (
                        <span className="text-[10px] text-slate-500">Thanks for the feedback</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="rounded p-1 text-slate-500 hover:bg-white/5 hover:text-cyan-200"
                            aria-label="Helpful"
                            disabled={feedbackBusy}
                            onClick={() => {
                              setFeedbackFor(m.id);
                              void submitFeedback(m.id, 'up');
                            }}
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-1 text-slate-500 hover:bg-white/5 hover:text-rose-200"
                            aria-label="Not helpful"
                            disabled={feedbackBusy}
                            onClick={() => setFeedbackFor(feedbackFor === m.id ? null : m.id)}
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {feedbackFor === m.id && !feedbackDone[m.id] && (
                    <div className="space-y-1 rounded-lg border border-white/10 bg-white/[0.03] p-2">
                      <label htmlFor={`omi-fb-${m.id}`} className="sr-only">
                        Optional feedback note
                      </label>
                      <input
                        id={`omi-fb-${m.id}`}
                        value={feedbackNote}
                        onChange={(e) => setFeedbackNote(e.target.value)}
                        placeholder="Optional note…"
                        className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1 text-xs text-white outline-none"
                      />
                      <button
                        type="button"
                        disabled={feedbackBusy}
                        onClick={() => void submitFeedback(m.id, 'down')}
                        className="text-[11px] text-cyan-200 underline underline-offset-2"
                      >
                        Send 👎 feedback
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <p className="text-xs text-slate-500">
                  <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                  {displayName} is typing…
                </p>
              )}
              {offerHandoff && !handoffOpen && (
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs text-slate-200">
                  Stuck or need a human?{' '}
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium text-cyan-200 underline underline-offset-2"
                    onClick={() => setHandoffOpen(true)}
                  >
                    <UserRound className="h-3 w-3" />
                    Create a support request
                  </button>{' '}
                  with this conversation summary.
                </div>
              )}
              {handoffOpen && (
                <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-200">
                  <p className="font-medium text-white">Human handoff</p>
                  <p className="text-slate-400">
                    Includes conversation ID {sessionId ? `${sessionId.slice(0, 8)}…` : '—'} and a short summary.
                  </p>
                  {!isClientPortal && (
                    <>
                      <input
                        value={handoffName}
                        onChange={(e) => setHandoffName(e.target.value)}
                        placeholder="Your name"
                        className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5 text-xs text-white outline-none"
                      />
                      <input
                        value={handoffEmail}
                        onChange={(e) => setHandoffEmail(e.target.value)}
                        placeholder="Email"
                        type="email"
                        className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5 text-xs text-white outline-none"
                      />
                    </>
                  )}
                  <textarea
                    value={handoffNote}
                    onChange={(e) => setHandoffNote(e.target.value)}
                    placeholder="What should the human focus on?"
                    rows={2}
                    className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5 text-xs text-white outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={handoffBusy}
                      onClick={() => void submitHandoff()}
                      className="rounded-md bg-cyan-700 px-2.5 py-1.5 text-white hover:bg-cyan-600 disabled:opacity-40"
                    >
                      {handoffBusy ? 'Sending…' : 'Send request'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setHandoffOpen(false)}
                      className="rounded-md px-2.5 py-1.5 text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {handoffStatus && <p className="text-xs text-cyan-100/90">{handoffStatus}</p>}
            </div>

            <div className="border-t border-white/10 p-3">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {chips.map((chip) => {
                  const chipClass =
                    'min-h-8 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-300 transition hover:border-cyan-500/30 hover:text-cyan-100 disabled:opacity-40';
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      disabled={loading || !sessionId}
                      onClick={() => void sendMessage(chip.message)}
                      className={chipClass}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <label htmlFor="omi-message" className="sr-only">
                  Message {displayName}
                </label>
                <input
                  id="omi-message"
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                  disabled={booting || loading || !sessionId}
                  placeholder="Describe the problem — not the package…"
                  autoComplete="off"
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus-visible:border-cyan-500/35 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={booting || loading || !sessionId || !input.trim()}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-cyan-700 px-3 text-white transition hover:bg-cyan-600 focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-40"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Human support stays available.{' '}
                <Link href={escalateHref} className="text-cyan-200/90 underline underline-offset-2 hover:text-white">
                  {isClientPortal ? 'Open Support' : 'Contact'}
                </Link>
                {sessionId ? (
                  <span className="ml-1 text-slate-600">· id {sessionId.slice(0, 8)}</span>
                ) : null}
              </p>
              {error && (
                <p className="mt-2 text-xs text-rose-300" role="alert">
                  {error}{' '}
                  <button
                    type="button"
                    className="underline underline-offset-2 hover:text-white"
                    onClick={() => {
                      setError(null);
                      if (!sessionId) void startSession({ freshConsultation: true });
                    }}
                  >
                    Retry
                  </button>{' '}
                  or{' '}
                  <Link href="/contact" className="underline underline-offset-2 hover:text-white">
                    Contact
                  </Link>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

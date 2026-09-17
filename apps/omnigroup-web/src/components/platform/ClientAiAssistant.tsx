'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Loader2, MessageCircle, Send, X } from 'lucide-react';
import { PORTAL_QUICK_PROMPTS, PUBLIC_QUICK_PROMPTS } from '@/lib/client-portal-ai-context';
import { ASSISTANT_NAME } from '@/lib/brand';

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

type Props = {
  userName?: string;
};

function friendlyError(raw: string | undefined): string {
  if (raw && /\s/.test(raw) && !/\.env|localhost|port \d|stub|undefined/i.test(raw)) {
    return raw;
  }
  return `${ASSISTANT_NAME} is temporarily unavailable. Try again or open Contact.`;
}

export function ClientAiAssistant({ userName }: Props) {
  const [open, setOpen] = useState(false);
  const [booting, setBooting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [audience, setAudience] = useState<Audience>('public');
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const startSession = useCallback(async () => {
    if (sessionId || booting) return;
    setBooting(true);
    setError(null);
    try {
      const res = await fetch('/api/atina/atina-assistant/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
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
      setError(friendlyError(err instanceof Error ? err.message : undefined));
    } finally {
      setBooting(false);
    }
  }, [booting, sessionId]);

  useEffect(() => {
    if (!open || startedRef.current) return;
    startedRef.current = true;
    void startSession();
  }, [open, startSession]);

  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
      if (!text || !sessionId || loading) return;

      setInput('');
      setLoading(true);
      setError(null);
      setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: 'user', text }]);

      try {
        const res = await fetch('/api/atina/atina-assistant/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, message: text }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          data?: { message: ChatMessage; agent?: AgentInfo; audience?: Audience };
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
        setMessages((prev) => [...prev, json.data!.message]);
      } catch (err) {
        setError(friendlyError(err instanceof Error ? err.message : undefined));
      } finally {
        setLoading(false);
      }
    },
    [input, loading, sessionId],
  );

  const firstName = userName?.split(' ')[0];
  const displayName = ASSISTANT_NAME;
  const chips = audience === 'portal' ? PORTAL_QUICK_PROMPTS : PUBLIC_QUICK_PROMPTS;
  const subtitle =
    audience === 'portal'
      ? `${firstName ? `Hi ${firstName} · ` : ''}portal assistant · online`
      : 'Site assistant · online';

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[70] flex h-14 items-center gap-2 rounded-full border border-emerald-500/40 bg-[#0a1218]/95 px-4 text-emerald-200 shadow-lg shadow-emerald-500/10 backdrop-blur-md transition hover:scale-105 hover:border-emerald-400/60 hover:bg-emerald-500/10"
          aria-label={`Open ${displayName}`}
        >
          <MessageCircle className="h-5 w-5 shrink-0" />
          <span className="hidden text-sm font-semibold sm:inline">{displayName}</span>
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed bottom-6 right-6 z-[70] flex h-[min(560px,calc(100vh-3rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0e18]/98 shadow-2xl backdrop-blur-xl"
            role="dialog"
            aria-label={`${displayName} chat`}
          >
            <header className="flex items-center gap-3 border-b border-white/10 bg-emerald-500/5 px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30">
                {agent?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={agent.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Bot className="h-5 w-5 text-emerald-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                <p className="truncate text-xs text-slate-400">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
                aria-label={`Close ${displayName}`}
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {booting && messages.length === 0 && (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting {displayName}…
                </p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[92%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'ml-auto bg-emerald-500/15 text-emerald-50'
                      : 'bg-white/[0.04] text-slate-100'
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {loading && (
                <p className="text-xs text-slate-500">
                  <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                  {displayName} is typing…
                </p>
              )}
            </div>

            <div className="border-t border-white/10 p-3">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {chips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    disabled={booting || loading || !sessionId}
                    onClick={() => void sendMessage(chip.message)}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-300 transition hover:border-emerald-500/30 hover:text-emerald-100 disabled:opacity-40"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                  disabled={booting || loading || !sessionId}
                  placeholder={`Ask ${displayName} anything…`}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500/40"
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={booting || loading || !sessionId || !input.trim()}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 text-white transition hover:bg-emerald-500 disabled:opacity-40"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

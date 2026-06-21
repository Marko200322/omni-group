'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { describeAtinaError } from '@/lib/atina-errors';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Mic, Send, UserCircle2, Volume2, Users } from 'lucide-react';

export type AgentType = 'support' | 'sales';

type AgentInfo = {
  id: string;
  name: string;
  title: string;
  avatarUrl: string | null;
  backgroundUrl?: string | null;
  avatarType: 'conversational' | 'image' | 'initials';
          capabilities?: {
    chat: boolean;
    voice: boolean;
    video: boolean;
    ai: boolean;
    aggregator?: boolean;
  };
  rosterSource?: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  audioDataUrl?: string | null;
  videoUrl?: string | null;
};

type Props = {
  agentType: AgentType;
  disabled?: boolean;
};

function AvatarScene({
  agent,
  activeVideo,
  speaking,
  videoRef,
  large,
  onVideoEnded,
}: {
  agent: AgentInfo | null;
  activeVideo: string | null;
  speaking: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  large?: boolean;
  onVideoEnded?: () => void;
}) {
  const sizeClass = large ? 'aspect-[3/4] max-w-xs' : 'aspect-[4/5]';
  return (
    <div
      className={`relative mx-auto w-full overflow-hidden rounded-2xl border border-violet-500/25 ${sizeClass}`}
    >
      {agent?.backgroundUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={agent.backgroundUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/10 to-cyan-500/5" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
      {activeVideo ? (
        <video
          ref={videoRef}
          src={activeVideo}
          className="relative z-10 h-full w-full object-cover"
          playsInline
          onEnded={onVideoEnded}
        />
      ) : agent?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={agent.avatarUrl}
          alt={agent.name}
          className="relative z-10 mx-auto mt-[12%] h-[68%] w-[68%] object-contain drop-shadow-lg"
        />
      ) : (
        <div className="relative z-10 flex h-full flex-col items-center justify-center text-violet-300">
          <UserCircle2 className="h-24 w-24 opacity-80" />
        </div>
      )}
      {speaking && !activeVideo && (
        <motion.div
          className="absolute inset-x-0 bottom-0 z-20 h-1 bg-violet-400/60"
          animate={{ scaleX: [0.2, 1, 0.2] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          style={{ transformOrigin: 'center' }}
        />
      )}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 to-transparent p-4">
        <p className="font-medium text-white">{agent?.name ?? 'Agent'}</p>
        <p className="text-xs text-slate-300">{agent?.title ?? ''}</p>
      </div>
    </div>
  );
}

function apiBase(agentType: AgentType) {
  return `/api/atina/video-meetings/${agentType}/avatar`;
}

export function ConversationalAvatarPanel({ agentType, disabled }: Props) {
  const [roster, setRoster] = useState<AgentInfo[]>([]);
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [pickerMode, setPickerMode] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const playResponse = useCallback(async (msg: ChatMessage) => {
    if (msg.videoUrl) {
      setActiveVideo(msg.videoUrl);
      videoRef.current?.play().catch(() => undefined);
      return;
    }
    if (msg.audioDataUrl) {
      setSpeaking(true);
      const audio = new Audio(msg.audioDataUrl);
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      await audio.play().catch(() => setSpeaking(false));
      return;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeaking(true);
      const utter = new SpeechSynthesisUtterance(msg.text);
      utter.lang = 'sr-RS';
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    }
  }, []);

  const loadRoster = useCallback(async () => {
    setBooting(true);
    setError(null);
    try {
      const agentsRes = await fetch(`/api/atina/video-meetings/${agentType}/agents`);
        const agentsJson = (await agentsRes.json()) as {
          ok?: boolean;
          data?: { agents?: AgentInfo[]; rosterSource?: string };
        };
      if (agentsJson.ok && agentsJson.data?.agents?.length) {
        setRoster(agentsJson.data.agents);
      }
    } catch {
      setError('Ne mogu da učitam tim avatara.');
    } finally {
      setBooting(false);
    }
  }, [agentType]);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  const startSession = useCallback(
    async (agentId: string) => {
      setBooting(true);
      setError(null);
      setPickerMode(false);
      setMessages([]);
      setSessionId(null);
      try {
        const res = await fetch(`${apiBase(agentType)}/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          data?: { sessionId: string; greeting: ChatMessage; agent?: AgentInfo };
          error?: string;
          detail?: string;
        };
        if (!res.ok || !json.ok || !json.data) {
          throw new Error(json.detail ?? json.error ?? 'session_failed');
        }
        setSessionId(json.data.sessionId);
        if (json.data.agent) setAgent(json.data.agent);
        setMessages([json.data.greeting]);
        await playResponse(json.data.greeting);
      } catch (err) {
        setPickerMode(true);
        setError(describeAtinaError(err instanceof Error ? err.message : 'session_failed'));
      } finally {
        setBooting(false);
      }
    },
    [agentType, playResponse],
  );

  const resetToPicker = useCallback(() => {
    setSessionId(null);
    setAgent(null);
    setMessages([]);
    setInput('');
    setPickerMode(true);
    setActiveVideo(null);
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !sessionId || loading || disabled) return;

    setInput('');
    setLoading(true);
    setError(null);
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: 'user', text }]);

    try {
      const res = await fetch(`${apiBase(agentType)}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { message: ChatMessage; agent?: AgentInfo };
        error?: string;
        detail?: string;
      };
      if (!res.ok || !json.ok || !json.data?.message) {
        throw new Error(json.detail ?? json.error ?? 'chat_failed');
      }
      if (json.data.agent) setAgent(json.data.agent);
      setMessages((prev) => [...prev, json.data!.message]);
      await playResponse(json.data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri slanju poruke.');
    } finally {
      setLoading(false);
    }
  }, [agentType, disabled, input, loading, playResponse, sessionId]);

  const label = agentType === 'support' ? 'Support tim' : 'Prodajni tim';

  if (pickerMode) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <motion.div className="flex items-center gap-2 text-sm text-slate-400">
          <Users className="h-4 w-4" />
          Izaberi {label.toLowerCase()} ({roster.length} avatara)
          {roster[0]?.rosterSource === 'aggregator' && (
            <span className="text-violet-300/90">· generisano preko AI agregatora</span>
          )}
        </motion.div>
        {booting && roster.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Učitavam tim...
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {roster.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={disabled || booting}
                onClick={() => void startSession(a.id)}
                className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] text-left transition hover:border-violet-500/40 hover:bg-violet-500/5 disabled:opacity-50"
              >
                <div className="relative aspect-[4/3] w-full">
                  {a.backgroundUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.backgroundUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-violet-500/10" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  {a.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.avatarUrl}
                      alt={a.name}
                      className="absolute bottom-0 left-1/2 h-[75%] w-[55%] -translate-x-1/2 object-contain"
                    />
                  ) : (
                    <UserCircle2 className="absolute bottom-2 left-1/2 h-12 w-12 -translate-x-1/2 text-violet-300" />
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium text-white">{a.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{a.title}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-rose-400">{error}</p>}
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={resetToPicker} className="btn-glass text-xs">
          Promeni agenta ({roster.length} u timu)
        </button>
      </div>
      <div className="flex flex-col gap-4 lg:flex-row">
        <AvatarScene
          agent={agent}
          activeVideo={activeVideo}
          speaking={speaking}
          videoRef={videoRef}
          large
          onVideoEnded={() => setActiveVideo(null)}
        />

        <div className="flex min-h-[320px] flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="border-b border-white/5 px-4 py-3 text-sm text-slate-400">
            Razgovor sa {agent?.name ?? 'avatarom'} · {label}
          </div>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {booting && (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Avatar se budi...
              </p>
            )}
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'ml-auto bg-emerald-500/15 text-emerald-50'
                      : 'bg-violet-500/10 text-slate-100'
                  }`}
                >
                  {m.text}
                  {m.role === 'assistant' && m.audioDataUrl && (
                    <button
                      type="button"
                      onClick={() => void playResponse(m)}
                      className="mt-2 flex items-center gap-1 text-xs text-violet-300 hover:underline"
                    >
                      <Volume2 className="h-3 w-3" /> Ponovi
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {loading && (
              <p className="text-xs text-slate-500">
                <Mic className="mr-1 inline h-3 w-3" />
                {agent?.name ?? 'Agent'} razmišlja...
              </p>
            )}
          </div>
          <div className="border-t border-white/5 p-3">
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
                disabled={disabled || booting || loading || !sessionId}
                placeholder="Piši — avatar razume i odgovara glasom..."
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={disabled || booting || loading || !sessionId || !input.trim()}
                className="btn-primary inline-flex items-center gap-1 px-4 text-sm disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

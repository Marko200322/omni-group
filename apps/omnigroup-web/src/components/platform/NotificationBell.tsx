'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { formatRelativeTime } from '@/lib/atina-live-utils';
import { tapScale } from '@/lib/animations';

type BellNotification = {
  id: string;
  title: string;
  message?: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt?: string;
};

type Props = {
  disabled?: boolean;
};

export function NotificationBell({ disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<BellNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    if (disabled) {
      setUnread(0);
      return;
    }
    try {
      const res = await fetch('/api/atina/notifications/unread-count');
      const body = (await res.json()) as {
        ok?: boolean;
        data?: { count?: number };
      };
      if (res.ok && body.ok) {
        setUnread(Math.max(0, Number(body.data?.count ?? 0)));
      }
    } catch {
      /* keep last known count */
    }
  }, [disabled]);

  const loadList = useCallback(async () => {
    if (disabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/atina/notifications?limit=15&page=1');
      const body = (await res.json()) as {
        ok?: boolean;
        data?: { notifications?: BellNotification[] };
      };
      if (!res.ok || !body.ok) {
        throw new Error('load_failed');
      }
      setItems(body.data?.notifications ?? []);
      await refreshCount();
    } catch {
      setError('Couldn’t load notifications.');
    } finally {
      setLoading(false);
    }
  }, [disabled, refreshCount]);

  useEffect(() => {
    if (disabled) return;
    void refreshCount();
    const id = window.setInterval(() => void refreshCount(), 45_000);
    return () => window.clearInterval(id);
  }, [disabled, refreshCount]);

  useEffect(() => {
    if (!open) return;
    void loadList();
  }, [open, loadList]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
    try {
      const res = await fetch(`/api/atina/notifications/${encodeURIComponent(id)}/read`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        if (open) void loadList();
        return;
      }
      await refreshCount();
    } catch {
      /* offline: keep optimistic state; next poll reconciles the count */
    }
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    try {
      const res = await fetch('/api/atina/notifications/read-all', { method: 'PATCH' });
      if (!res.ok) {
        if (open) void loadList();
        return;
      }
      await refreshCount();
    } catch {
      /* offline: keep optimistic state; next poll reconciles the count */
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <motion.button
        type="button"
        className="relative rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-40"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={disabled}
        whileHover={disabled ? undefined : { scale: 1.08 }}
        whileTap={disabled ? undefined : tapScale}
        onClick={() => setOpen((v) => !v)}
      >
        <motion.div
          animate={unread > 0 ? { rotate: [0, -10, 10, 0] } : undefined}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 6 }}
        >
          <Bell className="h-5 w-5" />
        </motion.div>
        {unread > 0 ? (
          <motion.span
            className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white"
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            {unread > 99 ? '99+' : unread}
          </motion.span>
        ) : null}
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-12 z-50 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#0a0e18]/95 shadow-2xl shadow-black/50 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
              <p className="text-sm font-semibold text-white">Notifications</p>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200 disabled:opacity-40"
                disabled={unread === 0 || loading}
                onClick={() => void markAllRead()}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : null}

              {error ? (
                <div className="px-3 py-4 text-sm text-rose-300">
                  {error}{' '}
                  <button type="button" className="underline" onClick={() => void loadList()}>
                    Retry
                  </button>
                </div>
              ) : null}

              {!loading && !error && items.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-slate-500">No notifications yet.</p>
              ) : null}

              <ul className="divide-y divide-white/[0.06]">
                {items.map((n) => {
                  const rowClass = `block w-full px-3 py-2.5 text-left transition hover:bg-white/[0.04] ${
                    n.isRead ? 'opacity-70' : ''
                  }`;
                  const content = (
                    <div className="flex items-start gap-2">
                      {!n.isRead ? (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                      ) : (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{n.title}</p>
                        {n.message ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{n.message}</p>
                        ) : null}
                        <p className="mt-1 text-[10px] text-slate-500">
                          {formatRelativeTime(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  );

                  if (n.actionUrl) {
                    return (
                      <li key={n.id}>
                        <Link
                          href={n.actionUrl}
                          className={rowClass}
                          onClick={() => {
                            if (!n.isRead) void markRead(n.id);
                            setOpen(false);
                          }}
                        >
                          {content}
                        </Link>
                      </li>
                    );
                  }

                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        className={rowClass}
                        onClick={() => {
                          if (!n.isRead) void markRead(n.id);
                          setOpen(false);
                        }}
                      >
                        {content}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

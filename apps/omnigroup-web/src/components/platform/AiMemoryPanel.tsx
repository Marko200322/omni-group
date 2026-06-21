'use client';

import { useState } from 'react';
import { Brain, Loader2 } from 'lucide-react';

type RecallItem = {
  id?: string;
  context?: string;
  created_at?: string;
};

export function AiMemoryPanel() {
  const [namespace, setNamespace] = useState('global');
  const [key, setKey] = useState('prefs');
  const [valueText, setValueText] = useState('{"theme":"dark"}');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<RecallItem[]>([]);

  async function handleRemember() {
    setStatus('loading');
    setMessage('');
    let value: Record<string, unknown>;
    try {
      const parsed = JSON.parse(valueText) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('invalid_json');
      }
      value = parsed as Record<string, unknown>;
    } catch {
      setStatus('err');
      setMessage('Value must be a valid JSON object.');
      return;
    }

    try {
      const res = await fetch('/api/atina/ai-memory/remember', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, namespace }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus('err');
        setMessage(
          data.error === 'atina_unreachable'
            ? 'Atina API is unavailable — start the local stack.'
            : data.error ?? `HTTP ${res.status}`,
        );
        return;
      }
      setStatus('ok');
      setMessage('Saved to ai-memory.');
    } catch {
      setStatus('err');
      setMessage('Request failed.');
    }
  }

  async function handleRecall() {
    setStatus('loading');
    setMessage('');
    try {
      const qs = new URLSearchParams({ namespace });
      if (key.trim()) qs.set('key', key.trim());
      const res = await fetch(`/api/atina/ai-memory/recall?${qs.toString()}`);
      const data = (await res.json()) as { ok?: boolean; error?: string; items?: RecallItem[] };
      if (!res.ok || !data.ok) {
        setStatus('err');
        setMessage(
          data.error === 'atina_unreachable'
            ? 'Atina API is unavailable — start the local stack.'
            : data.error ?? `HTTP ${res.status}`,
        );
        return;
      }
      setItems(data.items ?? []);
      setStatus('ok');
      setMessage(data.items?.length ? `Found ${data.items.length} record(s).` : 'No records for this key.');
    } catch {
      setStatus('err');
      setMessage('Request failed.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Brain className="h-4 w-4 text-violet-400" />
        Atina module <span className="font-mono text-violet-300">ai-memory</span> — remember / recall
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-slate-500">
          Namespace
          <input
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-slate-500">
          Key
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      <label className="block text-xs text-slate-500">
        Value (JSON)
        <textarea
          value={valueText}
          onChange={(e) => setValueText(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleRemember} className="btn-primary text-sm" disabled={status === 'loading'}>
          {status === 'loading' ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : null}
          Remember
        </button>
        <button type="button" onClick={handleRecall} className="btn-glass text-sm" disabled={status === 'loading'}>
          Recall
        </button>
      </div>

      {message && (
        <p className={`text-xs ${status === 'err' ? 'text-rose-400' : 'text-emerald-400'}`}>{message}</p>
      )}

      {items.length > 0 && (
        <ul className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-white/5 bg-black/20 p-3 text-xs">
          {items.map((item) => (
            <li key={item.id ?? item.created_at} className="font-mono text-slate-300">
              {item.context ?? '(empty context)'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

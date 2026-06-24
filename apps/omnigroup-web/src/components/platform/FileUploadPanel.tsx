'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react';

type UploadResult = {
  ok: boolean;
  mode?: string;
  file?: { name: string; size: number; type: string; storedPath?: string };
  error?: string;
};

type Props = {
  disabled?: boolean;
};

export function FileUploadPanel({ disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const onFiles = useCallback(async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || disabled) return;

    setBusy(true);
    setResult(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body });
      const json = (await res.json()) as UploadResult;
      if (!res.ok) {
        setResult({ ok: false, error: json.error ?? `HTTP ${res.status}` });
        return;
      }
      setResult(json);
    } catch {
      setResult({ ok: false, error: 'network_error' });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [disabled]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-cyan-500/15 p-2 text-cyan-300">
          <Upload className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white">Document upload</h3>
          <p className="mt-1 text-xs text-slate-400">
            PDF, PNG, JPEG, or plain text — max 2 MB. Files are stored securely on the server.
          </p>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"
              disabled={disabled || busy}
              onChange={(e) => void onFiles(e.target.files)}
            />
            {busy ? 'Uploading…' : 'Choose file'}
          </label>
          {result?.ok && result.file ? (
            <p className="mt-3 flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {result.file.name} ({Math.round(result.file.size / 1024)} KB)
              {result.file.storedPath ? ` — ${result.file.storedPath}` : ''}
            </p>
          ) : null}
          {result && !result.ok ? (
            <p className="mt-3 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Upload failed: {result.error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

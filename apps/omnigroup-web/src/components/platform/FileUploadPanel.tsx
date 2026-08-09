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

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'text/plain']);
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.txt'];

/** Map internal upload error codes to client-friendly copy — never surface raw codes. */
function friendlyUploadError(code: string | undefined): string {
  switch (code) {
    case 'file_too_large':
      return 'That file is too large — please keep it under 2 MB.';
    case 'file_type_not_allowed':
      return 'That file type isn\u2019t supported. Please upload a PDF, PNG, JPEG, or TXT file.';
    case 'no_file':
    case 'invalid_multipart':
      return 'We couldn\u2019t read that file. Please choose a different file and try again.';
    case 'unauthorized':
      return 'Please sign in again to upload documents.';
    default:
      return 'Upload failed. Please try again in a moment.';
  }
}

function validateFile(file: File): string | null {
  if (file.size === 0) return 'no_file';
  if (file.size > MAX_UPLOAD_BYTES) return 'file_too_large';
  const type = file.type || '';
  const nameLower = file.name.toLowerCase();
  const extOk = ALLOWED_EXTENSIONS.some((ext) => nameLower.endsWith(ext));
  if (type && !ALLOWED_TYPES.has(type) && !extOk) return 'file_type_not_allowed';
  if (!type && !extOk) return 'file_type_not_allowed';
  return null;
}

export function FileUploadPanel({ disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const onFiles = useCallback(async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || disabled) return;

    const validationError = validateFile(file);
    if (validationError) {
      setResult({ ok: false, error: validationError });
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setBusy(true);
    setResult(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body });
      const json = (await res.json()) as UploadResult;
      if (!res.ok || !json.ok) {
        setResult({ ok: false, error: json.error ?? 'upload_failed' });
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
              Uploaded {result.file.name} ({Math.round(result.file.size / 1024)} KB) — your team can now access it.
            </p>
          ) : null}
          {result && !result.ok ? (
            <p className="mt-3 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {friendlyUploadError(result.error)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
]);

function maxBytes(): number {
  const raw = process.env.UPLOAD_MAX_BYTES;
  if (!raw) return DEFAULT_MAX_BYTES;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES;
}

function storageMode(): 'stub' | 'local' {
  const mode = (process.env.UPLOAD_STORAGE ?? 'stub').toLowerCase();
  return mode === 'local' ? 'local' : 'stub';
}

/** Dev spike: multipart upload; stub by default, optional local disk when UPLOAD_STORAGE=local. */
export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_multipart' }, { status: 400 });
  }

  const entry = formData.get('file');
  if (!(entry instanceof File) || entry.size === 0) {
    return NextResponse.json({ ok: false, error: 'no_file' }, { status: 400 });
  }

  const limit = maxBytes();
  if (entry.size > limit) {
    return NextResponse.json(
      { ok: false, error: 'file_too_large', maxBytes: limit },
      { status: 400 },
    );
  }

  const type = entry.type || 'application/octet-stream';
  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json(
      { ok: false, error: 'file_type_not_allowed', allowed: Array.from(ALLOWED_TYPES) },
      { status: 400 },
    );
  }

  const safeName = entry.name.replace(/[^\w.\-()+ ]+/g, '_').slice(0, 120) || 'upload.bin';
  const meta = { name: safeName, size: entry.size, type };

  if (storageMode() === 'stub') {
    return NextResponse.json({ ok: true, mode: 'stub', file: meta });
  }

  try {
    const dir = path.join(process.cwd(), '.uploads-dev');
    await mkdir(dir, { recursive: true });
    const storedName = `${Date.now()}-${safeName}`;
    const storedPath = path.join(dir, storedName);
    const bytes = Buffer.from(await entry.arrayBuffer());
    await writeFile(storedPath, bytes);
    return NextResponse.json({
      ok: true,
      mode: 'local',
      file: { ...meta, storedPath: `.uploads-dev/${storedName}` },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'storage_failed' }, { status: 500 });
  }
}

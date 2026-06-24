import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-session';
import {
  ALLOWED_TYPES,
  maxUploadBytes,
  persistUpload,
  uploadStorageMode,
} from '@/lib/upload-storage';

/** Authenticated multipart upload — local disk on server (UPLOAD_STORAGE=local) or stub metadata. */
export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

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

  const limit = maxUploadBytes();
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

  try {
    const stored = await persistUpload(entry);
    return NextResponse.json({
      ok: true,
      mode: stored.mode,
      file: stored.file,
      uploadedBy: session.user.id,
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'storage_failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    storage: uploadStorageMode(),
    maxBytes: maxUploadBytes(),
    allowedTypes: Array.from(ALLOWED_TYPES),
    authRequired: true,
  });
}

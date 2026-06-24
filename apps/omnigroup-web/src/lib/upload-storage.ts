import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

export const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
export const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
]);

export type UploadStorageMode = 'stub' | 'local';

export function maxUploadBytes(): number {
  const raw = process.env.UPLOAD_MAX_BYTES;
  if (!raw) return DEFAULT_MAX_BYTES;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES;
}

export function uploadStorageMode(): UploadStorageMode {
  const mode = (process.env.UPLOAD_STORAGE ?? 'local').toLowerCase();
  return mode === 'stub' ? 'stub' : 'local';
}

export function uploadDir(): string {
  const configured = process.env.UPLOAD_DIR?.trim();
  if (configured) return path.resolve(configured);
  if (process.env.NODE_ENV === 'production') {
    return path.join(process.cwd(), 'data', 'uploads');
  }
  return path.join(process.cwd(), '.uploads-dev');
}

export type StoredUpload = {
  name: string;
  size: number;
  type: string;
  storedPath?: string;
};

export async function persistUpload(file: File): Promise<{ mode: UploadStorageMode; file: StoredUpload }> {
  const safeName = file.name.replace(/[^\w.\-()+ ]+/g, '_').slice(0, 120) || 'upload.bin';
  const meta: StoredUpload = { name: safeName, size: file.size, type: file.type || 'application/octet-stream' };

  if (uploadStorageMode() === 'stub') {
    return { mode: 'stub', file: meta };
  }

  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  const storedName = `${Date.now()}-${safeName}`;
  const absolutePath = path.join(dir, storedName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, bytes);

  return {
    mode: 'local',
    file: { ...meta, storedPath: path.relative(process.cwd(), absolutePath).replace(/\\/g, '/') },
  };
}

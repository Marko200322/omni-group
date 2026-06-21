import { config } from '../../../config';

/** Pretvori relativnu putanju (/avatars/...) u pun URL za API i Live Portrait. */
export function resolveAvatarAssetUrl(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = (process.env.AVATAR_PUBLIC_BASE_URL || process.env.WEB_APP_URL || 'http://localhost:3010').replace(
    /\/$/,
    '',
  );
  return `${base}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

export function rosterAssetPaths() {
  return {
    publicBase: process.env.AVATAR_PUBLIC_BASE_URL || 'http://localhost:3010',
    appUrl: config.app.url,
  };
}

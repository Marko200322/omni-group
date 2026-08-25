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

/** Absolute raster URL for HeyGen/D-ID (PNG/JPG — not SVG). */
export function resolveAvatarPhotoUrl(avatarUrl: string, explicitPhotoUrl?: string): string {
  if (explicitPhotoUrl?.trim()) return resolveAvatarAssetUrl(explicitPhotoUrl);
  const trimmed = avatarUrl.trim();
  if (!trimmed) return '';
  if (/\.(png|jpe?g|webp)(\?|$)/i.test(trimmed)) return resolveAvatarAssetUrl(trimmed);
  if (/\.svg(\?|$)/i.test(trimmed)) {
    return resolveAvatarAssetUrl(trimmed.replace(/\.svg(\?.*)?$/i, '.png$1'));
  }
  return resolveAvatarAssetUrl(trimmed);
}

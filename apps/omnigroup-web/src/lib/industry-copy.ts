import { formatPublicTitle } from './industry-catalog';
import FRAMES from './industry-pain-frames.json';

export const BANNED_GENERIC_PAINS = [
  'invoices and delivery status live in different tools',
  'new hires cannot see what the last project promised',
  'support questions repeat because nothing is documented',
  'leads sit in inboxes instead of a pipeline',
  'handoffs between sales and fulfillment get lost',
] as const;

const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'that', 'this', 'your']);

export function nicheWorkNoun(name: string): string {
  return formatPublicTitle(name)
    .replace(/\s*\([^)]+\)\s*$/, '')
    .trim();
}

export function framesForCategory(category: string): string[] {
  const raw = category.trim().toLowerCase();
  const normalized = raw.replace(/-/g, '_');
  const frames = FRAMES as Record<string, string[]>;
  return frames[raw] ?? frames[normalized] ?? [];
}

export function bindWorkFrame(frame: string, work: string): string {
  return frame.replace(/\{work\}/g, work.toLowerCase());
}

export function hashSlug(slug: string): number {
  let hash = 2166136261;
  for (let i = 0; i < slug.length; i += 1) {
    hash ^= slug.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function pickDistinct<T>(items: readonly T[], seed: number, count: number): T[] {
  if (items.length === 0) return [];
  const out: T[] = [];
  const used = new Set<number>();
  for (let i = 0; i < count; i += 1) {
    let idx = (seed + i * 7) % items.length;
    let guard = 0;
    while (used.has(idx) && guard < items.length) {
      idx = (idx + 1) % items.length;
      guard += 1;
    }
    used.add(idx);
    out.push(items[idx] as T);
  }
  return out;
}

export function nicheTokens(work: string): string[] {
  return work
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !STOP.has(token));
}

export function textMentionsNiche(text: string, work: string): boolean {
  const hay = text.toLowerCase();
  if (hay.includes(work.toLowerCase())) return true;
  const tokens = nicheTokens(work);
  return tokens.length > 0 && tokens.every((token) => hay.includes(token));
}

export function containsBannedGenericPain(text: string): boolean {
  const hay = text.toLowerCase();
  return BANNED_GENERIC_PAINS.some((pain) => hay.includes(pain));
}

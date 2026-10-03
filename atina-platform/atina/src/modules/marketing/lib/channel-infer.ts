/** Map UTM / source / medium → marketing channel codes. Never invent spend. */

import { CHANNEL_CODES, type ChannelCode } from './constants';

const SOURCE_MAP: Array<{ re: RegExp; code: ChannelCode }> = [
  { re: /\bgoogle\b|\badwords\b|\bgclid\b/i, code: 'google_ads' },
  { re: /\bmeta\b|\bfacebook\b|\binstagram\b|\bfbclid\b/i, code: 'meta_ads' },
  { re: /\blinkedin\b|\bli\.clid\b/i, code: 'linkedin' },
  { re: /\bemail\b|\bnewsletter\b|\bresend\b/i, code: 'email' },
  { re: /\breferral\b|\bpartner\b/i, code: 'referral' },
  { re: /\boutbound\b|\bcold\b/i, code: 'outbound' },
];

export function inferChannelFromAttribution(attr: Record<string, unknown> | null | undefined): ChannelCode | null {
  if (!attr || typeof attr !== 'object') return null;
  const source = String(attr.utm_source ?? attr.source ?? '').trim();
  const medium = String(attr.utm_medium ?? attr.medium ?? '').trim();
  const combined = `${source} ${medium} ${attr.gclid ?? ''} ${attr.fbclid ?? ''}`;

  if (!combined.trim()) {
    if (attr.utm_campaign || attr.landing_page) return 'organic_direct';
    return null;
  }

  for (const { re, code } of SOURCE_MAP) {
    if (re.test(combined)) return code;
  }

  if (/\bcpc\b|\bppc\b|\bpaid\b/i.test(medium)) return 'google_ads';
  if (/\borganic\b|\bseo\b/i.test(medium) || /\borganic\b/i.test(source)) return 'seo';
  if (/\bemail\b/i.test(medium)) return 'email';
  if (/\breferral\b/i.test(medium)) return 'referral';
  if (!source && !medium) return 'organic_direct';

  // Unknown paid/owned source — do not invent a paid channel id outside seed list
  if (CHANNEL_CODES.includes(source as ChannelCode)) return source as ChannelCode;
  return 'organic_direct';
}

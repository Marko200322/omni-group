// Display formatter helpers za AtinaPublicSnapshot (dashboard / admin klijenti).

import type { AtinaPlanSummary, AtinaPublicSnapshot } from './atina';

export function formatSnapshotLine(s: AtinaPublicSnapshot): string {
  const ts = s.generatedAt;
  const src = s.source;
  const base = s.apiBase;
  return `${src} @ ${base} (${s.plansCount} plans) — ${ts}`;
}

export function formatPlanLine(p: AtinaPlanSummary): string {
  const name = p.name ?? p.slug ?? '(plan)';
  if (p.priceMonthly == null || p.priceMonthly === '') return name;
  const cur = p.currency ?? '';
  return `${name} — ${p.priceMonthly}${cur ? ` ${cur}` : ''}`;
}

export function describeSource(s: AtinaPublicSnapshot): string {
  switch (s.source) {
    case 'live':
      return 'Atina API odgovara, podaci su sveži.';
    case 'partial':
      return 'Atina API delimično odgovara — neki endpoint nije dostupan, vidi errors.';
    case 'unreachable':
      return 'Atina API nije dostupan (host, port ili network).';
    case 'placeholder':
      return 'Privremeni placeholder — originalni helper nije rekonstruisan.';
  }
}


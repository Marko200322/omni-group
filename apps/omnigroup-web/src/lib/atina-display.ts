// Display formatter helpers for AtinaPublicSnapshot (dashboard / admin clients).

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
      return 'Atina API is responding; data is fresh.';
    case 'partial':
      return 'Atina API partially responding — some endpoint unavailable, see errors.';
    case 'unreachable':
      return 'Atina API unreachable (host, port, or network).';
    case 'placeholder':
      return 'Temporary placeholder — original helper not reconstructed.';
  }
}

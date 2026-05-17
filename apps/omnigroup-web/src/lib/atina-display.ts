// Display formatter helpers za AtinaPublicSnapshot — koristi se iz dashboard / admin
// klijent komponenti i potencijalno iz dev/docs panela.
//
// Placeholder kontekst (D.1, 2026-05-13, OneDrive dehidracija):
//   Originalna implementacija je izgubljena pa je rekonstruisana po dokumentovanom
//   `AtinaPublicSnapshot` obliku iz `lib/atina.ts`. Pun runbook:
//   docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md.
//   TODO[D.1-restore]: kad vlasnik vrati pravi sadržaj iz OneDrive cloud-a / Git
//   remote-a, uskladi sa originalom (može biti dodatne formatter funkcije, lokalizacija,
//   currency mapper, itd.) — i obriši ovaj komentar blok.

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


# Master sekvenca **02** — monorepo gate zelen

**Prethodno:** [`MASTER-SEQUENCE-01-BASELINE.md`](./MASTER-SEQUENCE-01-BASELINE.md) · **Sledeće:** [`MASTER-SEQUENCE-03-STAGING-LIVE.md`](./MASTER-SEQUENCE-03-STAGING-LIVE.md)  
**Hub:** [`MASTER-SEQUENCE-HUB.md`](./MASTER-SEQUENCE-HUB.md)

## Cilj

Isti red kao **CI (monorepo)** lokalno: [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) — **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md) → pytest → Atina `test:ci` → `apps/omnigroup-web` build → Nest `verify:ci` + tri `docker compose config`. **Smoke** (kad servisi rade): [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) ↔ **`npm run smoke:all`** u `atina-platform/atina` — [`scripts/README.md`](../scripts/README.md); Atina bundled gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*).

## Checklist

- [ ] Iz korena: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-monorepo.ps1` — **bez** `-Skip*` osim ako si eksplicitno dogovorio izuzetak ([`scripts/README.md`](../scripts/README.md)).
- [ ] Ako Nest korak puca: ispravi **Port mismatch** ili očisti DB (lista **01**), pa ponovi.
- [ ] Opciono: `.\scripts\smoke-stack.ps1` kada su Astra + Nest (+ Node) podignuti — upiši u [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) po šablonu ([`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md)).
- [ ] Opciono: u `atina-platform/atina` **`npm run smoke:all`** — isti dry-run / release zapis ako tim vodi evidenciju.

## Dokaz

- Ažuriraj [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (novi **Val** po [`scripts/README.md`](../scripts/README.md)).
- Kratki blok u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md) (par [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) ↔ **`npm run smoke:all`** / **`smoke:all`** — *Smoke napomena*).

## Veze

- [`NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md) · [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md) (red #2)

---

*Lista 02 — gate zelen.*

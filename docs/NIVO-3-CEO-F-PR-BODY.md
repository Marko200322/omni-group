# Nivo 3 — predloženo telo PR-a za CEO sekciju F

**Stanje 2026-05:** Stavke **CEO sekcije F** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) su **`[x]`** (solo vlasnik repoa), uz trag u [`NIVO-3-PDF-TRACE.md`](./NIVO-3-PDF-TRACE.md) i [`nivo3-wave-a/`](./nivo3-wave-a/). Ovaj fajl služi kao **arhiva odluke** i primer za buduće revizije.

**Evidencija / šabloni (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`../scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

## Uslov zatvaranja (korišćen)

- Inženjerski **partial** prihvaćen kao dovoljan dokaz (nije celokupan PDF audit).
- Linkovi na wave fajlove uz svaki red F.
- **P.N2.2 / F.4:** u [`NIVO-3-MASTER-CHECKLIST.md`](../NIVO-3-MASTER-CHECKLIST.md) je **`[x]`** uz lokalni dokaz (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13); ranije **Val 349** / 2026-05-08). Uslov: pet jobova **CI (monorepo)** na `main` — job **`python`** (required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)): **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md), zatim `pytest` — **ili** lokalni pun [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) uključujući **`apps/omnigroup-web`** build osim dogovorenog **`-SkipOmnigroupWeb`**; **`-SkipDocAudit`** samo lokalno; **Port mismatch** Nest/pg — [`NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md) · [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) (HTTP, opciono; Atina Node stub = GET `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*) · [`scripts/README.md`](../scripts/README.md) · **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14). Kontinuirani zeleni CI posle svakog merge-a na `main` — red **0.3** u [`NIVO-2-MASTER-CHECKLIST.md`](../NIVO-2-MASTER-CHECKLIST.md).

## Primer diff formata (istorija)

```markdown
# (već primenjeno u CHECKLIST-CEO-SISTEM.md)

- [x] `Titan_System_Modules_Master_Spec_v2.pdf` — … *(trag: NIVO-3-PDF-TRACE + nivo3-wave-a/01-… )*
```

## Revizija (kad tim poraste)

Ako kasnije postoji drugi reviewer, može vratiti pojedini red na `[ ]` i tražiti **aligned** ili stranični audit — do tada važi solo zatvaranje.

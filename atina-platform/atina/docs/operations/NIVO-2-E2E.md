# Nivo 2 — E2E / integracioni tok (trag **CEO sekcije D**)

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](../../../../docs/EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](../../../../docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../../../../scripts/README.md) — **Kad podigneš novi broj**.

## Šta je „gate“ simulacija u repou

Integracioni test **`src/tests/integration/workflow-chain.core-business-flow.integration.test.ts`** izvršava tok:

1. **CRM** — `create-contact` (lead)
2. **Contracts** — `create` (draft ugovor)
3. **Payments** — `record-manual`
4. **Analytics** — `track`

Supertest + Postgres (`query`), JWT iz `config.jwt.secret`. Nakon `run` proverava se da su redovi upisani u `crm_contacts`, `contracts`, `payments`, `analytics_events`.

To zadovoljava **Nivo 2** zahtev za **jednu automatsku simulaciju** kroz kritičan poslovni lanac (orchestracija preko `workflow-chain`), uz uslov da se integracioni job pokreće u CI / lokalno sa bazom.

## Kako pokrenuti lokalno

Iz `atina-platform/atina`:

```powershell
Set-Location "…\atina-platform\atina"
npm run db:up
npm run migrate
npm run test:integration:local
```

Ili samo integracioni fajl (zahteva živu Postgres instancu i migracije):

```powershell
npx jest --runInBand src/tests/integration/workflow-chain.core-business-flow.integration.test.ts
```

## Staging / produkcija

**Bez tajni u gitu:** `BASE_URL` ili slično za budući Playwright/Supertest protiv staginga — konfiguriši u CI secrets ili `.env` (ne commitovati).

Webhook testovi (Stripe itd.) = poseban staging korak; nisu uslov za unit job **`npm run test:ci`**.

## 3. Pun CoreEngine + montirani moduli (E2E.3)

Fajl: **`src/tests/integration/core-engine.full-stack.integration.test.ts`**.

- Podiže **`CoreEngine`** sa pravom Postgres vezom (kao produkcioni put bez `start()`).
- Proverava **`GET /health`**, **`GET /api/v1`** (lista modula) i da su svi očekivani **slug**-ovi prisutni.
- Za svaki registrovani modul šalje **`GET /api/v1/<slug>`** i očekuje status koji **nije** HTTP 5xx (401/403/404 su prihvatljivi za neautentifikovane pozive).

**Pokretanje:** isto kao odjeljak 2 — `npm run test:integration:local` (baza + migracije).

## Veza ka matrici / listama

- [`CHECKLIST-CEO-SISTEM.md`](../../../../CHECKLIST-CEO-SISTEM.md) — glavna matrica (**CEO sekcije A–H**)
- [`NIVO-2-MASTER-CHECKLIST.md`](../../../../NIVO-2-MASTER-CHECKLIST.md) — **E2E.1**, **E2E.2**, **E2E.3**
- [`NIVO-2-CEO-D-TRACE.md`](../../../../docs/NIVO-2-CEO-D-TRACE.md) — **CEO sekcija D** (trag)
- Pun **CI (monorepo)** (job **`python`**: **`Python (Doslednost dok + pytest)`** na GitHubu — [`GIT-BRANCH-PROTECTION.md`](../../../../docs/GIT-BRANCH-PROTECTION.md)) mirror iz korena repoa: [`verify-monorepo.ps1`](../../../../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](../../../../docs/GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](../../../../scripts/smoke-stack.ps1) (HTTP posle servisa; Atina Node stub = **GET** `/health`; bundled **`npm run smoke:all`** u ovom paketu — [`release-gate-checklist.md`](./release-gate-checklist.md) *Local notes — Smoke tests*) · [`scripts/README.md`](../../../../scripts/README.md) (**Get-Help**, **`-SkipOmnigroupWeb`** / **`-SkipNestVerifyCi`** / **`-SkipCompose`** / **`-SkipDocAudit`**, **Port mismatch** za Nest/pg) · **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../../../../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `docs/D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../../../../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14) · **F.4** [`NIVO-1-F4-TIM-CHECKLIST.md`](../../../../docs/NIVO-1-F4-TIM-CHECKLIST.md).

# Nivo 3 — Talas A6: G (ops) + audit + vizija V.1/V.2

**Agent:** N3-A6 · **Samo ovaj fajl.**

**Evidencija / šabloni (indeks + dry-run):** [`../EVIDENCE-INDEX.md`](../EVIDENCE-INDEX.md) · [`../NIVO-1-DRYRUN-LOG.md`](../NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`../../scripts/README.md`](../../scripts/README.md) — **Kad podigneš novi broj**.

## Zadatak (bez menjanja `CHECKLIST-CEO-SISTEM.md` u ovom talasu)

1. **G.N3.1:** Pregled **CEO sekcije G** u [`CHECKLIST-CEO-SISTEM.md`](../../CHECKLIST-CEO-SISTEM.md) — za svaku stavku napiši: **repo** (šta već postoji u `atina-platform/atina/docs/operations/`) vs **tim/staging** (šta ne može agent).
2. **G.N3.2:** Kratak plan `npm audit` / dependency refresh (Node, Nest, root) sa linkom na postojeće [`atina-system/docs/NPM-AUDIT-NIVO1.md`](../../atina-system/docs/NPM-AUDIT-NIVO1.md) ako relevantno.
3. **V.1 / V.2:** Preporuka **N/A za trenutni ciklus** ili „faza 2“ — jedan jasan pasus (biznis odluka placeholder za tim).

## Izlaz (popuni)

### G — matrica repo vs tim

| Stavka G (kratko) | Repo dokaz | Tim/staging |
|-------------------|------------|---------------|
| npm run build u prod | `deploy-rollback-checklist.md` — matrica staging/prod uključuje **Build gate** `npm run build` (exit 0); `NIVO-1-GATE.md` i `release-gate-checklist.md` vezuju lint/test/smoke pre odluke o release-u. | Izvršavanje builda u **pravom** prod okruženju (image/CI job, artefakti, verifikacija na target infrastrukturi) — nije dokaz iz samog repoa. |
| Migracije staging | `NIVO-1-GATE.md` (`npm run migrate` lokalno); `db-backup-restore-runbook.md`, `db-rollback-drill-runbook.md` i `deploy-rollback-checklist.md` — snapshot pre prozora, rollback putanja, drill sekvence. | Pregled migracija na **staginškom** Postgresu (redosled, down/forward-only rizik, potpis DB inženjera), izvršavanje van agenta. |
| .env prod | `production-config-matrix.md` — obavezni `NODE_ENV`, `DB_SSL`, JWT/DB/Redis tajne, politika „nema default prod kredencijala“. `NIVO-1-GATE.md` odjeljak 3 upućuje na matricu. | Unos vrednosti u secret store / boot env za konkretan tenant, audit pristupa — van repoa. |
| Stripe live | `production-config-matrix.md` odjeljak 4 — `STRIPE_*`, PayPal (`PAYPAL_MODE=live`), Wise; uslovno obavezno kad je provajder uključen. | Live ključevi, **webhook secreti** u Stripe/PayPal/Wise konzolama, test transakcija na staging pa cutover na live — tim + finansije. |
| SMTP | `production-config-matrix.md` odjeljak 3 — `SMTP_ENABLED`, host, kredencijali, `EMAIL_FROM`; „conditional“ kada je email obavezan. | Izbor provajdera, SPF/DKIM, probno slanje iz staging/prod, monitoring bounce-a — operacije. |
| Smoke (Atina Node) | `release-gate-checklist.md` (*Local notes — Smoke tests*) — **`npm run smoke:all`** / `scripts/smoke-all.ps1` (health, login, `/me`, `forge/status`, execution-stats, forge-admin). Granularno: `deploy-rollback-checklist.md` (`smoke-health`, `smoke-auth`, forge, workflow-template, forge-admin); `production-config-matrix.md`; `NIVO-1-GATE.md`. | Pokretanje sa **STAGING_/PROD_** URL i admin nalogom, čuvanje evidence JSON-a, odluka PASS/FAIL — tim na mreži. |
| Admin overview | `deploy-rollback-checklist.md` i `monitoring-alert-channel-policy.md` — `GET /api/v1/admin/overview`, pragovi, eskalacija; integracioni koraci u staging/prod matrici. | Bearer token u prod, trend provere na pravom saobraćaju, povezivanje sa alerting kanalom — on-call / release. |
| Rollback vlasnik | `deploy-rollback-checklist.md` (vlasnik, triggeri, izvršni koraci); `release-signoff-template.md` (Rollback Owner); `release-gate-checklist.md` (rollback pre GO). | Imenovanje vlasnika, `db-rollback-drill` u dogovorenom prozoru, incident odluka continue/rollback — organizacija, ne kod. |

**Listing `atina-platform/atina/docs/operations/*.md` (referenca):** `NIVO-1-GATE.md`, `NIVO-1-SMOKE-EVIDENCE.template.md`, `NIVO-2-E2E.md`, `NIVO-3-G-ALIGNMENT.md`, `db-backup-restore-runbook.md`, `db-rollback-drill-runbook.md`, `deploy-rollback-checklist.md`, `digital-signature-wiring-checklist.md`, `monitoring-alert-channel-policy.md`, `production-config-matrix.md`, `release-gate-checklist.md`, `release-signoff-template.md`.

**Pun monorepo** (isti red kao GitHub CI (monorepo) na `main`: job **`python`**, prikaz **`Python (Doslednost dok + pytest)`** — [`../GIT-BRANCH-PROTECTION.md`](../GIT-BRANCH-PROTECTION.md); lokalno — **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../scripts/README.md) → pytest → Atina `test:ci` → **`apps/omnigroup-web`** build → Nest `verify:ci` + tri `docker compose config`; opciono **`-SkipOmnigroupWeb`** / **`-SkipDocAudit`** lokalno): [`verify-monorepo.ps1`](../../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`../GIT-BRANCH-PROTECTION.md`](../GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](../../scripts/smoke-stack.ps1) (HTTP, opciono; Atina Node stub = GET `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../../atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*) · [`scripts/README.md`](../../scripts/README.md) (**Port mismatch** Nest/pg) · **F.4** [`../NIVO-1-F4-TIM-CHECKLIST.md`](../NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify:** [`../NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`../NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

### Audit plan (rezime)

Za **Nest / `atina-system`** pratiti postojeći nivo-1 izveštaj i procedure u [`atina-system/docs/NPM-AUDIT-NIVO1.md`](../../atina-system/docs/NPM-AUDIT-NIVO1.md): `npm run audit:level1` / `audit:json` za snapshot produkcijskog stabla; prvo `npm audit fix` bez `--force`, smoke `npm ci && npm run verify:ci`; zatim **jedan planirani PR** sa usklađenim bump-om `@nestjs/*` (multer/lodash/core/file-type lanac) uz changelog — izbegavati slepo `npm audit fix --force` na `main`. Za **`atina-platform/atina`** (Node SaaS iz **CEO sekcije G**) isti princip na korenu paketa: `npm ci`, `npm audit` / `npm audit --omit=dev`, dokumentovati diff `package-lock.json`, CI build + `smoke:all` pre merge-a. [`CHECKLIST-CEO-SISTEM.md`](../../CHECKLIST-CEO-SISTEM.md) — **CEO sekcija G** veže produkcioni gate na README/operations; audit zavisnosti je paralelan, ne zamena za staging migracije, live Stripe ili SMTP provere.

### Vizija K8s / AI

**N/A za trenutni ciklus.** Nema u repou dokaza da je Kubernetes ili AI sloj uslov za zatvaranje G stavki; trenutni gate je dokumentovan kroz postojeće runbook-ove (deploy/rollback, config matrica, smoke). Eventualna **faza 2** (orchestracija u K8s, AI ops asistent) ostaje biznis/arhitektonska odluka tima kada budu zadovoljeni Nivo 1–3 dokazi na staging/prod — van opsega ovog talasa.

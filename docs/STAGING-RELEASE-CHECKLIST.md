# Staging release gate (pre produkcije)

**Kratak opis (SR):** Uređen prolaz na **stagingu** za release kandidata **posle** deploya i **pre** promocije istog artefakta/commita u **produkciju**. Tehnički deploy, rollback i **CEO sekcija G:** [`deploy-rollback-checklist.md`](../atina-platform/atina/docs/operations/deploy-rollback-checklist.md) · glavna matrica [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md).

Run this **ordered** gate on the release candidate **after** it is deployed to staging and **before** promoting the same artifact/commit to production. For deploy mechanics, rollback, and **CEO sekcija G** details, see [`deploy-rollback-checklist.md`](../atina-platform/atina/docs/operations/deploy-rollback-checklist.md) and [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md).

**Pre toga (staging = prod pattern):** env / DB / tajne / smoke paritet — [`STAGING-MIRROR-PROD.md`](./STAGING-MIRROR-PROD.md).

**Pri zatvaranju staging prolaza:** kopiraj evidenciju iz [`STAGING-EXECUTION-LOG.template.md`](./STAGING-EXECUTION-LOG.template.md).

**Otvorene stavke u CEO sekcijama A–H (prod/staging) + šabloni:** [`CEO-OPEN-BULLETS-RUNBOOK.md`](./CEO-OPEN-BULLETS-RUNBOOK.md); jedan sign-off blok za **CEO sekciju G** — [`CEO-G-PRODUCTION-EVIDENCE.template.md`](./CEO-G-PRODUCTION-EVIDENCE.template.md) *(popuni posle staginga; produkcija može imati odvojen fajl `CEO-G-EVIDENCE-LATEST.md` po dogovoru)*.

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

**Next — interni dok hub:** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** — [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md).

1. **Release identity** — Record branch/tag, commit SHA, and build/image id in the change or release note.

2. **Migrations review (staging)**  
   - [ ] **Snapshot:** staging DB backup or snapshot taken; ID recorded (see [`atina-platform/atina/docs/operations/db-backup-restore-runbook.md`](../atina-platform/atina/docs/operations/db-backup-restore-runbook.md)).  
   - [ ] **Diff:** list new or changed files under `atina-platform/atina/src/database/migrations/` (and Nest `atina-system/src/database/migrations/` if in scope) vs last promoted release; attach PR or ticket link.  
   - [ ] **Risk:** locking, duration, backfills, nullable columns, forward-only vs reversible path — align with rollback/runbooks if needed.  
   - [ ] **Apply once:** run the migration job **once** per staging deploy; confirm app logs and `GET /health` after apply.

3. **`test:ci` (Atina Node)** — From `atina-platform/atina`, `npm run test:ci` is **green** on the branch that will ship (same commit as staging). For full monorepo parity (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md) + pytest + Atina + **`apps/omnigroup-web`** build + Nest + ×3 compose), use root **CI (monorepo)** (job **`python`**: **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) or [`scripts/verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (optional **`-SkipOmnigroupWeb`** / **`-SkipDocAudit`** locally) per [`NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md). **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14). Lokalni Nest **`verify:ci`**: **Port mismatch** u [`scripts/README.md`](../scripts/README.md).

4. **`smoke-stack` (HTTP, staging URLs)** — After services are up on staging, run [`scripts/smoke-stack.ps1`](../scripts/smoke-stack.ps1) with **staging** bases (not localhost), e.g. `-AtinaNodeBase "https://<STAGING_HOST>"` and other stack flags as in [`scripts/README.md`](../scripts/README.md) and `Get-Help .\scripts\smoke-stack.ps1 -Full`. Capture PASS/fail in the release record. **LATEST smoke** (**sekcija H**, tri-stub — repo root, lokalno): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14). **Napomena:** za Atina Node, `smoke-stack` šalje samo **`GET /health`** kada je Node uključen — za login, `/me`, Forge i admin bundle koristi **opciono** iz `atina-platform/atina`: `npm run smoke:all -- -BaseUrl "https://<STAGING_HOST>"` (+ `-Email` / `-Password` po potrebi); redosled koraka (formalni Atina release gate): [`atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*).

5. **Webhook dry-run (billing / payments)** — Execute the staging dashboard steps and evidence pattern in [`NIVO-2-STAGING-WEBHOOKS.md`](./NIVO-2-STAGING-WEBHOOKS.md) (Stripe / PayPal sandbox **Send test webhook** → HTTP 200, no secret leakage in logs). Close the trail toward **CEO sekcija G** when accepted.

6. **Sign-off** — Staging owner confirms odjeljci 2–5; only then proceed with production deploy using the production runbook steps and config matrix in `deploy-rollback-checklist.md`. Za **CEO sekciju G** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md): popuni redove u [`CEO-G-PRODUCTION-EVIDENCE.template.md`](./CEO-G-PRODUCTION-EVIDENCE.template.md) koji se odnose na **staging** (migracije, smoke URL-ovi, webhook sandbox) pre nego što lista pređe u „prod green“.

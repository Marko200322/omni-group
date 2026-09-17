# Preostalih stavki u CEO sekcijama A–H (`- [ ]` — do 100% liste)

*Ime fajla `CEO-OPEN-BULLETS-RUNBOOK.md` je istorijsko (*bullets* = Markdown stavke); u ostalim dokovima koristi se reč **stavke** i **CEO sekcije A–H** — vidi [`README.md`](../README.md) (**Terminologija**).*

> **Kanonska lista:** [`STATUS-KANON.md`](./STATUS-KANON.md) · live snapshot [`REPO-STATUS-NOW.md`](./REPO-STATUS-NOW.md)  
> **CEO A (Git protection) = DONE.** Nest TypeORM prod = **N/A** (Nest nije u live Docker).

**Pregled 2026-09-06:** otvoreno uglavnom **CEO G** (live Stripe, SMTP invoice, rollback owner, staging ritual) + opcione stavke. Ne brojati “10” slepo iz maj 2026 revizije.

**Pun spoj svih izvornih lista + red rada:** [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md).

**Sve što moraš ti (jedna strana):** [`STATUS-KANON.md`](./STATUS-KANON.md) · [`VLASNIK-ZAVRSAVA.md`](./VLASNIK-ZAVRSAVA.md) · kratko: [`ADMIN-JEDNA-LISTA.md`](./ADMIN-JEDNA-LISTA.md).

**Brzi paket (4 koraka, popunjavanje šablona redom):** [`VLASNIK-PAKET.md`](./VLASNIK-PAKET.md).

Izvor istine CEO matrice: [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md). Ovde su **otvorene / delimične** stavke + gde zalepiti dokaz.

**Interni pregled dokova u browseru:** ruta **`/dev/docs`** u [`apps/omnigroup-web`](../apps/omnigroup-web/) (Next dev server). Širi runbook kontekst (uklj. Next marketing / SEO u indeksu): [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md).

| # | Sekcija | Stavka (ukratko) | Status 2026-09-06 | Šablon / uputstvo |
|---|---------|------------------|------------------|-------------------|
| 1 | **CEO sekcija A** | `main` zaštićen, PR obavezni | **DONE** | [`GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md) |
| 2 | **CEO sekcija C** | Prod TypeORM Nest | **N/A** (Nest out of live Docker) | [`TYPEORM-PROD-EVIDENCE-LATEST.md`](./TYPEORM-PROD-EVIDENCE-LATEST.md) |
| 3–10 | **CEO sekcija G** | Build/smoke/admin OK; Stripe **test** + SMTP + rollback **DONE**; Stripe **live** + staging VPS još open | **partial** | [`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md) · [`REPO-STATUS-NOW.md`](./REPO-STATUS-NOW.md) |

**Agent deploy handoff (sekcija I u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md)) — 6 stavki vlasnika posle agenta:**

| # | Stavka | Uputstvo / skripta |
|---|--------|-------------------|
| I.1 | GitHub prv push | [`GITHUB-PUSH-READY.md`](./GITHUB-PUSH-READY.md) · `scripts/verify-agent-handoff.ps1` |
| I.2 | Disk ≥5 GB | `scripts/disk-report.ps1` · `scripts/free-disk-space.ps1` |
| I.3 | Resend kontakt (D.2) | `apps/omnigroup-web/.env.local` · `scripts/test-contact-resend.ps1` |
| I.4 | Atina `.env` agregatori + Stripe | `scripts/check-atina-aggregators.ps1` · `scripts/check-stripe-env.ps1` |
| I.5 | Staging deploy | [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md) |
| I.6 | (Opciono) Atina SMTP staging | [`SMTP-STAGING-RUNBOOK.md`](./SMTP-STAGING-RUNBOOK.md) |

Izvor agent opsega: [`AGENT-DEPLOY-CHECKLIST.md`](./AGENT-DEPLOY-CHECKLIST.md) (status: agent završio).

**Repo / N1 već zatvoreno (ne dupliraj ovde):** F.4 mirror (pet **GitHub** jobova u `ci-monorepo.yml`; job **`python`** (required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)): **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md), zatim `pytest`; lokalno isti red — **`verify-monorepo.ps1`** uklj. **`omnigroup-web`** osim **`-SkipOmnigroupWeb`**; **`-SkipDocAudit`** samo lokalno; **Port mismatch** Nest/pg — [`scripts/README.md`](../scripts/README.md)) — **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14); deljeni vault — **CEO sekcija B** — [`VAULT-B-EVIDENCE-LATEST.md`](./VAULT-B-EVIDENCE-LATEST.md).

**Makro plan:** [`COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md`](./COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md) odjeljak 0.

**Evidencija / šabloni (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

**Smoke (`smoke-stack` vs `npm run smoke:all`):** kratka definicija na vrhu [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md); operativni red **#10** u [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md); staging matrica — [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md); bundled Atina — [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*).

*Kontributori (bez zatvaranja gornjih stavki u **CEO sekcijama A–H**):* monorepo dokaz — **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14) · [`scripts/README.md`](../scripts/README.md) (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u istom README-u; **`-SkipOmnigroupWeb`** kad ne diraš Next app; **`-SkipDocAudit`** samo lokalno bez doc gate audita); Nest e2e / cron pri gašenju — [`atina-system/README.md`](../atina-system/README.md) (*CI*) · [`CONTRIBUTING.md`](../CONTRIBUTING.md) (stavka ispod TypeORM migracija).

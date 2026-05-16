# Preostalih 10 stavki u CEO sekcijama A–H (`- [ ]` — do 100% liste)

*Ime fajla `CEO-OPEN-BULLETS-RUNBOOK.md` je istorijsko (*bullets* = Markdown stavke); u ostalim dokovima koristi se reč **stavke** i **CEO sekcije A–H** — vidi [`README.md`](../README.md) (**Terminologija**).*

**Pregled 2026-05-10:** i dalje **10** otvorenih stavki; evidencije ispod nisu ažurirane na **Pass** — vidi blok *Stanje revizije* u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md).

**Pun spoj svih izvornih lista + red rada:** [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md).

**Sve što moraš ti (jedna strana):** [`VLASNIK-ZAVRSAVA.md`](./VLASNIK-ZAVRSAVA.md).

**Brzi paket (4 koraka, popunjavanje šablona redom):** [`VLASNIK-PAKET.md`](./VLASNIK-PAKET.md).

Izvor istine: [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) (ukupno **68** stavki; **58** zatvoreno, **~85%**). Ulazi: [`NIVO-1-START.md`](../NIVO-1-START.md), [`CONTRIBUTING.md`](../CONTRIBUTING.md). Ovde su samo **otvorene** stavke + gde zalepiti dokaz.

**Interni pregled dokova u browseru:** ruta **`/dev/docs`** u [`apps/omnigroup-web`](../apps/omnigroup-web/) (Next dev server). Širi runbook kontekst (uklj. Next marketing / SEO u indeksu): [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md).

| # | Sekcija | Stavka (ukratko) | Šablon / uputstvo |
|---|---------|------------------|-------------------|
| 1 | **CEO sekcija A** | `main` zaštićen, PR obavezni | [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) · evidencija: [`GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md) |
| 2 | **CEO sekcija C** | Prod: `TYPEORM_SYNC=false` + migracije na prod DB | [`atina-system/docs/TYPEORM-PRODUCTION-CHECKLIST.md`](../atina-system/docs/TYPEORM-PRODUCTION-CHECKLIST.md) · evidencija: [`TYPEORM-PROD-EVIDENCE-LATEST.md`](./TYPEORM-PROD-EVIDENCE-LATEST.md) |
| 3–10 | **CEO sekcija G** | Build prod, staging migracije, `.env` prod, live plaćanja, SMTP, smoke, admin monitoring, rollback vlasnik | [`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md) · [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md) · [`atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) |

**Repo / N1 već zatvoreno (ne dupliraj ovde):** F.4 mirror (pet **GitHub** jobova u `ci-monorepo.yml`; job **`python`** (required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)): **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md), zatim `pytest`; lokalno isti red — **`verify-monorepo.ps1`** uklj. **`omnigroup-web`** osim **`-SkipOmnigroupWeb`**; **`-SkipDocAudit`** samo lokalno; **Port mismatch** Nest/pg — [`scripts/README.md`](../scripts/README.md)) — **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14); deljeni vault — **CEO sekcija B** — [`VAULT-B-EVIDENCE-LATEST.md`](./VAULT-B-EVIDENCE-LATEST.md).

**Makro plan:** [`COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md`](./COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md) odjeljak 0.

**Evidencija / šabloni (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

**Smoke (`smoke-stack` vs `npm run smoke:all`):** kratka definicija na vrhu [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md); operativni red **#10** u [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md); staging matrica — [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md); bundled Atina — [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*).

*Kontributori (bez zatvaranja gornjih stavki u **CEO sekcijama A–H**):* monorepo dokaz — **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14) · [`scripts/README.md`](../scripts/README.md) (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u istom README-u; **`-SkipOmnigroupWeb`** kad ne diraš Next app; **`-SkipDocAudit`** samo lokalno bez doc gate audita); Nest e2e / cron pri gašenju — [`atina-system/README.md`](../atina-system/README.md) (*CI*) · [`CONTRIBUTING.md`](../CONTRIBUTING.md) (stavka ispod TypeORM migracija).

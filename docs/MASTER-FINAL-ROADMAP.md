# Roadmap do finalnog kraja — ceo Omni Group monorepo

**Svrha:** jedan **redosled od početka do kraja** (bez zamene za detaljne matrice). Koristi `[ ]` / `[x]` ovde za *tvoj* napredak; kanonske CEO checkboxe i dalje ažuriraj u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md).

**Kratak put (izvršavanje):** [`MASTER-SEQUENCE-HUB.md`](./MASTER-SEQUENCE-HUB.md) → liste **01–05**. **Spoj svih redova u jednoj tabeli:** [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md). **Makro procene i dimenzije:** [`COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md`](./COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md).

**Monorepo evidencija (indeks + dry-run par):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Vlasnik (nalozi, server, novac):** [`VLASNIK-ZAVRSAVA.md`](./VLASNIK-ZAVRSAVA.md).

**Gate (jednom u dokumentu — isti zahtev kao CI):** [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) uklj. **`apps/omnigroup-web`** osim **`-SkipOmnigroupWeb`**; **`npm run smoke:all`** u `atina-platform/atina` — [`scripts/README.md`](../scripts/README.md). **Smoke tri-stub:** [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) ↔ **`npm run smoke:all`** — isti README; formalni Atina gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*). *Dalje u tekstu: „gate skripta“ = gornji red.*

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

---

## Legenda

| Oznaka | Značenje |
|--------|----------|
| **(R)** | U repou je već tipično završeno — ovde stavi `[x]` kad potvrdiš na svojoj mašini ili u CI |
| **(V)** | **Vlasnik** — nalog, novac, host, pravni korak |
| **(T)** | **Tim / product** — odluka šta ulazi u proizvod |

---

## P0 — Bezbednost pre svega

- [x] **(R)** `.gitignore` / tajne samo u `.env` — politika u [`AKCIONI-PLAN-NOVITETI-I-CEO.md`](./AKCIONI-PLAN-NOVITETI-I-CEO.md).

---

## P1 — Mašina i repo (lista 01)

- [ ] **(R)** Klon, alati, Python `pytest`, čist Postgres za Nest migracije — [`MASTER-SEQUENCE-01-BASELINE.md`](./MASTER-SEQUENCE-01-BASELINE.md) · [`NIVO-1-START.md`](../NIVO-1-START.md)

---

## P2 — Monorepo gate zelen (lista 02)

- [ ] **(R)** Pun prolaz gate skripte + ažurirana verify evidencija — [`MASTER-SEQUENCE-02-GATE-GREEN.md`](./MASTER-SEQUENCE-02-GATE-GREEN.md) · [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md)
- [ ] **(R)** HTTP smoke (kad su servisi gore) — [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) · [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) ↔ **`npm run smoke:all`**

---

## P3 — Nivo 1 (F.4 / F.5, inženjerski opseg)

- [ ] **(R)** [`NIVO-1-MASTER-CHECKLIST.md`](../NIVO-1-MASTER-CHECKLIST.md) — F.4 / F.5 u skladu sa timom
- [ ] **(R)** CEO **CEO sekcije B, H** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) — potvrda posle svakog većeg release ciklusa

---

## P4 — Python stack (Forge / worker / Astra)

- [ ] **(R)** Compose + Astra smoke — [`PYTHON-ASTRA-OPS.md`](./PYTHON-ASTRA-OPS.md) · **CEO sekcija B** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md)
- [ ] **(R)** Deljeni vault sa Node Forge kad je zajednički deploy — [`VAULT-B-INTEGRATED-RUNBOOK.md`](./VAULT-B-INTEGRATED-RUNBOOK.md) · [`VAULT-B-EVIDENCE-LATEST.md`](./VAULT-B-EVIDENCE-LATEST.md)

---

## P5 — Nest (`atina-system`)

- [ ] **(R)** Lokalno / CI: `verify:ci` ili bar `verify:n1` — [`atina-system/README.md`](../atina-system/README.md)
- [ ] **(V)** **Produkcija:** `TYPEORM_SYNC=false` + migracije na prod DB — **CEO sekcija C** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) · [`TYPEORM-PROD-EVIDENCE-LATEST.md`](./TYPEORM-PROD-EVIDENCE-LATEST.md) · [`TYPEORM-PRODUCTION-CHECKLIST.md`](../atina-system/docs/TYPEORM-PRODUCTION-CHECKLIST.md)

---

## P6 — Atina Node SaaS (`atina-platform/atina`)

- [ ] **(R)** `test:ci`, integracioni suite po runbook-u — [`atina-platform/atina/README.md`](../atina-platform/atina/README.md) · [`NIVO-2-E2E.md`](../atina-platform/atina/docs/operations/NIVO-2-E2E.md)
- [ ] **(R)** Dubina modula po riziku — [`COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md`](./COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md) odjeljak **2.1** · [`NIVO-2-CEO-D-TRACE.md`](./NIVO-2-CEO-D-TRACE.md)

---

## P7 — Next (`apps/omnigroup-web`)

- [ ] **(R)** Build u monorepo gate-u — [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md)
- [ ] **(T)** Povezivanje dashboarda / klijenta na Atina API u pravom okruženju — [`FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md) · [`FAZA-4-SAAS-DECISION.md`](./FAZA-4-SAAS-DECISION.md)

---

## P8 — Staging kao mali prod (lista 03)

- [ ] **(V/T)** Staging stack, migracije, mirror tajni — [`MASTER-SEQUENCE-03-STAGING-LIVE.md`](./MASTER-SEQUENCE-03-STAGING-LIVE.md) · [`STAGING-MIRROR-PROD.md`](./STAGING-MIRROR-PROD.md) · [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md)
- [ ] **(V)** Webhook / SMTP staging ako treba — [`NIVO-2-STAGING-WEBHOOKS.md`](./NIVO-2-STAGING-WEBHOOKS.md) · [`SMTP-STAGING-RUNBOOK.md`](./SMTP-STAGING-RUNBOOK.md)

---

## P9 — Produkcijski cutover (lista 04)

- [ ] **(V)** **CEO sekcija A** — Git `main` + PR + [`GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md)
- [ ] **(V)** **CEO sekcija G** — build prod, `.env`, live plaćanja, SMTP, `npm run smoke:all` na prod URL, admin, rollback — [`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md) · [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) · [`deploy-rollback-checklist.md`](../atina-platform/atina/docs/operations/deploy-rollback-checklist.md)
- [ ] **(V)** P5 prod (Nest) ako još nije — ista **CEO sekcija C**

---

## P10 — Održavanje (lista 05)

- [ ] **(T)** CI zelen na `main` posle merge-a — [`CI-GREEN-ON-MAIN.md`](./CI-GREEN-ON-MAIN.md) · [`NIVO-2-MASTER-CHECKLIST.md`](../NIVO-2-MASTER-CHECKLIST.md) red **0.3**
- [ ] **(T)** Observability ritual — [`OBSERVABILITY-RUNBOOK.md`](./OBSERVABILITY-RUNBOOK.md)
- [ ] **(R)** Pre većih izmena: ponovi gate skriptu iz uvodnog bloka

---

## P11 — Nivo 2 (Master Spec — održavanje i dubina)

- [ ] **(R)** [`NIVO-2-MASTER-CHECKLIST.md`](../NIVO-2-MASTER-CHECKLIST.md) — zatvori preostale `[ ]` ako ih ima
- [ ] **(R)** PDF pravila / zatvaranje — [`NIVO-2-CEO-PDF-RULES-CLOSURE.md`](./NIVO-2-CEO-PDF-RULES-CLOSURE.md)

---

## P12 — Nivo 3 (PDF trag i vizija u repou)

- [ ] **(R/T)** [`NIVO-3-MASTER-CHECKLIST.md`](../NIVO-3-MASTER-CHECKLIST.md) · [`NIVO-3-PDF-TRACE.md`](./NIVO-3-PDF-TRACE.md)
- [ ] **(T)** **Faza 6** — K8s / pun AI samo ako product menja **N/A** — [`NIVO-3-VISION-K8S-AI.md`](./NIVO-3-VISION-K8S-AI.md) · [`FAZA-6-BACKLOG.md`](./FAZA-6-BACKLOG.md)

---

## P13 — Alati i sporedni proizvodi

- [ ] **(T)** YouTube / Celery pipeline u ciljanom okruženju — [`tools/youtube-pipeline/RUNBOOK.md`](../tools/youtube-pipeline/RUNBOOK.md)
- [ ] **(T)** **F4-6** i ostatak backloga — [`FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md)

---

## P14 — „Finalni kraj“ (CEO matrica 100%)

- [ ] **(V)** Svih **10** preostalih `- [ ]` u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) → `[x]` uz dokaze — mapa: [`CEO-OPEN-BULLETS-RUNBOOK.md`](./CEO-OPEN-BULLETS-RUNBOOK.md)
- [ ] **(T)** Makro A–I u [`COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md`](./COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md) odjeljak **0** / **2** — ažuriraj procene kad CEO lista bude puna

---

## P15 — Posle 100% (opciono, product)

- [ ] **(T)** Stranični PDF audit ako je pravni zahtev — [`NIVO-3-PDF-FULL-AUDIT-COMPLETE.md`](./NIVO-3-PDF-FULL-AUDIT-COMPLETE.md) kao referenca; novi audit = novi ciklus
- [ ] **(T)** Širenje na organizacije / više regiona / SLI/SLO — van ovog roadmapa; novi brief

---

*Ovaj fajl je **red voza**; detaljne stavke ostaju u izvornim master listama. Ažuriraj datume kad zatvaraš blokove.*

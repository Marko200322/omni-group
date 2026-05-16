# Akcioni plan — Noviteti v1 + zvanični CEO put

**Svrha:** jedan redosled rada koji spaja **lokalni prompt arhiv** (`omni-shared-vault/Noviteti v1/`, nije u git-u) sa **izvorom istine u repou** ([`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md), [`AGENT-RADNI-PLAN.md`](../AGENT-RADNI-PLAN.md)).

**Pravilo:** [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) i N1/N2/N3 liste **nadređene** su copy-paste promptovima. Iz Noviteti se u isporuku uzima samo ono što je **legalno**, u skladu sa ToS provajdera i ciljem proizvoda.

**Broj faza:** plan ima **četiri radne faze** označene **1–4**. Sekcija **„Van opsega“** na kraju dokumenta **nije** dodatna faza — to je samo lista onoga što se **ne** radi.

**Bezbednost (uvek):** tajne samo u **`.env`** / vault-u; `omni-shared-vault/` ostaje **izvan git-a** ([`.gitignore`](../.gitignore) — **`[x]`**).

**Next — interni dok hub:** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** — [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md).

---

## Faza 1 — Zatvoriti [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) do 100% (**10** otvorenih `- [ ]` u **CEO sekcijama A–H**)

Izvor: [`CEO-OPEN-BULLETS-RUNBOOK.md`](./CEO-OPEN-BULLETS-RUNBOOK.md).

1. **CEO sekcija A** — Zaštita grane `main`, obavezni PR ([`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)).
2. **CEO sekcija C** — Produkcija Nest: `TYPEORM_SYNC=false` + migracije na pravoj bazi ([`TYPEORM-PRODUCTION-CHECKLIST.md`](../atina-system/docs/TYPEORM-PRODUCTION-CHECKLIST.md)).
3. **CEO sekcija G** (blok) — Produkcioni gate Node SaaS: build prod, staging migracije, `.env` prod, live plaćanja, SMTP, smoke, admin monitoring, rollback — šabloni: [`CEO-G-PRODUCTION-EVIDENCE.template.md`](./CEO-G-PRODUCTION-EVIDENCE.template.md), [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md), [`atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md).

Nakon svake stavke: ažurirati [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) i po potrebi **monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

---

## Faza 2 — Nivo 2 (Master Spec)

Ulaz: [`NIVO-2-START.md`](../NIVO-2-START.md), [`NIVO-2-MASTER-CHECKLIST.md`](../NIVO-2-MASTER-CHECKLIST.md).

- Dubina modula (API ugovori, edge testovi, feature flagovi) po [`COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md`](./COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md) odjeljak 3 Faza 2.
- **2026-05-08:** dodat **E2E.3** — pun `CoreEngine` integracioni test + dokumentacija u [`NIVO-2-E2E.md`](../atina-platform/atina/docs/operations/NIVO-2-E2E.md).

---

## Faza 3 — Nivo 3 (PDF trag + vizija)

[`NIVO-3-START.md`](../NIVO-3-START.md), [`NIVO-3-MASTER-CHECKLIST.md`](../NIVO-3-MASTER-CHECKLIST.md), [`NIVO-3-PDF-TRACE.md`](./NIVO-3-PDF-TRACE.md).

- **2026-05-08:** pun inženjerski audit svih 15 PDF-ova — [`NIVO-3-PDF-FULL-AUDIT-COMPLETE.md`](./NIVO-3-PDF-FULL-AUDIT-COMPLETE.md); matrica ažurirana na **audit-complete**.
- v6+ / K8s / pun AI sloj: i dalje po product odluci ([`NIVO-3-VISION-K8S-AI.md`](./NIVO-3-VISION-K8S-AI.md)).

---

## Faza 4 — Noviteti v1 (legitiman sadržaj) — **isporučeno u repou (2026-05-08)**

| Prioritet | Tema | Lokacija |
|-----------|------|----------|
| P1 | **Omnigroup / Next.js** (landing + services + pricing + contact) | [`apps/omnigroup-web/`](../apps/omnigroup-web/) |
| P2 | **Dashboard / Admin shell** | `apps/omnigroup-web/src/app/dashboard`, `admin` — povezati na Atina API |
| P3 | **YouTube / Celery** (lokalni fake pipeline) | [`tools/youtube-pipeline/`](../tools/youtube-pipeline/) |
| P4 | **Logo komponenta** | `apps/omnigroup-web/src/components/LogoRing.tsx` |
| P5 | **Pun SaaS u Next-u** | Izvor istine ostaje **`atina-platform/atina`** dok se ne odluči migracija |

Detaljna tabela: [`FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md).

---

## Van opsega (ne planirati u ovom monorepu)

Sve što u Noviteti opisuje: masovne lažne identitete, zaobilaženje KYC/SMS pravila, „harvesting“ cloud kredita protiv ToS, DeFi/sybil/mixer scenarije, ili slično — **nije** backlog i ne dobija implementaciju ovde.

---

## Kontrolne tačke (kratko)

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

- **Nedeljno:** [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (pun CI red — job **`python`**: **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md) + pytest + ostalo; uključuje **`apps/omnigroup-web`** build; opciono **`-SkipOmnigroupWeb`** / **`-SkipDocAudit`** lokalno; **Port mismatch** Nest/pg — [`scripts/README.md`](../scripts/README.md)) + po potrebi [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) (tri-stub; Atina Node = **GET** `/health` kad je uključen) + po potrebi **`npm run smoke:all`** u `atina-platform/atina` — [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Smoke tests*) ([`NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md); **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) — **Val 351** / 2026-05-14).
- **Pre prod release-a:** [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md).
- **Makro procena:** [`COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md`](./COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md) odjeljak 0 i odjeljak 2.

---

## Šta je već urađeno u repou (bez tvog naloga) — 2026-05-08

- **Faza 1 (priprema):** [`GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md), [`TYPEORM-PROD-EVIDENCE-LATEST.md`](./TYPEORM-PROD-EVIDENCE-LATEST.md), [`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md) — šabloni spremni za tvoj Pass.
- **Preduslov — CEO sekcija G:** `atina-platform/atina` **`npm run build`** lokalno **PASS** (zabeleženo u `CEO-G-PRODUCTION-EVIDENCE-LATEST.md`).
- **Faza 3:** [`NIVO-3-PDF-FULL-AUDIT-COMPLETE.md`](./NIVO-3-PDF-FULL-AUDIT-COMPLETE.md).
- **Faza 4:** Next.js + Celery u [`FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md).
- **Tvoja jedna stranica:** [`VLASNIK-ZAVRSAVA.md`](./VLASNIK-ZAVRSAVA.md).

*Poslednji put ažurirano: 2026-05-08.*

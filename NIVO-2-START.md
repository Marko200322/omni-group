# Nivo 2 — brzi start (Master Spec inženjerski)

**Definicija** (iz [`AGENT-RADNI-PLAN.md`](./AGENT-RADNI-PLAN.md)): **Nivo 1** + **CEO sekcija D** u [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md) (50 modula — test / coverage / E2E po dogovoru) + **CEO sekcija E** gde je predviđeno.

## Zvanični ulaz (sign-off)

U [`NIVO-1-MASTER-CHECKLIST.md`](./NIVO-1-MASTER-CHECKLIST.md) moraju biti **`[x]`** (ili ekvivalent po dogovoru tima za **F.4**):

- **F.4** — zelen **CI (monorepo)** na **`main`** u GitHub Actions **ako** repou koristi GitHub (jobovi **`python`** (GitHub prikaz: **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)), **`atina-saas`**, **`omnigroup-web`**, **`atina-system`**, **`compose`**); **isti inženjerski red bez GitHub-a:** [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md); uključuje **`apps/omnigroup-web`** osim **`-SkipOmnigroupWeb`**; **`-SkipDocAudit`** samo lokalno bez doc gate audita; **Port mismatch** Nest/pg) · [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) (HTTP, opciono; Atina Node = **GET** `/health`) · **`npm run smoke:all`** — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) · [`scripts/README.md`](./scripts/README.md) — vidi [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md).
- **F.5** — [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md): **CEO sekcije A, B, C, G i H** ažurirane kako tim prihvata za Nivo 1; **LATEST smoke** (**sekcija H**) je tri-stub dokaz koji pokriva deo **CEO sekcije H**.
- **LATEST verify** (lokalno, uključuje **`apps/omnigroup-web`** osim **`-SkipOmnigroupWeb`**): [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 sa D.1 placeholder Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13 sa D.1 placeholder rekonstrukcijom — [`docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md)).
- **LATEST smoke** (**sekcija H**, tri stuba): [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).
- **Evidencija / šabloni (indeks + dry-run):** [`docs/EVIDENCE-INDEX.md`](./docs/EVIDENCE-INDEX.md) · [`docs/NIVO-1-DRYRUN-LOG.md`](./docs/NIVO-1-DRYRUN-LOG.md).
- **Kad podižeš novi Val širom dokova:** [`scripts/README.md`](./scripts/README.md) — **Kad podigneš novi broj**.

**Priprema Nivoa 2** (čitanje PDF mapiranja, discovery, grananje PR-ova) može da radi **paralelno** dok se F.4/F.5 zatvaraju — ali **„Nivo 2 zvanično startovan“** za release sign-off tretiraj tek kad je Nivo 1 zatvoren.

**Plan više talasa agenata:** [`NIVO-2-AGENT-WAVES.md`](./docs/NIVO-2-AGENT-WAVES.md) (A–D × 6 agenata, disjunktni moduli).

**Inženjerski kraj N2 u repou (2026):** **N2 master lista** [`NIVO-2-MASTER-CHECKLIST.md`](./NIVO-2-MASTER-CHECKLIST.md) (T3.1, E2E, X.*) + [`NIVO-2-CEO-D-TRACE.md`](./docs/NIVO-2-CEO-D-TRACE.md) + [`NIVO-2-CEO-PDF-RULES-CLOSURE.md`](./docs/NIVO-2-CEO-PDF-RULES-CLOSURE.md) + [`NIVO-2-STAGING-WEBHOOKS.md`](./docs/NIVO-2-STAGING-WEBHOOKS.md) + [`atina-platform/atina/docs/operations/NIVO-2-E2E.md`](./atina-platform/atina/docs/operations/NIVO-2-E2E.md). **Spoljni potpis (po procesu tima):** **F.4** — pet jobova **CI (monorepo)** na `main` **ili** dokumentovan lokalni [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md); isti red uključuje **`apps/omnigroup-web`** osim **`-SkipOmnigroupWeb`**; **`-SkipDocAudit`** samo lokalno; **Port mismatch** Nest/pg — [`scripts/README.md`](./scripts/README.md)) · [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) (HTTP, opciono; Atina Node = **GET** `/health`) · **`npm run smoke:all`** — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) — [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md); izvršni webhook koraci na stagingu po [`NIVO-2-STAGING-WEBHOOKS.md`](./docs/NIVO-2-STAGING-WEBHOOKS.md).

## N2 master lista i talasi

- **N2 master lista (operativni koraci):** [`NIVO-2-MASTER-CHECKLIST.md`](./NIVO-2-MASTER-CHECKLIST.md)  
- **Raspodela agenata 5–10 i merge redosled:** [`AGENT-RADNI-PLAN.md`](./AGENT-RADNI-PLAN.md) (sekcija *Raspored agenata*)
- **Discovery 0.1 (izlaz):** [`NIVO-2-DISCOVERY-AUDIT.md`](./docs/NIVO-2-DISCOVERY-AUDIT.md) — mapa 50 redova D vs `src/modules/`, dodatni folderi, predlog talasa za **0.2**; odjeljak 6 **Talas 1**; odjeljci 7–8 **Talas 2** (paralelni agenti + kontroler testovi, `test:ci`).

## Redosled rada (preporuka)

1. **Discovery nedelja** — audit `src/modules/**` naspram **CEO sekcije D** u [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md); zabeleži rupe (nema foldera, **N/A**, feature flag).
2. **Talas 1 — Agent 5** — `workflow-chain`, `forge`, `automation` (disjunktni folderi; max **3–4** paralelna agenta).
3. **Talas 2 — Agent 6** — grupe 5–8 modula (npr. CRM, billing, payments) po dogovoru iz discovery-ja.
4. **Talas 3 — Agent 7** — preostali moduli.
5. **Agent 8** — E2E / integracija (lead → deal → …) kad je API stabilan; staging URL bez tajni u gitu.
6. **Agent 9 / 10** — PDF traceability (**Nivo 3** bliže) i Sec/Ops paralelno gde ne guše module.

## Komande (isti monorepo)

- Root: [`NIVO-1-START.md`](./NIVO-1-START.md) (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md) + pytest, compose, smoke) — i dalje važeći zidovi kvaliteta.  
- Jedan lokalni prolaz kao **CI (monorepo):** [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md); prvi korak **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md)) · [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) (HTTP posle servisa; Atina Node = **GET** `/health`) · **`npm run smoke:all`** — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) · [`scripts/README.md`](./scripts/README.md) (**`-SkipOmnigroupWeb`** / **`-SkipNestVerifyCi`** → Nest **`verify:n1`** bez Postgresa / **`-SkipCompose`** / **`-SkipDocAudit`** lokalno; **Port mismatch** na punom Nest **`verify:ci`**) · **F.4** (matrica koraka): [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify:** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 349** / 2026-05-08) · **LATEST smoke** (**sekcija H**): [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 348** / 2026-05-08).  
- Node SaaS: `atina-platform/atina` → `npm run test:ci`.  
- Atina Node HTTP (kad je API podignut): `atina-platform/atina` → **`npm run smoke:all`** (login jednom, JWT za `/me`, `forge/status`, execution-stats, forge-admin — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*). **`smoke-stack.ps1`** za Node šalje samo **`GET /health`** kada je uključen — vidi [`scripts/README.md`](./scripts/README.md).  
- Omnigroup Next: `apps/omnigroup-web` → `npm ci` + `npm run build` (isti korak u skripti i CI job **`omnigroup-web`**); uz **`npm run dev`**, hub dokova u browseru: **`/dev/docs`** — robots/sitemap i env u [`apps/omnigroup-web/README.md`](apps/omnigroup-web/README.md); proširena lista putanja u [`apps/omnigroup-web/src/app/dev/docs/page.tsx`](apps/omnigroup-web/src/app/dev/docs/page.tsx).  
- Nest: `atina-system` → `npm run verify:ci` (uz Postgres; brzi `verify:n1` samo build+test; Windows + `pg` ponekad **`POSTGRES_PORT=5433`** — [`scripts/README.md`](./scripts/README.md); **Port mismatch** ako **`POSTGRES_PORT`** ne prati objavljeni port).  
- PR granice: [`CONTRIBUTING.md`](./CONTRIBUTING.md) — za Nivo 2 dominantno **Agent 5–8** putevi pod `atina-platform/atina/src/modules/**` i testovi.

## Šta ne raditi

- Ne pokretati **10+ agenata** nad istim `src/modules/**` fajlovima odjednom ([`AGENT-RADNI-PLAN.md`](./AGENT-RADNI-PLAN.md) — *Šta ne raditi*).  
- Ne obećavati rokove za **CEO sekciju D** (trag D) bez discovery nedelje.

---

| Dokument | Svrha |
|----------|--------|
| [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md) — **CEO sekcije D i E** | Izvor modula i dodatnih stavki |
| [`NIVO-2-MASTER-CHECKLIST.md`](./NIVO-2-MASTER-CHECKLIST.md) | Talasi i gate-ovi Nivoa 2 |
| [`NIVO-3-START.md`](./NIVO-3-START.md) | Sledeći korak: Nivo 3 (**CEO sekcija F** + vizionarski opseg) |
| [`SYSTEM-MAP.md`](./SYSTEM-MAP.md) | Stackovi i portovi |

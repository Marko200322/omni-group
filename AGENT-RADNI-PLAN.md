# Raspodela agenata po matrici (`CHECKLIST-CEO-SISTEM.md`) + procena trajanja

**Važno:** Glavna matrica ima stavke koje **samo automatika ne može** zatvoriti (živi Stripe, SMTP, staging sign-off, biznis odluke). Agenata pokretati **paralelno najviše 3–4**, sa **disjunktnim granicama fajlova** da nema merge konflikata.

**Evidencije (LATEST + šabloni) / mapa preostalih stavki u CEO sekcijama A–H (`- [ ]`); monorepo evidencija (indeks + dry-run):** [`docs/EVIDENCE-INDEX.md`](./docs/EVIDENCE-INDEX.md) · [`docs/NIVO-1-DRYRUN-LOG.md`](./docs/NIVO-1-DRYRUN-LOG.md) · [`docs/CEO-OPEN-BULLETS-RUNBOOK.md`](./docs/CEO-OPEN-BULLETS-RUNBOOK.md). **LATEST verify** (pun red, uklj. `apps/omnigroup-web`): [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **Val 355** / 2026-05-14 (D.1 Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md)) · **LATEST smoke** (**sekcija H**): [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) — **Val 351** / 2026-05-14.

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](./scripts/README.md) — **Kad podigneš novi broj**.

**Next — interni dok hub:** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** (lista putanja u browseru); robots/sitemap i env — [`apps/omnigroup-web/README.md`](./apps/omnigroup-web/README.md).

---

## Definicija „zvanično završeno“

| Nivo | Značenje |
|------|----------|
| **Nivo 1 — Operativna produkcija** | [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md) — **CEO sekcija A**, **CEO sekcija B** (run), **CEO sekcija C** (build/test), **CEO sekcija G**, **CEO sekcija H** uz **LATEST smoke** (**sekcija H** — tri stuba); Node SaaS na produkciji sa pravim tajnama; monorepo gate zelen (lokalno [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md); prvi korak **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md), zatim `pytest` + ostalo — i/ili GitHub **CI (monorepo)**; **Port mismatch** Nest/pg — [`scripts/README.md`](./scripts/README.md)); **F.4:** [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md); **LATEST verify** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**) [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14). **HTTP smoke (kad su servisi gore):** [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) (multi-stack; Atina Node = **GET** `/health`) · **`npm run smoke:all`** u `atina-platform/atina` — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*). |
| **Nivo 2 — Master Spec inženjerski** | Nivo 1 + **CEO sekcija D** (50 modula: test/coverage/E2E simulacija po dogovoru) + **CEO sekcija E** gde je predviđeno. |
| **Nivo 3 — CEO sekcija F (PDF) + vizionarski** | Nivo 2 + **CEO sekcija F** (svi PDF-ovi usklađeni sa kodom) + ambiciozni scope iz blueprint PDF-ova (K8s, veliki AI sloj) ako je uopšte u opsegu proizvoda. |

---

## Nivo 2 — aktivan raspored (Master Spec)

**Ulaz:** [`NIVO-2-START.md`](./NIVO-2-START.md) · master talasi: [`NIVO-2-MASTER-CHECKLIST.md`](./NIVO-2-MASTER-CHECKLIST.md).  
**Zvanični start:** preporuka — nakon **`[x]`** na **F.4** i **F.5** u [`NIVO-1-MASTER-CHECKLIST.md`](./NIVO-1-MASTER-CHECKLIST.md) (F.4: GitHub `main` **ili** lokalni gate — [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md)); **priprema** (discovery, PR plan) može ranije.

Koristi **Agent 5–8** iz tabele ispod (isti putevi); max **3–4** paralelno, disjunktni moduli.

---

## Nivo 3 — CEO sekcija F (PDF) + vizionarski opseg

**Ulaz:** [`NIVO-3-START.md`](./NIVO-3-START.md) · master: [`NIVO-3-MASTER-CHECKLIST.md`](./NIVO-3-MASTER-CHECKLIST.md) · PDF matrica: [`NIVO-3-PDF-TRACE.md`](./docs/NIVO-3-PDF-TRACE.md).

**Zvanični start (preporuka):** Nivo 2 inženjerski zatvoren + po mogućstvu **P.1** / **0.3** (CI na `main` u GitHubu — pet jobova, uklj. **`python`** (GitHub prikaz: **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) = **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md), zatim `pytest` — **ili** lokalni [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1); opciono [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) (Atina Node = **GET** `/health`) · **`npm run smoke:all`** — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*); **Port mismatch** na punom Nest gate — [`scripts/README.md`](./scripts/README.md); **F.4:** [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md); **LATEST verify** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **Val 355** / 2026-05-14 (D.1 Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13) · **LATEST smoke** (**sekcija H**) [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) — **Val 351** / 2026-05-14); priprema (inventar `sve/`, matrica) može paralelno.

Koristi **Agent 9** (PDF, `sve/*.pdf`, **CEO sekcija F**) i **Agent 10** (Sec/Ops, **CEO sekcija G**) iz tabele *Raspored agenata* ispod; max **3–4** paralelno, bez mešanja sa velikim `src/modules/**` refaktorom u istom PR-u bez dogovora.

---

## Nivo 1 — referenca (zatvaranje)

**Izvor istine za zadatke i stavke:** **`NIVO-1-MASTER-CHECKLIST.md`** — šest agenata (**01–06**), tro-mesečni kalendar, finalni sprint **F.1–F.5**.

**Cilj:** zatvoriti **CEO sekcije A**, **B**, **C**, **CEO sekciju H** (portovi / smoke procedura) i inženjerski deo **CEO sekcije G** iz `CHECKLIST-CEO-SISTEM.md`, uz ažuriranu **LATEST smoke** (**sekcija H**) evidenciju (tri stuba), bez širenja na Master Spec 50 / E2E **celokupan** tok.

**Kraj Nivoa 1:** kad su u [`NIVO-1-MASTER-CHECKLIST.md`](./NIVO-1-MASTER-CHECKLIST.md) zatvoreni **F.4** (Actions na `main` **ili** lokalni monorepo gate — [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md)) i **F.5** (**CEO sekcije A, B, C, G i H** po dogovoru; **LATEST smoke** (**sekcija H**) = tri-stub dokaz za **CEO sekciju H**), pređi na **Nivo 2** ispod.

| Agent | Kratak opis | Granica fajlova (strogo) |
|-------|-------------|----------------------------|
| **01** | Infra & monorepo CI | Root `.github/`, compose, root `scripts/`, root `README*`, `NIVO-1-*.md`, `SYSTEM-MAP.md`, `pytest.ini`, `requirements.txt` |
| **02** | Python | `src/**`, root `Dockerfile`, `docker-compose.yml`, `tests/**` |
| **03** | Nest | `atina-system/**` |
| **04** | Node jezgro | `atina-platform/atina/src/{core,config,database,queue,utils}` + `index.ts` / `api` — **bez** `src/modules/**` |
| **05** | Node ops dok | `atina-platform/atina/docs/operations/**`, platform `README.md`, `CONTRIBUTING.md` |
| **06** | Smokes | `atina-platform/atina/scripts/**`, root `scripts/**` |

*Agenti 5–8 (moduli, E2E): **Nivo 2** — vidi [`NIVO-2-START.md`](./NIVO-2-START.md). Agenti 9–10 (PDF, Sec/Ops) mogu paralelno sa dokumentima. **F.4 / F.5** u [`NIVO-1-MASTER-CHECKLIST.md`](./NIVO-1-MASTER-CHECKLIST.md) i dalje zatvaraju zvanični **kraj Nivoa 1**.*

Ulaz: **`NIVO-1-START.md`** · **N1 master lista:** **`NIVO-1-MASTER-CHECKLIST.md`**. Nest gate (lokalno + monorepo CI): **`npm run verify:ci`** u `atina-system` (Postgres); brzi **`verify:n1`** samo build+unit. **Ako koristiš GitHub:** **`.github/workflows/ci-monorepo.yml`** — jobovi **`python`** (GitHub prikaz: **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)), **`atina-saas`**, **`omnigroup-web`**, **`atina-system`**, **`compose`** (tri **`docker compose config`**). Jedan lokalni prolaz kao CI (bez obaveznog GitHub-a): **[`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1)** (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md); prvi korak **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md)) · **[`smoke-stack.ps1`](./scripts/smoke-stack.ps1)** (kad su servisi podignuti; Atina Node = **GET** `/health`) · **`npm run smoke:all`** u `atina-platform/atina` — [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) · **[`scripts/README.md`](./scripts/README.md)** (**`-SkipOmnigroupWeb`** bez Next build-a; **`-SkipNestVerifyCi`** → Nest **`verify:n1`** bez Postgresa; **`-SkipCompose`** bez Docker `config` koraka; **`-SkipDocAudit`** bez doc gate audita lokalno; **Port mismatch** Nest/pg). **F.4:** [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md). **LATEST verify:** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

---

## Raspored agenata (po blokovima matrice / CEO sekcija)

| Agent | Odgovornost (samo ovi putevi) | CEO sekcija | Tip posla |
|-------|-------------------------------|-------------|-----------|
| **Agent 1 — Infra & CI** | `.github/`, `docker-compose*.yml`, `apps/omnigroup-web/` (CI / build površina uz monorepo workflow), [`scripts/smoke-stack.ps1`](./scripts/smoke-stack.ps1) (multi-stack HTTP; Atina Node = **GET** `/health`; bundled Atina: **`npm run smoke:all`** — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*), [`scripts/verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md); **Port mismatch** Nest/pg — isti README; **LATEST verify** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **Val 355** / 2026-05-14 (D.1 Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13); **LATEST smoke** (**sekcija H**) [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) — **Val 351** / 2026-05-14), `SYSTEM-MAP.md` (samo linkovi/napomene), `pytest.ini`, root `tests/` | **CEO sekcija A**, delom **CEO sekcija B** (CI), **CEO sekcija H** | Workflow-i, compose, smoke dokumentacija |
| **Agent 2 — Python** | `src/` (forge, atina, astra), root `requirements.txt`, root `Dockerfile` | **CEO sekcija B** | Testovi, pin zavisnosti, vault edge slučajevi |
| **Agent 3 — Nest** | `atina-system/**` | **CEO sekcija C** | Migracije, `TYPEORM_SYNC`, testovi po modulu, audit |
| **Agent 4 — Node SaaS jezgra** | `atina-platform/atina/src/database/`, `src/queue/`, `src/core/`, `src/config/` | **CEO sekcija D** (33 DB), **CEO sekcija G** (build/test) | Pool, migracije, queue, config |
| **Agent 5 — Node moduli (talas 1)** | `atina-platform/atina/src/modules/workflow-chain/`, `forge/`, `automation/` | **CEO sekcija D** + **CEO sekcija E** (talas orchestracije) | Testovi, bez širenja na sve module odjednom |
| **Agent 6 — Node moduli (talas 2)** | grupe od 5–8 foldera iz `src/modules/` po dogovoru (npr. CRM, billing, payments…) | **CEO sekcija D** redovi 7–22 | Unit + integration po modulu |
| **Agent 7 — Node moduli (talas 3)** | preostali `src/modules/` (**CEO sekcija E** proširenja) | **CEO sekcija D** + **CEO sekcija E** | Isto |
| **Agent 8 — E2E & simulacija** | `atina-platform/atina` testovi `src/tests/integration/` + novi E2E skripta | **CEO sekcija D** (PDF: lead→payment), **CEO sekcija G** (smoke dokazi) | Supertest/Playwright, staging URL; bundled **`npm run smoke:all`** — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) *Smoke tests* vs **`smoke-stack.ps1`** (Node samo `/health`) |
| **Agent 9 — PDF & traceability** | `sve/*.pdf` + [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md) (**CEO sekcija F**) | **CEO sekcija F** | Matrica PDF → modul → status (bez lažnog koda) |
| **Agent 10 — Sec/Ops** | `docs/operations/`, README + operativni runbookovi, secrets matrix | **CEO sekcija G** | Rollback dry-run, alert kanali, `npm audit` plan |

**Redosled merge-a:** Agent 1 → 2,3 paralelno → 4 → 5,6,7 paralelno (različiti folderi) → 8 posle stabilnog API-ja → 9,10 paralelno sa dokumentima.

---

## Za koliko dana / meseci je „zvanično završeno“?

Procene su **inženjerske**, pretpostavka: iskusni developer(i), fokus na ovom monorepo-u, bez paralelnog velikog frontend tima van repoa.

| Cilj (nivo) | **1 developer** | **2 developera** | **3+ developera** |
|-------------|-----------------|------------------|-------------------|
| **Nivo 1** (operativna produkcija Node + CI + Python/Nest stabilno + smoke) | **~8–14 nedelja** (2–3,5 meseca) | **~5–9 nedelja** (1,5–2 meseca) | **~4–7 nedelja** (~1–1,5 meseca) |
| **Nivo 2** (Master Spec inženjerski: 50 modula dubina, E2E simulacija, test matrica) | **~6–12 meseci** | **~4–8 meseci** | **~3–6 meseci** |
| **Nivo 3** (celokupan PDF — vizionarski + K8s/veliki AI kao u blueprint-ovima) | **~12–24+ meseci** ili poseban proizvod | **~8–18 meseci** | **~6–14 meseci** |

**Zvaničan minimum za „produkt je završen“ u smislu biznisa** često odgovara **Nivou 1**: računaj **oko 2–3 meseca** sa jednim jakim developerom, **~1,5–2 meseca** sa dvojicom, ako nema velikih iznenadjenja u integraciji i plaćanjima.

**„Zvanično sve po matrici“** — u praksi [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md) i povezane N2/N3 liste — **uključujući pun Master Spec + E2E kroz celokupan tok**; realno **~4–8 meseci** (mali tim) do **~6–12 meseci** (jedan developer), zavisno od dubine modula i kvaliteta postojećeg koda.

---

## Šta ne raditi

- Ne pokretati **10+ agenata** nad istim `src/modules/` fajlovima istovremeno.
- Ne obećavati „dani“ za Nivo 2/3 bez discovery nedelje (audit modula po modulu).

---

*Veza: glavna matrica (CEO sekcije A–H) je [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md). Ovaj fajl je plan rada i kalendarska procena, ne automatsko izvršavanje.*

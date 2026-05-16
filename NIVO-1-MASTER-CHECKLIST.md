# Nivo 1 — N1 master lista (6 agenata, ~3 meseca wall-clock)

**Cilj:** zatvoriti inženjerski **Nivo 1** (CI, build, test, smoke, env discipline, minimalni ops dok) bez Master Spec 50 / punog E2E modula-po-modulu.

**Monorepo gate:** pun [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (isti red kao CI job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) uključuje **`apps/omnigroup-web`** osim **`-SkipOmnigroupWeb`**; ako Nest **`verify:ci`** pada na Postgres konekciji, vidi **Port mismatch** u [`scripts/README.md`](./scripts/README.md). **LATEST verify:** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 — D.1 Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13 sa D.1 placeholder rekonstrukcijom za `apps/omnigroup-web` — [`docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md)) · **LATEST smoke** (**sekcija H**): [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

**Status (inženjering vs GitHub):** svi agent gate-ovi i **F.5** su zatvoreni u repou. **F.4** — **2026-05-05:** zatvoren **lokalno** punim [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)); evidencija: [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md), [`docs/NIVO-1-DRYRUN-LOG.md`](./docs/NIVO-1-DRYRUN-LOG.md); **ponovo potvrđeno 2026-04-17** · **2026-05-06** · **2026-05-07** (Val 21 + Val 22 + verify Val 24 + Val 26 + Val 29 + verify **Val 31** + verify **Val 33** + verify **Val 35** + verify **Val 37** + verify **Val 39** + verify **Val 41** + verify **Val 43** + verify **Val 45** + verify **Val 47** + verify **Val 49** + verify **Val 51** + verify **Val 53** + verify **Val 55** + verify **Val 57** + verify **Val 59** + verify **Val 61** + verify **Val 63** + verify **Val 65** + verify **Val 67** + verify **Val 69** + verify **Val 71** + verify **Val 73** + verify **Val 75** + verify **Val 77** + verify **Val 79** + verify **Val 81** + verify **Val 83** + verify **Val 85** + verify **Val 87** + verify **Val 89** + verify **Val 91** + verify **Val 93** + verify **Val 95** + verify **Val 97** + verify **Val 99** + verify **Val 101** + verify **Val 103** + verify **Val 105** + verify **Val 107** + verify **Val 109** + verify **Val 111** + verify **Val 113** + verify **Val 115** + verify **Val 117** + verify **Val 119** + verify **Val 121** + verify **Val 123** + verify **Val 125** + verify **Val 127** + verify **Val 129** + verify **Val 131** + verify **Val 133** + verify **Val 135** + verify **Val 137** + verify **Val 139** + verify **Val 141** + verify **Val 143** + verify **Val 145** + verify **Val 147** + verify **Val 149** + verify **Val 151** + verify **Val 153** + verify **Val 155** + verify **Val 157** + verify **Val 159** + verify **Val 161** + verify **Val 163** + verify **Val 165** + verify **Val 167** + verify **Val 169** + verify **Val 171** + verify **Val 173** + verify **Val 175** + verify **Val 177** + verify **Val 179** + verify **Val 181** + verify **Val 183** + verify **Val 185** + verify **Val 187** + verify **Val 189** + verify **Val 191** + verify **Val 193** + verify **Val 195** + verify **Val 197** + verify **Val 199** + verify **Val 201** + verify **Val 203** + verify **Val 205** + verify **Val 207** + verify **Val 209** + verify **Val 211** + verify **Val 213** + verify **Val 215** + verify **Val 217** + verify **Val 219** + verify **Val 221** + verify **Val 223** + verify **Val 225** + verify **Val 227** + verify **Val 229** + verify **Val 231** + verify **Val 233** + verify **Val 235** + verify **Val 237** + verify **Val 239** + verify **Val 241** + verify **Val 243** + verify **Val 245** + verify **Val 247** + verify **Val 249** + verify **Val 251** + verify **Val 253** + verify **Val 255** + verify **Val 257** + verify **Val 259** + verify **Val 261** + verify **Val 263** + verify **Val 265** + verify **Val 267** + verify **Val 269** + verify **Val 271** + verify **Val 273** + verify **Val 275** + verify **Val 277** + verify **Val 279** + verify **Val 281** + verify **Val 283** + verify **Val 285** + verify **Val 287** + verify **Val 289** + verify **Val 291** + verify **Val 293** + verify **Val 295** + verify **Val 297** + verify **Val 299** + verify **Val 301** + verify **Val 303** + verify **Val 305** + verify **Val 307** + verify **Val 309** + verify **Val 311** + verify **Val 313** + verify **Val 315** + verify **Val 317** + verify **Val 319** + verify **Val 321** + verify **Val 323** + verify **Val 325** + verify **Val 327** + verify **Val 329** + verify **Val 331** + verify **Val 333** + verify **Val 335** + verify **Val 337** + verify **Val 339** + verify **Val 341** + verify **Val 343** + verify **Val 344** + verify **Val 345** + verify **Val 346** + verify **Val 349** + smoke **Val 30** + **Val 32** + **Val 34** + **Val 36** + **Val 38** + **Val 40** + **Val 42** + **Val 44** + **Val 46** + **Val 48** + **Val 50** + **Val 52** + **Val 54** + **Val 56** + **Val 58** + **Val 60** + **Val 62** + **Val 64** + **Val 66** + **Val 68** + **Val 70** + **Val 72** + **Val 74** + **Val 76** + **Val 78** + **Val 80** + **Val 82** + **Val 84** + **Val 86** + **Val 88** + **Val 90** + **Val 92** + **Val 94** + **Val 96** + **Val 98** + **Val 100** + **Val 102** + **Val 104** + **Val 106** + **Val 108** + **Val 110** + **Val 112** + **Val 114** + **Val 116** + **Val 118** + **Val 120** + **Val 122** + **Val 124** + **Val 126** + **Val 128** + **Val 130** + **Val 132** + **Val 134** + **Val 136** + **Val 138** + **Val 140** + **Val 142** + **Val 144** + **Val 146** + **Val 148** + **Val 150** + **Val 152** + **Val 154** + **Val 156** + **Val 158** + **Val 160** + **Val 162** + **Val 164** + **Val 166** + **Val 168** + **Val 170** + **Val 172** + **Val 174** + **Val 176** + **Val 178** + **Val 180** + **Val 182** + **Val 184** + **Val 186** + **Val 188** + **Val 190** + **Val 192** + **Val 194** + **Val 196** + **Val 198** + **Val 200** + **Val 202** + **Val 204** + **Val 206** + **Val 208** + **Val 210** + **Val 212** + **Val 214** + **Val 216** + **Val 218** + **Val 220** + **Val 222** + **Val 224** + **Val 226** + **Val 228** + **Val 230** + **Val 232** + **Val 234** + **Val 236** + **Val 238** + **Val 240** + **Val 242** + **Val 244** + **Val 246** + **Val 248** + **Val 250** + **Val 252** + **Val 254** + **Val 256** + **Val 258** + **Val 260** + **Val 262** + **Val 264** + **Val 266** + **Val 268** + **Val 270** + **Val 272** + **Val 274** + **Val 276** + **Val 278** + **Val 280** + **Val 282** + **Val 284** + **Val 286** + **Val 288** + **Val 290** + **Val 292** + **Val 294** + **Val 296** + **Val 298** + **Val 300** + **Val 302** + **Val 304** + **Val 306** + **Val 308** + **Val 310** + **Val 312** + **Val 314** + **Val 316** + **Val 318** + **Val 320** + **Val 322** + **Val 324** + **Val 326** + **Val 328** + **Val 330** + **Val 332** + **Val 334** + **Val 336** + **Val 338** + **Val 340** + **Val 342** + **Val 347** + **Val 348** — [`NIVO-1-DRYRUN-LOG.md`](./docs/NIVO-1-DRYRUN-LOG.md), [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md)). Ako koristiš GitHub: i dalje po želji zalepi zeleni **CI (monorepo)** na `main` — [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md). **Isti red bez GitHub-a:** gore. Opciono HTTP: [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) · **`npm run smoke:all`** (Atina — [`release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*) · [`scripts/README.md`](./scripts/README.md).

**Pravila rada**

1. **Jedan agent = jedna granica** ispod; ne menjati tuđe foldere bez dogovora.
2. **Windows PowerShell 5.1:** koristiti `Set-Location "..."; npm run ...` — ne `&&` u jednoj liniji (ili PS 7+ / `cmd /c`).
3. **Merge redosled preporučen:** `01 → 02 → 03` (infra / python / nest), zatim **`04`** (Node core), zatim **`05` i `06`** paralelno ako nema konflikta; uvek rebase pre PR.
4. **Definition of Done (Nivo 1):** sve stavke označene **„gate“** su `[x]`; **F.4:** CI monorepo zelen na `main` **ili** (po politici) pun lokalni [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) — vidi [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md); bar jednom pokrenut full lokalni set iz sekcije „Finalni sprint“. **LATEST verify:** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 — D.1 Iter 2; ranije **Val 354** / 2026-05-13) · **LATEST smoke** (**sekcija H**): [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).
5. **Granice foldera + komande pre PR-a:** [`CONTRIBUTING.md`](./CONTRIBUTING.md).

**Evidencija / šabloni (indeks + dry-run):** [`docs/EVIDENCE-INDEX.md`](./docs/EVIDENCE-INDEX.md) · [`docs/NIVO-1-DRYRUN-LOG.md`](./docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](./scripts/README.md) — **Kad podigneš novi broj**.

**Next — interni dok hub:** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** — [`apps/omnigroup-web/README.md`](./apps/omnigroup-web/README.md).

---

## Kalendar (orijentaciono, 3 meseca)

| Mesec | Fokus |
|-------|--------|
| **M1** | Agenti **01–03** završeni (infra, Python, Nest gate); Agent **04** započinje DB/queue/config čvrstinu. |
| **M2** | Agent **04** završen; **05** (ops dok) + **06** (smoke) završeni; prvi staging dry-run. |
| **M3** | Finalni sprint, `npm audit` plan, ostatak PR-ova, CI zelen na `main`, handoff dokumentacija. |

*Paralelno više agenata skraćuje kalendar samo ako nema blokada na merge i na zajedničkim fajlovima.*

---

## Agent 01 — Infra & monorepo (granica)

**Samo:** repo root — `.github/**`, `docker-compose*.yml`, [`scripts/smoke-stack.ps1`](./scripts/smoke-stack.ps1) · **`npm run smoke:all`** (Atina), [`scripts/verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)), [`scripts/README.md`](./scripts/README.md), `README.md`, `NIVO-1-START.md`, `NIVO-1-MASTER-CHECKLIST.md` (ovaj fajl — samo status kolona u PR), `SYSTEM-MAP.md` (linkovi), `pytest.ini`, `requirements.txt` (samo ako je CI/Python deps), **ne** `atina-platform/**`, **ne** `atina-system/**`, **ne** `src/` Python aplikacioni kod.

| # | Zadatak | Gate |
|---|---------|------|
| 01.1 | `ci-monorepo.yml`: `push`, `pull_request`, `workflow_dispatch` rade očekivano | [x] |
| 01.2 | U `README.md`: ručno Actions + lokalni gate; **F.4:** [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md) | [x] |
| 01.3 | `docker-compose.nest-port-3001.yml` + `docker-compose.atina.yml` opisani u `SYSTEM-MAP` / `NIVO-1-START` bez proturječja | [x] |
| 01.4 | [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) · **`npm run smoke:all`** (Atina) u skladu sa portovima; testiran jednom na podignutim servisima | [x] |
| 01.5 | Root `.gitignore` pokriva `.env` gde treba (provera) | [x] |

*Agent 01 — PR napomene (ne menjaju gate stavku dok se ne potvrdi end-to-end):* **01.1** — `workflow_dispatch` ostaje u YAML-u; workflow uključuje job-ove **`python`** (GitHub prikaz: **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)), `atina-saas`, **`omnigroup-web`**, `atina-system`, **`compose`** (tri `docker compose config`: Nest merge, root Python, Atina Node). **01.2** — u `README.md` (odjeljak CI): ručno Actions / „CI (monorepo)”, lokalni [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)), PowerShell 5.1; **F.4** tim koraci: [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md). [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) + [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) (multi-stack HTTP posle servisa; Atina Node = **GET** `/health`) + po potrebi **`npm run smoke:all`** u `atina-platform/atina` — [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) + [`scripts/README.md`](./scripts/README.md) — lokalni mirror tog reda (opcije **`-SkipOmnigroupWeb`** / **`-SkipCompose`** / **`-SkipNestVerifyCi`** / **`-SkipDocAudit`**; **Port mismatch** Nest/pg u tom README); u PS: **`Get-Help .\scripts\verify-monorepo.ps1 -Full`**. **LATEST verify:** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 349** / 2026-05-08) · **LATEST smoke** (**sekcija H**): [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 348** / 2026-05-08).

---

## Agent 02 — Python stack (granica)

**Samo:** `src/**`, root `Dockerfile`, root `docker-compose.yml` (Python servisi), `requirements.txt`, `tests/**`, `pytest.ini` — **ne** Node/Nest.

| # | Zadatak | Gate |
|---|---------|------|
| 02.1 | [`audit-doc-gate-references.ps1`](./scripts/audit-doc-gate-references.ps1) (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **EVIDENCE-INDEX** / **NIVO-1-DRYRUN-LOG** gde se indeks pominje, u [`scripts/README.md`](./scripts/README.md)) · zatim `python -m pytest` zeleno lokalno i u CI (job **`python`** u `ci-monorepo.yml`; GitHub prikaz: **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) | [x] |
| 02.2 | `docker compose` build/run dokumentovan za Forge + worker + Astra | [x] |
| 02.3 | Astra `/api/status` ponašanje dokumentovano (šta znači greška) | [x] |
| 02.4 | Verzije u `requirements.txt` pregledane za Nivo 1 (min. bez poznatih conflict-a sa CI) | [x] |

---

## Agent 03 — Nest `atina-system` (granica)

**Samo:** `atina-system/**` — **ne** `atina-platform/**`.

| # | Zadatak | Gate |
|---|---------|------|
| 03.1 | `npm run verify:ci` zeleno lokalno i u CI | [x] |
| 03.2 | `.env.example` kompletan; `.env` u `.gitignore` | [x] |
| 03.3 | README: produkcija **`TYPEORM_SYNC=false`** + plan migracija (makro ili prva migracija) | [x] |
| 03.4 | `docker-compose.atina.yml` usklađen sa README (portovi, env) | [x] |
| 03.5 | `npm audit` — lista high/critical + plan — vidi [`atina-system/docs/NPM-AUDIT-NIVO1.md`](./atina-system/docs/NPM-AUDIT-NIVO1.md) (Nivo 1: bar dokumentovan workaround ili fix PR) | [x] |

---

## Agent 04 — Atina Node — jezgro (granica)

**Samo:** `atina-platform/atina/src/core/**`, `src/config/**`, `src/database/**` (bez menjanja `migrations` sadržaja ako Agent 03 radi paralelno — koordinacija), `src/queue/**`, `src/utils/**`, `src/index.ts`, `src/api/**` (ako postoji), **ne** `src/modules/**`.

| # | Zadatak | Gate |
|---|---------|------|
| 04.1 | `npm run test:ci` zeleno lokalno i u CI | [x] |
| 04.2 | Pool / connection: prod stavke iz `production-config-matrix` adresirane u kodu ili komentarima gde već rešeno | [x] |
| 04.3 | Queue (`queue.ts`): regresije pokrivene testovima (postojeći suite zelen) | [x] |
| 04.4 | Logger / error handler: nema kritičnih TODO za Nivo 1 (opciono: jedan PR cleanup) | [x] |

---

## Agent 05 — Atina Node — operacije & dokumentacija (granica)

**Samo:** `atina-platform/atina/docs/operations/**`, `atina-platform/atina/README.md`, `CONTRIBUTING.md`, `RUN-ATINA-PLATFORM.txt` (ako postoji u tom folderu), **ne** `src/modules/**`, **ne** `src/core/**`.

| # | Zadatak | Gate |
|---|---------|------|
| 05.1 | `NIVO-1-GATE.md` usklađen sa stvarnim komandama (`test:ci`, `smoke:all`) | [x] |
| 05.2 | README blok *Production readiness* usklađen sa `release-gate-checklist.md` | [x] |
| 05.3 | Link ka root `NIVO-1-START.md` / master lista vidljiv contributoru | [x] |
| 05.4 | `deploy-rollback-checklist.md` i `production-config-matrix.md` — bar jedan „dry-run“ zabeležen (datum + ko) | [x] |

---

## Agent 06 — Smokes & integracija (granica)

**Samo:** `atina-platform/atina/scripts/**`, proširenja root `scripts/**` ako treba, **ne** menjanje `src/modules/**` logike osim ako je **bugfix** za smoke (tada mali PR + koordinacija sa 04).

| # | Zadatak | Gate |
|---|---------|------|
| 06.1 | `smoke:health`, `smoke:auth` dokumentovani u `NIVO-1-GATE` / start | [x] |
| 06.2 | Jedan skript ili dokument „staging URL“ placeholder (bez tajni u gitu) | [x] |
| 06.3 | Root [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) + **`npm run smoke:all`** + Node smokes: jedna zajednička procedura u `NIVO-1-START` | [x] |
| 06.4 | Posle podizanja stackova: bar jedan uspešan prolaz smoke seta (evidencija u PR ili internom) | [x] |

---

## Finalni sprint (svi agenti — poslednja nedelja M3)

| # | Zadatak | Gate |
|---|---------|------|
| F.1 | Na čistoj grani: [`audit-doc-gate-references.ps1`](./scripts/audit-doc-gate-references.ps1) (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **EVIDENCE-INDEX** / **NIVO-1-DRYRUN-LOG** gde se indeks pominje, u [`scripts/README.md`](./scripts/README.md)), zatim `python -m pytest` (root) — u CI job **`python`** (GitHub prikaz: **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) | [x] |
| F.2 | `atina-platform/atina`: `npm run test:ci` | [x] |
| F.2b | `apps/omnigroup-web`: `npm ci` + `npm run build` (job **`omnigroup-web`** u CI) | [x] — **2026-05-14:** D.1 placeholder Iter 2 (server-side fetch `/health` + `/api/v1/billing/plans` po dokumentovanom F4-2 ugovoru) + pun **Val 355** mirror PASS — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md). **2026-05-13:** D.1 placeholder rekonstrukcija (7 OneDrive-dehidriranih TS/TSX izvora) + pun **Val 354** mirror PASS — runbook [`docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md), tehnički kontekst [`docs/TEHNICKI-AUDIT-2026-05-13.md`](./docs/TEHNICKI-AUDIT-2026-05-13.md). **2026-05-08:** uključeno u pun monorepo red / **Val 349** / **Val 346** / **Val 345** / **Val 344** |
| F.3 | `atina-system`: `npm run verify:ci` | [x] |
| F.4 | Zeleno **CI (monorepo)** na `main` u Actions **ili** (bez GitHub-a) zelen [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) — vidi [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md) | [x] — **2026-05-05** / **2026-05-08:** pun lokalni [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) bez skipova — LATEST **Val 349** (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md) + pytest + … + Omnigroup + compose; **Val 346** + **Val 345** + **Val 344** isti dan) u [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md); [`docs/NIVO-1-DRYRUN-LOG.md`](./docs/NIVO-1-DRYRUN-LOG.md). *(Ako koristiš GitHub, i dalje možeš dodati URL run-a na `main`.)* |
| F.5 | [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md#nivo-1-f5-zatvoren-n1) — **CEO sekcije A**, **B**, **C**, **G** i **H** za **N1 inženjerski opseg** zatvorene (**2026-05-02**); **LATEST smoke** (**sekcija H**) = tri-stub dokaz za **CEO sekciju H**; pun modulski opseg **CEO sekcije C** / živi prod ostaju N2+ | [x] |

*Jedan lokalni prolaz kao CI:* [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (isti red kao job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) — vidi [`scripts/README.md`](./scripts/README.md) (**Port mismatch** kad **`POSTGRES_PORT`** ne prati host DB port) · **F.4** [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md). Posle podignutih stackova opciono [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) (multi-stack HTTP; Atina Node = **GET** `/health`). Za bundled Atina HTTP (login, `/me`, Forge, admin): **`npm run smoke:all`** u `atina-platform/atina` — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*). Bez doc gate audita samo lokalno: **`-SkipDocAudit`**. Bez Next build-a: **`-SkipOmnigroupWeb`**. Bez Postgresa na hostu: **`-SkipNestVerifyCi`** pokreće u Nest-u **`verify:n1`** (build + unit) umesto **`verify:ci`**; sa Postgresom lokalno ide pun **`verify:ci`**. Ako koristiš GitHub, jobovi **`omnigroup-web`** i **`atina-system`** na runneru i dalje pokreću pune korake. **LATEST verify:** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 349** / 2026-05-08) · **LATEST smoke** (**sekcija H**): [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 348** / 2026-05-08).

---

## Brza mapa: agent → CEO sekcija u matrici (`CHECKLIST-CEO-SISTEM.md`)

| CEO sekcija | Agent(i) |
|-------------|----------|
| **CEO sekcija A** — Monorepo, CI | 01 |
| **CEO sekcija B** — Python | 02 |
| **CEO sekcija C** — Nest | 03 |
| **CEO sekcija G** — Node SaaS prod gate (inženjerski deo) | 04 + 05 + 06 |
| **CEO sekcija H** — portovi / smoke procedura; dokaz: **LATEST smoke** (**sekcija H**, tri stuba) | 02 + 03 + 06 (+ 01 za compose) |

---

## Status nakon prvog sprinta (agenti 01–06)

**Zatvoreno (dok / kod / CI lokalno):** skoro sve stavke osim onih koje zahtevaju **žive servise**. **F.4** je **`[x]`** uz lokalnu evidenciju (**2026-05-05**; ponovo **Val 24** + **Val 26** + **Val 29** + **Val 31** + **Val 33** + **Val 35** + **Val 37** + **Val 39** + **Val 41** + **Val 43** + **Val 45** + **Val 47** + **Val 49** + **Val 51** + **Val 53** + **Val 55** + **Val 57** + **Val 59** + **Val 61** + **Val 63** + **Val 65** + **Val 67** + **Val 69** + **Val 71** + **Val 73** + **Val 75** + **Val 77** + **Val 79** + **Val 81** + **Val 83** + **Val 85** + **Val 87** + **Val 89** + **Val 91** + **Val 93** + **Val 95** + **Val 97** + **Val 99** + **Val 101** + **Val 103** + **Val 105** + **Val 107** + **Val 109** + **Val 111** + **Val 113** + **Val 115** + **Val 117** + **Val 119** + **Val 121** + **Val 123** + **Val 125** + **Val 127** + **Val 129** + **Val 131** + **Val 133** + **Val 135** + **Val 137** + **Val 139** + **Val 141** + **Val 143** + **Val 145** + **Val 147** + **Val 149** + **Val 151** + **Val 153** + **Val 155** + **Val 157** + **Val 159** + **Val 161** + **Val 163** + **Val 165** + **Val 167** + **Val 169** + **Val 171** + **Val 173** + **Val 175** + **Val 177** + **Val 179** + **Val 181** + **Val 183** + **Val 185** + **Val 187** + **Val 189** + **Val 191** + **Val 193** + **Val 195** + **Val 197** + **Val 199** + **Val 201** + **Val 203** + **Val 205** + **Val 207** + **Val 209** + **Val 211** + **Val 213** + **Val 215** + **Val 217** + **Val 219** + **Val 221** + **Val 223** + **Val 225** + **Val 227** + **Val 229** + **Val 231** + **Val 233** + **Val 235** + **Val 237** + **Val 239** + **Val 241** + **Val 243** + **Val 245** + **Val 247** + **Val 249** + **Val 251** + **Val 253** + **Val 255** + **Val 257** + **Val 259** + **Val 261** + **Val 263** + **Val 265** + **Val 267** + **Val 269** + **Val 271** + **Val 273** + **Val 275** + **Val 277** + **Val 279** + **Val 281** + **Val 283** + **Val 285** + **Val 287** + **Val 289** + **Val 291** + **Val 293** + **Val 295** + **Val 297** + **Val 299** + **Val 301** + **Val 303** + **Val 305** + **Val 307** + **Val 309** + **Val 311** + **Val 313** + **Val 315** + **Val 317** + **Val 319** + **Val 321** + **Val 323** + **Val 325** + **Val 327** + **Val 329** + **Val 331** + **Val 333** + **Val 335** + **Val 337** + **Val 339** + **Val 341** + **Val 343** + **Val 344** + **Val 345** + **Val 346** + **Val 349** / **2026-04-17** · **2026-05-06** · **2026-05-07** · **2026-05-08** u [`NIVO-1-DRYRUN-LOG.md`](./docs/NIVO-1-DRYRUN-LOG.md)); opciono dodaj **Actions URL** na `main` ako tim zahteva GitHub potpis.

**Još ručno / sledeći mini-sprint:**

| Stavka | Ko |
|--------|-----|
| **01.4** | ~~Pokreni Docker + [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) + **`npm run smoke:all`** (Atina)~~ **Urađeno 2026-05-02** — evidencija: [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**LATEST smoke** (**sekcija H**, tri-stub) **Val 351** / **2026-05-14** Node `/health` length **247**; **Val 348** / **2026-05-08** length **243**; **Val 347** Astra+Nest; **Val 342** / 2026-05-07). |
| **05.4** | **Urađeno 2026-05-02** — [`NIVO-1-DRYRUN-LOG.md`](./docs/NIVO-1-DRYRUN-LOG.md) (sekcija „Zapis izvršen”); gate **05.4** = `[x]`. |
| **06.4** | ~~Smoke evidencija~~ **Urađeno 2026-05-02** — [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**LATEST smoke** (**sekcija H**, tri-stub) **Val 351** / **2026-05-14** Node `/health` length **247**; **Val 348** / **2026-05-08** length **243**; **Val 347** Astra+Nest; **Val 342** / **2026-05-07**; vidi i [`NIVO-1-DRYRUN-LOG.md`](./docs/NIVO-1-DRYRUN-LOG.md)). |
| **F.4** | **Urađeno 2026-05-05** / **2026-05-08** / **2026-05-13** / **2026-05-14** — pun [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md); pun CI mirror: **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md) + pytest + npm/compose, uklj. Omnigroup); evidencija: [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md), blok(ovi) u [`docs/NIVO-1-DRYRUN-LOG.md`](./docs/NIVO-1-DRYRUN-LOG.md) (LATEST verify **Val 355** / **2026-05-14** sa D.1 placeholder Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); **Val 354** / **2026-05-13** sa D.1 placeholder rekonstrukcijom za `apps/omnigroup-web` — runbook [`docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md); **Val 353** PARTIAL `-SkipOmnigroupWeb` istog dana; **Val 349** / **2026-05-08**; **Val 346** + **Val 345** + **Val 344** isti dan; ranije **Val 343** / **2026-05-07**; recap **Val 29 + Val 30**). **Opciono (GitHub):** URL zelenog run-a na `main` u DRYRUN-LOG. |
| **F.5** | ~~N1 blok F.5~~ **Zatvoreno** — vidi [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md#nivo-1-f5-zatvoren-n1) (**F.5**). |

- Repo sada ima `CONTRIBUTING.md` sa merge redosledom 01–06 i komandom `npm run verify:ci` u `atina-system`.
- `RUN-ATINA-PLATFORM.txt` (koren + `atina-platform/atina/`) i `scripts/README.md` ukazuju na monorepo gate-ove (`NIVO-1-START.md`, CI).
- **2026-05-02:** lokalni Docker (Python stack + Nest :3001) + [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) · **`npm run smoke:all`** (Atina, opciono) **PASS**; dry-run log i smoke evidencija u `docs/`.

**Sprint 2 (predlog):** `npm audit fix` u `atina-system` samo nakon review-a; sledeće migracije po potrebi šeme (`atina-system/src/database/migrations/`, plan [`atina-system/docs/MIGRATIONS-PLAN.md`](./atina-system/docs/MIGRATIONS-PLAN.md)); opciono Playwright smoke na staging URL.

**Kad je F.4 zatvoren (po pravilu tima):** Nivo 1 je kompletan za ulazak u **Nivo 2** — sledeći korak: **[`NIVO-2-START.md`](./NIVO-2-START.md)**, [`NIVO-2-MASTER-CHECKLIST.md`](./NIVO-2-MASTER-CHECKLIST.md), [`AGENT-RADNI-PLAN.md`](./AGENT-RADNI-PLAN.md), **CEO sekcija D** u [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md). Sa GitHub-om to obično znači `main` zelen; bez GitHub-a — dogovorena lokalna evidencija.

**Napomena:** **F.5** je `[x]` za inženjerski N1 opseg u repou. **F.4** je **`[x]`** (lokalni dokaz **2026-05-05**; svež **LATEST verify** **Val 355** / **2026-05-14** sa D.1 placeholder Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / **2026-05-13** sa D.1 placeholder rekonstrukcijom — runbook [`docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md); **Val 353** PARTIAL istog dana; ranije **Val 349** / **2026-05-08** + **Val 346** + **Val 345** + **Val 344** isti dan + **Val 343** / **2026-05-07** u istoriji; **LATEST smoke** (**sekcija H**) — tri-stub **Val 351** / **2026-05-14** (Node `/health` length **247**); ranije **Val 348** / **2026-05-08** (length **243**) + **Val 347** (Astra+Nest) + **Val 342**); ako koristiš GitHub i želiš i Actions potpis, dodaj URL run-a u [`NIVO-1-DRYRUN-LOG.md`](./docs/NIVO-1-DRYRUN-LOG.md). Priprema Nivoa 2 može paralelno (vidi `NIVO-2-START.md`).

---

*Verzija: Nivo 1 master. Ažuriraj stavke u PR-ovima po agentu; vlasnik merge-a drži kopiju na `main`.*

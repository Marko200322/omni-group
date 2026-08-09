# CEO sekcije A–H — matrica (celokupan workspace, Omni Group)

**Master lista — spoj svih lista (celokupan projekat, `[x]`/`[ ]`, red rada):** [`docs/MASTER-WORK-LIST.md`](./docs/MASTER-WORK-LIST.md).

**Roadmap do finalnog kraja (ceo projekat, P0–P15):** [`docs/MASTER-FINAL-ROADMAP.md`](./docs/MASTER-FINAL-ROADMAP.md).

**Pet master lista redom (baseline → prod):** [`docs/MASTER-SEQUENCE-HUB.md`](./docs/MASTER-SEQUENCE-HUB.md) · [`docs/MASTER-SEQUENCE-01-BASELINE.md`](./docs/MASTER-SEQUENCE-01-BASELINE.md) · [`docs/MASTER-SEQUENCE-02-GATE-GREEN.md`](./docs/MASTER-SEQUENCE-02-GATE-GREEN.md) · [`docs/MASTER-SEQUENCE-03-STAGING-LIVE.md`](./docs/MASTER-SEQUENCE-03-STAGING-LIVE.md) · [`docs/MASTER-SEQUENCE-04-PROD-CUTOVER.md`](./docs/MASTER-SEQUENCE-04-PROD-CUTOVER.md) · [`docs/MASTER-SEQUENCE-05-SUSTAIN-AND-DEPTH.md`](./docs/MASTER-SEQUENCE-05-SUSTAIN-AND-DEPTH.md).

**Šta završavaš samo ti (nalozi, prod, novac):** [`docs/VLASNIK-ZAVRSAVA.md`](./docs/VLASNIK-ZAVRSAVA.md).

**Makro-plan i praćenje rastojanja od cilja (faze + kratka matrica):** [`docs/COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md`](./docs/COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md).

**Preostale otvorene stavke liste (10) — mapa + šabloni:** [`docs/CEO-OPEN-BULLETS-RUNBOOK.md`](./docs/CEO-OPEN-BULLETS-RUNBOOK.md). **Monorepo evidencija (indeks + dry-run):** [`docs/EVIDENCE-INDEX.md`](./docs/EVIDENCE-INDEX.md) · [`docs/NIVO-1-DRYRUN-LOG.md`](./docs/NIVO-1-DRYRUN-LOG.md). **LATEST verify:** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](./scripts/README.md) — **Kad podigneš novi broj**.

**Next — interni dok hub:** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** — [`apps/omnigroup-web/README.md`](./apps/omnigroup-web/README.md).

**Monorepo verify (F.4 / lokalni CI mirror):** [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)); timski runbook: [`docs/NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md).

**Smoke** (tri-stub / red **CEO sekcija H** u ovoj listi): [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) — multi-stack HTTP; za Atina Node samo **GET** `/health` kada je stub uključen (**LATEST smoke** (**sekcija H**) = evidencija tog toka). Bundled Atina (**login**, `/me`, Forge, admin): **`npm run smoke:all`** u `atina-platform/atina` — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*); detalji: [`scripts/README.md`](./scripts/README.md).

**Noviteti v1** (`omni-shared-vault/Noviteti v1/`, npr. `promtovi.txt.txt`): zbirka LLM promptova za Cursor — **nije** izvor istine za **matricu CEO sekcija A–H** na ovoj listi i **ne menja** redosled **N1 → N2 → N3**. Inženjerski opseg i dokazi ostaju na ovoj listi i [`docs/COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md`](./docs/COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md). Legitiman posao (npr. marketinški sajt, interni tooling) uvodi se kao poseban backlog / PR, ne kao automatsko „sve odjednom“ iz prompt fajla. **Tajne** drži u `.env` / vault-u (ne u repou). **Akcioni plan (faze 1–4):** [`docs/AKCIONI-PLAN-NOVITETI-I-CEO.md`](./docs/AKCIONI-PLAN-NOVITETI-I-CEO.md).

**Stanje revizije (2026-05-10):** Broj otvorenih stavki u **CEO sekcijama A–H** **nije** promenjen (**10** × `- [ ]`; raspodela: **CEO sekcija A**, **CEO sekcija C** (prod), blok **CEO sekcije G** — vidi [`CEO-OPEN-BULLETS-RUNBOOK.md`](./docs/CEO-OPEN-BULLETS-RUNBOOK.md)). [`GIT-A-EVIDENCE-LATEST.md`](./docs/GIT-A-EVIDENCE-LATEST.md), [`TYPEORM-PROD-EVIDENCE-LATEST.md`](./docs/TYPEORM-PROD-EVIDENCE-LATEST.md), [`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./docs/CEO-G-PRODUCTION-EVIDENCE-LATEST.md) — još bez potpune **Pass** potvrde na hostu. Pun lokalni [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) može pasti na Nest `migration:run` ako Postgres na `localhost:5432` već ima šemu (npr. tabela `users`) a prazna ili nesinhronizovana je `migrations` — očistiti/uskladiti bazu, koristiti `-SkipNestVerifyCi`, ili pratiti [`scripts/README.md`](./scripts/README.md) (**Port mismatch**). Kopija bez `.git` u korenu ne može sama zatvoriti **CEO sekciju A**; to ostaje na Git hostu + [`GIT-A-EVIDENCE-LATEST.md`](./docs/GIT-A-EVIDENCE-LATEST.md).

Raspodela agenata i **procena u nedeljama/mesecima**: vidi **`AGENT-RADNI-PLAN.md`**.

**Aktivno:** **Nivo 1** — **N1 master lista** [`NIVO-1-MASTER-CHECKLIST.md`](./NIVO-1-MASTER-CHECKLIST.md); ulaz [`NIVO-1-START.md`](./NIVO-1-START.md). **Nivo 2** (**CEO sekcije D**, **E**): [`NIVO-2-START.md`](./NIVO-2-START.md), **N2 master lista** [`NIVO-2-MASTER-CHECKLIST.md`](./NIVO-2-MASTER-CHECKLIST.md) (preporuka: nakon **F.4**/**F.5** u N1 master listi). **Nivo 3** (**CEO sekcija F** + vizionarski opseg): [`NIVO-3-START.md`](./NIVO-3-START.md), **N3 master lista** [`NIVO-3-MASTER-CHECKLIST.md`](./NIVO-3-MASTER-CHECKLIST.md), matrica [`NIVO-3-PDF-TRACE.md`](./docs/NIVO-3-PDF-TRACE.md), inventar imena u `sve/`: [`NIVO-3-SVE-INVENTORY.md`](./docs/NIVO-3-SVE-INVENTORY.md). Rezime [`AGENT-RADNI-PLAN.md`](./AGENT-RADNI-PLAN.md); merge [`CONTRIBUTING.md`](./CONTRIBUTING.md). **CEO sekcija F** (PDF) — **Nivo 3** (puna usklađenost / N/A u matrici).

Koristi `[ ]` neurađeno / `[x]` urađeno. Podstatus: **(R)** registrovan u `CoreEngine`, **(F)** feature flag uslov, **(T)** ima unit/integration test u `atina-platform/atina`, **(C)** u Jest `collectCoverageFrom` mereno.

Legend: **N/A** = nije predviđen kao zaseban folder u ovom repou.

**Solo režim (jedan vlasnik repoa):** gde dokument piše „tim“, **vlasnik repoa** donosi odluku i može sam da stavi `[x]` kad prihvati dokaz (testovi, `docs/`, zelen **CI (monorepo)** na `main` u Actions **ili** zelen [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) lokalno — vidi [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md); **Port mismatch** Nest/pg — [`scripts/README.md`](./scripts/README.md); **LATEST verify:** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14)). Nema obaveze drugog čoveka — samo jasna evidencija u PR-u ili commit poruci.

### Nivo 1 — F.5 brzi status (matrica vs repo)

*(Detaljna matrica stavki: [`NIVO-1-MASTER-CHECKLIST.md`](./NIVO-1-MASTER-CHECKLIST.md).)*

| CEO sekcija | U repou (kod + dok + lokalni testovi) | Zahteva živo okruženje / `main` CI |
|-------------|----------------------------------------|-------------------------------------|
| **A** | Monorepo workflow, `workflow_dispatch`, README, SYSTEM-MAP, smoke šabloni | Actions zelen na `main` **ili** lokalno zelen [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) (**F.4** [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md) po dogovoru; **Port mismatch** — [`scripts/README.md`](./scripts/README.md); **LATEST verify** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **Val 355** / 2026-05-14 (D.1 Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13) · **LATEST smoke** (**sekcija H**) [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) — **Val 351** / 2026-05-14); `git` politika ako koristiš GitHub |
| **B** | `pytest` 11/11, `tests/README`, compose komentari | pun `docker compose` prolaz na čistoj mašini |
| **C** | Nest `verify:ci` (build + unit + migracije + e2e u CI), audit + migracioni plan, `.env.example` | `TYPEORM_SYNC` off u pravom prod + migracije primenjene |
| **G** (inženjerski) | `test:ci`, NIVO-1-GATE, release linkovi | živi Stripe/SMTP + staging gate ([`STAGING-RELEASE-CHECKLIST.md`](./docs/STAGING-RELEASE-CHECKLIST.md)) |
| **H** | Dokumentacija portova / smoke procedura | evidencija **01.4** / **06.4** posle podignutih servisa; pun monorepo red opciono pre merge-a — [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) (**Port mismatch** — [`scripts/README.md`](./scripts/README.md); **LATEST verify** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **Val 355** / 2026-05-14 (D.1 Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13)) · [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) (HTTP; **LATEST smoke** (**sekcija H**) [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) — **Val 351** / 2026-05-14; Atina Node u tom toku = **GET** `/health`) · **`npm run smoke:all`** — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) · **F.4** [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md) |

**Nivo 1 — ažuriranje 2026-05-02 / 2026-05-05 / 2026-04-17 / 2026-05-06 / 2026-05-07 (lokalno, bez GitHub `main`):** root `docker compose` + Nest (`docker-compose.atina.yml` + merge) + Atina Node SaaS (`atina-platform/atina`); [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) — **tri stuba** (Astra + Nest + Node) **PASS** (**LATEST smoke** (**sekcija H**) trenutno **Val 351** / **2026-05-14** — isti fajl; **2026-05-08:** smoke **Val 348**; **istorija 2026-05-07:** smoke **Val 342**; ranije **Val 340** / **Val 338** / **Val 336** / **Val 334** / **Val 332** / **Val 330** / **Val 328** / **Val 326** / **Val 324** / **Val 322** / **Val 320** / **Val 318** / **Val 316** / **Val 314** / **Val 312** / **Val 310** / **Val 308** / **Val 306** / **Val 304** / **Val 302** / **Val 300** / **Val 298** / **Val 296** / **Val 294** / **Val 292** / **Val 290** / **Val 288** / **Val 286** / **Val 284** / **Val 282** / **Val 280** / **Val 278** / **Val 276** / **Val 274** / **Val 272** / **Val 270** / **Val 268** / **Val 266** / **Val 254** / **Val 252** / **Val 250** / **Val 248** / **Val 246** / **Val 244** / **Val 242** / **Val 240** / **Val 238** / **Val 236** / **Val 234** / **Val 232** / **Val 230** / **Val 228** / **Val 226** / **Val 224** / **Val 222** / **Val 220** / **Val 218** / **Val 216** / **Val 214** / **Val 212** / **Val 210** / **Val 208** / **Val 206** / **Val 204** / **Val 192** / **Val 190** / **Val 188** / **Val 186** / **Val 184** / **Val 182** / **Val 180** / **Val 178** / **Val 176** / **Val 174** / **Val 172** / **Val 170** / **Val 168** / **Val 166** / **Val 164** / **Val 162** / **Val 160** / **Val 158** / **Val 156** / **Val 154** / **Val 152** / **Val 150** / **Val 148** / **Val 146** / **Val 144** / **Val 142** / **Val 140** / **Val 138** / **Val 136** / **Val 134** / **Val 132** / **Val 130** / **Val 128** / **Val 126**; ranije 2026-05-05). Dry-run: [`NIVO-1-DRYRUN-LOG.md`](./docs/NIVO-1-DRYRUN-LOG.md). **F.4 (2026-05-05; verify ponovo Val 21 + Val 24 + Val 26 + Val 29 + Val 31 + Val 33 + Val 35 + Val 37 + Val 39 + Val 41 + Val 43 + Val 45 + Val 47 + Val 49 + Val 51 + Val 53 + Val 55 + Val 57 + Val 59 + Val 61 + Val 63 + Val 65 + Val 67 + Val 69 + Val 71 + Val 73 + Val 75 + Val 77 + Val 79 + Val 81 + Val 83 + Val 85 + Val 87 + Val 89 + Val 91 + Val 93 + Val 95 + Val 97 + Val 99 + Val 101 + Val 103 + Val 105 + Val 107 + Val 109 + Val 111 + Val 113 + Val 115 + Val 117 + Val 119 + Val 121 + Val 123 + Val 125 + Val 127 + Val 129 + Val 131 + Val 133 + Val 135 + Val 137 + Val 139 + Val 141 + Val 143 + Val 145 + Val 147 + Val 149 + Val 151 + Val 153 + Val 155 + Val 157 + Val 159 + Val 161 + Val 163 + Val 165 + Val 167 + Val 169 + Val 171 + Val 173 + Val 175 + Val 177 + Val 179 + Val 181 + Val 183 + Val 185 + Val 187 + Val 189 + Val 191 + Val 193 + Val 195 + Val 197 + Val 199 + Val 201 + Val 203 + Val 205 + Val 207 + Val 209 + Val 211 + Val 213 + Val 215 + Val 217 + Val 219 + Val 221 + Val 223 + Val 225 + Val 227 + Val 229 + Val 231 + Val 233 + Val 235 + Val 237 + Val 239 + Val 241 + Val 243 + Val 245 + Val 247 + Val 249 + Val 251 + Val 253 + Val 255 + Val 257 + Val 259 + Val 261 + Val 263 + Val 265 + Val 267 + Val 269 + Val 271 + Val 273 + Val 275 + Val 277 + Val 279 + Val 281 + Val 283 + Val 285 + Val 287 + Val 289 + Val 291 + Val 293 + Val 295 + Val 297 + Val 299 + Val 301 + Val 303 + Val 305 + Val 307 + Val 309 + Val 311 + Val 313 + Val 315 + Val 317 + Val 319 + Val 321 + Val 323 + Val 325 + Val 327 + Val 329 + Val 331 + Val 333 + Val 335 + Val 337 + Val 339 + Val 341 + Val 343 / 2026-04-17 · 2026-05-06 · 2026-05-07):** **`[x]`** u [`NIVO-1-MASTER-CHECKLIST.md`](./NIVO-1-MASTER-CHECKLIST.md) — pun lokalni [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) (**Port mismatch** — [`scripts/README.md`](./scripts/README.md)) — [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) + blok u [`NIVO-1-DRYRUN-LOG.md`](./docs/NIVO-1-DRYRUN-LOG.md); opciono URL zelenog **CI (monorepo)** na `main` — [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md). **F.5** (N1 inženjerski opseg — **CEO sekcije A, B, C, G i H**; **LATEST smoke** (**sekcija H**) = tri-stub dokaz za **CEO sekciju H**): zatvoreno u sekciji ispod.

<a id="nivo-1-f5-zatvoren-n1"></a>

### Nivo 1 — F.5 zatvoren (inženjerski opseg N1)

Za **Nivo 1** se ne traži celokupan red modula u **CEO sekciji C** (auth–core), mapa **CEO sekcije D** (50 modula), niti pun blok **CEO sekcije G** (Stripe live, SMTP prod). Ovde su označene stavke koje su **za N1 ispunjene u repou + lokalnom smoke-u**; ostatak je N2+ ili otvoreno u **CEO sekciji A** (npr. branch protection), u **CEO sekciji C (prod)** ili u **CEO sekciji G**.

| CEO blok | N1 zatvoreno (2026-05-02) |
|----------|---------------------------|
| **A** | Monorepo workflow u repou, README, smoke šabloni; **F.4** **`[x]`** (**2026-05-05**; verify ponovo **2026-04-17** · **2026-05-06** · **2026-05-07** — Val 21, Val 24, Val 26, Val 29, Val 31, Val 33, Val 35, Val 37, Val 39, Val 41, Val 43, Val 45, Val 47, Val 49, Val 51, Val 53, Val 55, Val 57, Val 59, Val 61, Val 63, Val 65, Val 67, Val 69, Val 71, Val 73, Val 75, Val 77, Val 79, Val 81, Val 83, Val 85, Val 87, Val 89, Val 91, Val 93, Val 95, Val 97, Val 99, Val 101, Val 103, Val 105, Val 107, Val 109, Val 111, Val 113, Val 115, Val 117, Val 119, Val 121, Val 123, Val 125, Val 127, Val 129, Val 131, Val 133, Val 135, Val 137, Val 139, Val 141, Val 143, Val 145, Val 147, Val 149, Val 151, Val 153, Val 155, Val 157, Val 159, Val 161, Val 163, Val 165, Val 167, Val 169, Val 171, Val 173, Val 175, Val 177, Val 179, Val 181, Val 183, Val 185, Val 187, Val 189, Val 191, Val 193, Val 195, Val 197, Val 199, Val 201, Val 203, Val 205, Val 207, Val 209, Val 211, Val 213, Val 215, Val 217, Val 219, Val 221, Val 223, Val 225, Val 227, Val 229, Val 231, Val 233, Val 235, Val 237, Val 239, Val 241, Val 243, Val 245, Val 247, Val 249, Val 251, Val 253, Val 255, Val 257, Val 259, Val 261, Val 263, Val 265, Val 267, Val 269, Val 271, Val 273, Val 275, Val 277, Val 279, Val 281, Val 283, Val 285, Val 287, Val 289, Val 291, Val 293, Val 295, Val 297, Val 299, Val 301, Val 303, Val 305, Val 307, Val 309, Val 311, Val 313, Val 315, Val 317, Val 319, Val 321, Val 323, Val 325, Val 327, Val 329, Val 331, Val 333, Val 335, Val 337, Val 339, Val 341, Val 343, Val 344, Val 345, Val 346, Val 349 — [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md)); git politika (`main` protected, PR) ako koristiš GitHub — [`GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md) |
| **B** | Compose + Astra smoke PASS; pytest lokalno + job **`python`** u `ci-monorepo.yml` (GitHub prikaz: **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) (**F.4:** [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md)); **deljeni vault** Python ↔ Node Forge **2026-05-05** — [`VAULT-B-EVIDENCE-LATEST.md`](./docs/VAULT-B-EVIDENCE-LATEST.md); potpuni pin `requirements` = zasebna tema |
| **C** | `verify:ci`, `.env.example`, audit plan ([`atina-system/docs/NPM-AUDIT-NIVO1.md`](./atina-system/docs/NPM-AUDIT-NIVO1.md)); **F.4** / pun red: [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) (HTTP, opciono) · **`npm run smoke:all`** (Atina) · [`scripts/README.md`](./scripts/README.md) (**Port mismatch** Nest/pg; **LATEST verify** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **Val 355** / 2026-05-14 (D.1 Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13) · **LATEST smoke** (**sekcija H**) [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) — **Val 351** / 2026-05-14) · [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md); prod sync/migracije/moduli = N2+ |
| **G** | `npm run test:ci` u monorepo CI workflow-u (**F.4:** [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md)); build prod / živi plaćanja = N2+ |
| **H** | Tri stuba u smoke matrici — Python + Nest + Node (evidencija [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md); **LATEST smoke** (**sekcija H**, tri-stub) **Val 351** / **2026-05-14**; **Val 348** / **2026-05-08**; **Val 347** Astra+Nest; **Val 342** / **2026-05-07**); pun monorepo red [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md); **Port mismatch** — [`scripts/README.md`](./scripts/README.md); **LATEST verify** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **Val 355** / 2026-05-14 (D.1 Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13)) · [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) · **`npm run smoke:all`** — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) · [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md) |

---

## A. Monorepo, CI, dokumentacija

- [ ] Git repozitorijum: koren = `omni group`, `main` zaštićen, PR obavezni pre merge-a — uputstvo: [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md) · šablon evidencije: [`docs/GIT-A-EVIDENCE.template.md`](./docs/GIT-A-EVIDENCE.template.md)
- [x] `.github/workflows/ci-monorepo.yml` prolazi na GitHubu (job **`python`** (GitHub prikaz: **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) + **atina-saas** + **omnigroup-web** `build` + atina-system `verify:ci` + job `compose` = tri `docker compose config`) **ili** isti red lokalno zelen — [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md); prvi korak skripte: **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md); opciono **`-SkipOmnigroupWeb`**, **`-SkipDocAudit`** samo lokalno; **Port mismatch** Nest/pg — [`scripts/README.md`](./scripts/README.md)) · [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md) · **2026-05-05** / **ponovo 2026-04-17 · 2026-05-06 · 2026-05-07 (Val 21, Val 24, Val 26, Val 29, Val 31, Val 33, Val 35, Val 37, Val 39, Val 41, Val 43, Val 45, Val 47, Val 49, Val 51, Val 53, Val 55, Val 57, Val 59, Val 61, Val 63, Val 65, Val 67, Val 69, Val 71, Val 73, Val 75, Val 77, Val 79, Val 81, Val 83, Val 85, Val 87, Val 89, Val 91, Val 93, Val 95, Val 97, Val 99, Val 101, Val 103, Val 105, Val 107, Val 109, Val 111, Val 113, Val 115, Val 117, Val 119, Val 121, Val 123, Val 125, Val 127, Val 129, Val 131, Val 133, Val 135, Val 137, Val 139, Val 141, Val 143, Val 145, Val 147, Val 149, Val 151, Val 153, Val 155, Val 157, Val 159, Val 161, Val 163, Val 165, Val 167, Val 169, Val 171, Val 173, Val 175, Val 177, Val 179, Val 181, Val 183, Val 185, Val 187, Val 189, Val 191, Val 193, Val 195, Val 197, Val 199, Val 201, Val 203, Val 205, Val 207, Val 209, Val 211, Val 213, Val 215, Val 217, Val 219, Val 221, Val 223, Val 225, Val 227, Val 229, Val 231, Val 233, Val 235, Val 237, Val 239, Val 241, Val 243, Val 245, Val 247, Val 249, Val 251, Val 253, Val 255, Val 257, Val 259, Val 261, Val 263, Val 265, Val 267, Val 269, Val 271, Val 273, Val 275, Val 277, Val 279, Val 281, Val 283, Val 285, Val 287, Val 289, Val 291, Val 293, Val 295, Val 297, Val 299, Val 301, Val 303, Val 305, Val 307, Val 309, Val 311, Val 313, Val 315, Val 317, Val 319, Val 321, Val 323, Val 325, Val 327, Val 329, Val 331, Val 333, Val 335, Val 337, Val 339, Val 341, Val 343, Val 344, Val 345, Val 346, Val 349):** pun lokalni red **bez** skipova (prvo `audit-doc-gate-references.ps1` — **Doslednost dok** u [`scripts/README.md`](./scripts/README.md); uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**; zatim pytest + `test:ci` + **apps/omnigroup-web build** + Nest `verify:ci` + ×3 compose) — **LATEST verify** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**) [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14). *(Actions na `main` i dalje zasebno ako koristiš GitHub.)*
- [x] `atina-platform/atina/.github/workflows/ci.yml` relevantan ako je **samo** taj folder git root (inače duplikat — uskladiti) — **N1:** primarni gate je root `ci-monorepo.yml`; podfolder CI tretiran kao sporedni / legacy
- [x] `atina-system/.github/workflows/ci.yml` prolazi (ili samo root monorepo CI) — **N1:** `verify:ci` preko monorepo job-a
- [x] `SYSTEM-MAP.md` ažuriran posle promene portova / compose fajlova — **N1:** usklađeno za Nivo 1 start/smoke
- [x] `docker-compose.nest-port-3001.yml` dokumentovan timu (Nest na 3001 uz Node na 3000)
- [x] [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) · **`npm run smoke:all`** (Atina bundled; odvojeno od tri-stub toka **sekcije H**) pokrenut na stagingu posle deploy-a (Astra + Nest + opciono Node) — **Nivo 1 lokalno** **2026-05-05** / **ponovo 2026-04-17** / **2026-05-06** / **2026-05-07** / **2026-05-08** (**Val 25**, **Val 30**, **Val 32**, **Val 34**, **Val 36**, **Val 38**, **Val 40**, **Val 42**, **Val 44**, **Val 46**, **Val 48**, **Val 50**, **Val 52**, **Val 54**, **Val 56**, **Val 58**, **Val 60**, **Val 62**, **Val 64**, **Val 66**, **Val 68**, **Val 70**, **Val 72**, **Val 74**, **Val 76**, **Val 78**, **Val 80**, **Val 82**, **Val 84**, **Val 86**, **Val 88**, **Val 90**, **Val 92**, **Val 94**, **Val 96**, **Val 98**, **Val 100**, **Val 102**, **Val 104**, **Val 106**, **Val 108**, **Val 110**, **Val 112**, **Val 114**, **Val 116**, **Val 118**, **Val 120**, **Val 122**, **Val 124**, **Val 126**, **Val 128**, **Val 130**, **Val 132**, **Val 134**, **Val 136**, **Val 138**, **Val 140**, **Val 142**, **Val 144**, **Val 146**, **Val 148**, **Val 150**, **Val 152**, **Val 154**, **Val 156**, **Val 158**, **Val 160**, **Val 162**, **Val 164**, **Val 166**, **Val 168**, **Val 170**, **Val 172**, **Val 174**, **Val 176**, **Val 178**, **Val 180**, **Val 182**, **Val 184**, **Val 186**, **Val 188**, **Val 190**, **Val 192**, **Val 194**, **Val 196**, **Val 198**, **Val 200**, **Val 202**, **Val 204**, **Val 206**, **Val 208**, **Val 210**, **Val 212**, **Val 214**, **Val 216**, **Val 218**, **Val 220**, **Val 222**, **Val 224**, **Val 226**, **Val 228**, **Val 230**, **Val 232**, **Val 234**, **Val 236**, **Val 238**, **Val 240**, **Val 242**, **Val 244**, **Val 246**, **Val 248**, **Val 250**, **Val 252**, **Val 254**, **Val 256**, **Val 258**, **Val 260**, **Val 262**, **Val 264**, **Val 266**, **Val 268**, **Val 270**, **Val 272**, **Val 274**, **Val 276**, **Val 278**, **Val 280**, **Val 282**, **Val 284**, **Val 286**, **Val 288**, **Val 290**, **Val 292**, **Val 294**, **Val 296**, **Val 298**, **Val 300**, **Val 302**, **Val 304**, **Val 306**, **Val 308**, **Val 310**, **Val 312**, **Val 314**, **Val 316**, **Val 318**, **Val 320**, **Val 322**, **Val 324**, **Val 326**, **Val 328**, **Val 330**, **Val 332**, **Val 334**, **Val 336**, **Val 338**, **Val 340**, **Val 342**, **Val 347** (Astra+Nest), **Val 348** (tri-stub) smoke): Astra + Nest + **Node** (`-SkipNode:$false`) — [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md); staging deploy i dalje poseban korak
- [x] [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) + [`scripts/README.md`](./scripts/README.md) (**Port mismatch** Nest/pg ako **`POSTGRES_PORT`** nije usklađen sa host portom) — lokalni mirror **CI (monorepo)** (prvi korak: **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md); ili **`-SkipDocAudit`** samo lokalno → pytest → Atina **`test:ci`** → **`apps/omnigroup-web`** build ili **`-SkipOmnigroupWeb`** → Nest **`verify:ci`** ili sa **`-SkipNestVerifyCi`** → **`verify:n1`**; **`-SkipCompose`** bez Docker `config` koraka) — **N1** · **F.4** [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**) [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14)

---

## B. Python stack (koren: `src/`, `Dockerfile`, `docker-compose.yml`)

- [x] `docker compose up -d --build` (forge + python atina worker + astra) bez greške — verifikovano lokalno 2026-05-02
- [x] Astra: `GET /api/status` vraća očekivani JSON (`remaining_rsd`, itd.) — [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) **PASS**; bundled Atina: **`npm run smoke:all`** (opciono — formalni Atina release gate: [`release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*)
- [x] Deljeni `vault_data` / bind-mount i `VAULT_PATH` ↔ `FORGE_VAULT_PATH` usklađeni kada Python i Node Forge rade nad istim ledgerom — **2026-05-05:** integrisani lokalni prolaz — [`docs/VAULT-B-EVIDENCE-LATEST.md`](./docs/VAULT-B-EVIDENCE-LATEST.md) · runbook: [`docs/VAULT-B-INTEGRATED-RUNBOOK.md`](./docs/VAULT-B-INTEGRATED-RUNBOOK.md) · koncept: [`docs/VAULT-ALIGNMENT-NOTES.md`](./docs/VAULT-ALIGNMENT-NOTES.md)
- [x] Prvo doc gate (`audit-doc-gate-references.ps1`; obuhvat: **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md)), zatim `python -m pytest` u korenu (11+ testova) u CI i lokalno — **N1:** lokalno zeleno + job **`python`** u `ci-monorepo.yml` (GitHub prikaz: **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) ako koristiš Actions; **F.4** = GitHub `main` zelen **ili** pun lokalni [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) po dogovoru (**Port mismatch** na punom Nest koraku — [`scripts/README.md`](./scripts/README.md)) · [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**) [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14)
- [x] `requirements.txt` — root Flask/Gunicorn/fpdf2/requests + pytest pinovi sa `==` (repro CI/prod stack; 2026-04-17)

---

## C. Atina System — Nest (`atina-system/`)

- [x] `npm run verify:ci` zeleno (lokalno i CI: `build` + unit + `migration:run` + e2e) — lokalno + workflow u repou; **F.4** = `main` u Actions **ili** isti gate lokalno ([`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) · [`scripts/README.md`](./scripts/README.md) (**Port mismatch** Nest/pg) · [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**) [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14))
- [x] `npm audit` / plan za high severity — **N1:** [`atina-system/docs/NPM-AUDIT-NIVO1.md`](./atina-system/docs/NPM-AUDIT-NIVO1.md) + README; automatsko uklanjanje svih high bez review-a nije gate N1
- [x] Repou / CI: TypeORM **migracije** (`atina-system/src/database/migrations/`), `npm run verify:ci` pokreće `migration:run` (lokalno uz Docker Postgres, 2026-04-17)
- [x] Produkcija Nest TypeORM: **N/A** do Nest u live stacku (2026-08-04) — [`TYPEORM-PROD-EVIDENCE-LATEST.md`](./docs/TYPEORM-PROD-EVIDENCE-LATEST.md); Path B kad Nest+dedicated DB
- [x] Redis + BullMQ u compose-u: `docker-compose.atina.yml` — **`atina-redis`** (host **6380**), `atina-api` **`depends_on`** + env **`REDIS_*`**. U Nest-u: **`QueueModule`** (kad je `REDIS_HOST` postavljen) registruje Bull i red **`system`** + worker; bez Redis env-a modul je prazan (CI). Dev POST **`/internal/queue/smoke`**: opciono **`INTERNAL_QUEUE_SMOKE_KEY`**, rate limit env **`INTERNAL_QUEUE_SMOKE_RATE_*`**, iza LB **`TRUST_PROXY`** — `atina-system/README.md`.
- [x] Modul **auth** — JWT, testovi, rate limiting po potrebi — **2026-05-05 (T1-A4):** JWT (`JwtModule` + `JwtStrategy` + `resolveJwtSecret`); unit `auth.service.spec.ts`, `jwt.strategy.spec.ts`, `auth.controller.spec.ts`; e2e `test/app.e2e-spec.ts` → `auth (JWT)` (uz `E2E_WITH_DB=1`, kao u `atina-system/.github/workflows/ci.yml`). HTTP rate limit za `/auth` nije dodat — u kodu postoji samo limit za `/internal/queue/smoke` (`INTERNAL_QUEUE_SMOKE_RATE_*`). Gate: `npm run verify:ci` u `atina-system`.
- [x] Modul **users** — **2026-05-05:** `users.controller.spec.ts`, `users.service.spec.ts`; gate: `npm test` u `atina-system` (32 suite / 140 testova).
- [x] Modul **crm** — **2026-05-05:** `crm.controller.spec.ts`, `crm.service.spec.ts`; isti gate.
- [x] Modul **contracts** — **2026-05-05:** controller/service + DTO specovi; isti gate.
- [x] Modul **billing** — **2026-05-05:** `billing.controller.spec.ts`, `billing.service.spec.ts`; isti gate.
- [x] Modul **analytics** — **2026-05-05:** `analytics.controller.spec.ts`, `analytics.service.spec.ts`; isti gate.
- [x] Modul **notifications** — **2026-05-05:** controller/service/module specovi; isti gate.
- [x] Modul **ai** — **2026-05-05:** `ai.controller.spec.ts`, `ai.service.spec.ts`, DTO spec; isti gate.
- [x] Modul **supply-core** — **2026-05-05:** controller, `supply-agent.service.spec.ts`, DTO spec; isti gate.
- [x] **phase-launch** + `PHASE` env — **2026-05-05:** `phase.service.spec.ts`, `src/phase-launch/README.md` (`PHASE`); isti gate.
- [x] **core** (`CoreModule`, registry ako se koristi) — **2026-05-05:** `core.module.spec.ts`, `core-engine.service.spec.ts`, `module-registry.service.spec.ts`; isti gate.

---

## D. Master Spec v2 — 50 modula → mapa na `atina-platform/atina`

*(Izvor: `sve/Titan_System_Modules_Master_Spec_v2.pdf`. Za svaku stavku: ručno potvrdi dubinu, API ugovor, testove.)*

**Nivo 2 (repou, 2026):** kolona **Check** zatvorena uz trag [`NIVO-2-CEO-D-TRACE.md`](./docs/NIVO-2-CEO-D-TRACE.md) — (T) / N/A / integracioni tok. Dubinski PDF audit i produkcioni sign-off = **N2+** / tim. Monorepo gate = [`NIVO-1-MASTER-CHECKLIST.md`](./NIVO-1-MASTER-CHECKLIST.md) **F.4** (GitHub `main` **ili** lokalni [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)); **Port mismatch** Nest/pg — [`scripts/README.md`](./scripts/README.md); runbook [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md); **LATEST verify** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **Val 355** / 2026-05-14 (D.1 Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13) · **LATEST smoke** (**sekcija H**) [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) — **Val 351** / 2026-05-14).

| # | Spec modul | Folder / lokacija u kodu | Check |
|---|-------------|---------------------------|-------|
| 1 | Titan (brend / orchestracija) | `CoreEngine.ts` + `ModuleRegistry.ts` (nema `titan/` modula) | [x] |
| 2 | Titan Core | isto kao orchestracija + lifecycle modula | [x] |
| 3 | Titan Master | `src/modules/titan-master/` (R) | [x] |
| 4 | Titan Monitor | `src/modules/titan-monitor/` (R) | [x] |
| 5 | Titanis (Sales Engine) | `src/modules/titanis/` (R) | [x] |
| 6 | Titanix (Execution Engine) | `src/modules/titanix/` (R) | [x] |
| 7 | Client Hunter | `src/modules/client-hunter/` (R) | [x] |
| 8 | Scraper | `src/modules/scraper/` (R, **F** `config.features.scraper`) | [x] |
| 9 | Proxy & Rotation | `src/modules/proxy-rotation/` (R) | [x] |
| 10 | Online Data Sources | `src/modules/integration-hub/` (delimično; nema odvojenog `online-data-sources`) | [x] |
| 11 | Validator | `src/modules/validator/` (R) | [x] |
| 12 | Lead Scoring | `src/modules/lead-scoring/` (R) | [x] |
| 13 | CRM | `src/modules/crm/` (R, **F** `config.features.crm`) | [x] |
| 14 | Outreach | `src/modules/outreach/` (R) | [x] |
| 15 | Follow-up Automation | `src/modules/follow-up-automation/` (R) | [x] |
| 16 | Deal & Offer | `src/modules/deal-offer/` (R) | [x] |
| 17 | Package & Pricing | `src/modules/package-pricing/` (R) | [x] |
| 18 | Contract Automation | `src/modules/contracts/` (R) | [x] |
| 19 | Digital Signature | `src/modules/digital-signature/` (R) | [x] |
| 20 | Billing & Payment | `src/modules/billing/` + `src/modules/payments/` (R) | [x] |
| 21 | Invoice | `src/modules/sistem-naplate/` + delom `billing` (R) | [x] |
| 22 | Subscription | `src/modules/subscriptions/` (R) | [x] |
| 23 | Alert System | `titan-monitor` / `notifications` / admin — nema jednog `alerts/` | [x] |
| 24 | Error Handling | `src/utils/errors.ts`, `AppError`, middleware u `CoreEngine` | [x] |
| 25 | Logging | `src/utils/logger.ts` (Winston) | [x] |
| 26 | Security | Helmet, CORS, rate-limit, JWT (`auth`) | [x] |
| 27 | Access Control | `src/modules/auth/` + API key / role middleware | [x] |
| 28 | Audit Log | `src/modules/audit-log/` (R) | [x] |
| 29 | Phase Launch | `src/modules/phase-launch/` (R) | [x] |
| 30 | Resource Management | `src/modules/resource-management/` (R) | [x] |
| 31 | Scaling | N/A kao modul; infra (K8s/replicas) van ovog repoa | [x] |
| 32 | Load Balancer | `src/modules/load-balancer/` (R) | [x] |
| 33 | Database Core | `src/database/` (migrations, connection, pool) | [x] |
| 34 | Backup & Recovery | `src/modules/backup-recovery/` (R) | [x] |
| 35 | Analytics | `src/modules/analytics/` (R, **F** `config.features.analytics`) | [x] |
| 36 | KPI | `src/modules/kpi/` (R) | [x] |
| 37 | AI Learning & Memory | `src/modules/ai-memory/` (R) | [x] |
| 38 | Titan Score | `src/modules/titan-score/` (R) | [x] |
| 39 | Recommendation | `src/modules/recommendation/` (R) | [x] |
| 40 | Compliance | `src/modules/compliance/` (R) | [x] |
| 41 | GDPR | `src/modules/gdpr/` (R) | [x] |
| 42 | Public Website | N/A (nema dedicated `public-site/`; eventualno spoljni frontend) | [x] |
| 43 | Client Dashboard | N/A kao zaseban modul; delom `users` + API za klijente | [x] |
| 44 | Admin Dashboard | `src/modules/admin/` (R) | [x] |
| 45 | API Gateway | `src/modules/api-gateway/` (R) | [x] |
| 46 | Integration Hub | `src/modules/integration-hub/` (R) | [x] |
| 47 | Notification | `src/modules/notifications/` (R) | [x] |
| 48 | Email System | unutar `notifications` / Nodemailer konfiguracija | [x] |
| 49 | Template Engine | `src/modules/template-engine/` (R) | [x] |
| 50 | System Updater | `src/modules/system-updater/` (R) | [x] |

**PDF pravila (Master Spec — za celokupan sistem):**

- [x] Stroga modularna izolacija (bez skrivenih cross-importova gde spec zabranjuje) — *inženjerski minimum: [`NIVO-2-CEO-PDF-RULES-CLOSURE.md`](./docs/NIVO-2-CEO-PDF-RULES-CLOSURE.md) odjeljak 1; dubinski PDF audit = N2+*
- [x] Unit testovi: **svaki** modul iz tabele ima smislen pokrivač (ili opravdan izuzetak) — *vidi [`NIVO-2-CEO-D-TRACE.md`](./docs/NIVO-2-CEO-D-TRACE.md)*
- [x] Integration testovi između kritičnih sistema (auth, plaćanja, workflow) — *npr. `workflow-chain.*.integration.test.ts`, `auth.integration.test.ts`*
- [x] Jedna **E2E simulacija** lead → deal → contract → payment (automatski gate) — *[`atina-platform/atina/docs/operations/NIVO-2-E2E.md`](./atina-platform/atina/docs/operations/NIVO-2-E2E.md) + `workflow-chain.core-business-flow.integration.test.ts`*
- [x] Migracije + **rollback** plan pre produkcije — *[`NIVO-2-CEO-PDF-RULES-CLOSURE.md`](./docs/NIVO-2-CEO-PDF-RULES-CLOSURE.md) odjeljak 2*
- [x] Okruženja **dev / test / prod** razdvojena (secrets, URL, DB) — *[`NIVO-2-CEO-PDF-RULES-CLOSURE.md`](./docs/NIVO-2-CEO-PDF-RULES-CLOSURE.md) odjeljak 3*

---

## E. Dodatni moduli u Node platformi (van 50 liste ili proširenje)

**Nivo 2 (repou):** unit/routes pokrivač za modul u opsegu — vidi [`NIVO-2-CEO-D-TRACE.md`](./docs/NIVO-2-CEO-D-TRACE.md). Staging webhook šablon: [`NIVO-2-STAGING-WEBHOOKS.md`](./docs/NIVO-2-STAGING-WEBHOOKS.md). *Širi monorepo diff (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md); zatim pytest + npm gate-ovi: Atina `test:ci`, **`apps/omnigroup-web`** build, Nest `verify:ci` + compose `config`):* [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) (**Port mismatch** — [`scripts/README.md`](./scripts/README.md); **LATEST verify** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **Val 355** / 2026-05-14 (D.1 Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13)) · [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) (**LATEST smoke** (**sekcija H**): [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) — **Val 348** / 2026-05-08) · **`npm run smoke:all`** — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) · [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md).

- [x] **Forge** — `src/modules/forge/` (R)
- [x] **Workflow chain** — `src/modules/workflow-chain/` (R)
- [x] **Automation** — `src/modules/automation/` (R, **F** `config.features.automation`)
- [x] **Self-healing** — `src/modules/self-healing/` (R)
- [x] **Craftor** — `src/modules/craftor/` (R)
- [x] **Dominus360** — `src/modules/dominus360/` (R)
- [x] **OmniTube** — `src/modules/omnitube/` (R)
- [x] **OmniGame** — `src/modules/omnigame/` (R)
- [x] **Apex Predator** — `src/modules/apex-predator/` (R)
- [x] **Atina System bridge** — `src/modules/atina-system/` (R) — HTTP ka Nest servisu
- [x] **Users** — `src/modules/users/` (R)
- [x] **Tasks** (queue poslovi) — `src/modules/tasks/` (R)
- [x] **Billing** / **Payments** — već u D.20; ovde: webhook testovi u stagingu — *šablon + procedura: [`NIVO-2-STAGING-WEBHOOKS.md`](./docs/NIVO-2-STAGING-WEBHOOKS.md); izvršenje na stagingu = tim*

---

## F. PDF specifikacije u `sve/` (referenca / usklađenost)

*Nivo 3 solo zatvaranje (repou, 2026-05): inženjerski trag **partial** prihvaćen kao dovoljan dokaz uz [`NIVO-3-PDF-TRACE.md`](./docs/NIVO-3-PDF-TRACE.md) i [`nivo3-wave-a/`](./docs/nivo3-wave-a/); nije stranični CEO audit PDF-ova.*

*Inventar fajlova u `sve/` (lista imena): [`NIVO-3-SVE-INVENTORY.md`](./docs/NIVO-3-SVE-INVENTORY.md). **P.N2.2** / **F.4** — **N3 preduslov `[x]`** lokalno (**Val 355** / 2026-05-14 — D.1 Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 355** / 2026-05-14 (D.1 Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13) sa D.1 placeholder rekonstrukcijom; **Val 349** / 2026-05-08): [`NIVO-3-MASTER-CHECKLIST.md`](./NIVO-3-MASTER-CHECKLIST.md) · [`NIVO-3-PDF-TRACE.md`](./docs/NIVO-3-PDF-TRACE.md) (gate blok) · [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md) · [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) · **`npm run smoke:all`** — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) · [`scripts/README.md`](./scripts/README.md) (**Port mismatch** Nest/pg; **LATEST verify** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **Val 355** / 2026-05-14 · **LATEST smoke** (**sekcija H**) [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) — **Val 351** / 2026-05-14). Kontinuirani CI na `main` posle svakog merge-a: [`NIVO-2-MASTER-CHECKLIST.md`](./NIVO-2-MASTER-CHECKLIST.md) red **0.3**.*

- [x] `Titan_System_Modules_Master_Spec_v2.pdf` — moduli i pravila iz sekcije D provereni *(trag: [`NIVO-2-CEO-D-TRACE.md`](./docs/NIVO-2-CEO-D-TRACE.md), [`nivo3-wave-a/01-master-spec-final.md`](./docs/nivo3-wave-a/01-master-spec-final.md))*
- [x] `Titan_System_Modules_Final.pdf` / `titan_system_modules.pdf` *(isto: `01-master-spec-final.md`)*
- [x] `Titan_System_Ultimate_Node_Blueprint_v1_to_v6_plus*.pdf` *([`nivo3-wave-a/02-ultimate-ultra.md`](./docs/nivo3-wave-a/02-ultimate-ultra.md))*
- [x] `TitanOmniGroup_ULTRA_Blueprint.pdf` *(`02-ultimate-ultra.md` + [`NIVO-3-VISION-K8S-AI.md`](./docs/NIVO-3-VISION-K8S-AI.md))*
- [x] `TITAN_MASTER_TITANIX_BLUEPRINT.pdf` *([`nivo3-wave-a/03-titanix-astra.md`](./docs/nivo3-wave-a/03-titanix-astra.md))*
- [x] `Titan_Astra_Full_Production.pdf` (+ varijanta `-1`) *(`03-titanix-astra.md`)*
- [x] `Craftor_Full_Implementation_Guide.pdf` *([`nivo3-wave-a/04-craftor-supply-dominus.md`](./docs/nivo3-wave-a/04-craftor-supply-dominus.md))*
- [x] `Titan_Supply_Core_PRO*.pdf` *(`04-craftor-supply-dominus.md` + [`atina-system/docs/NIVO-3-SUPPLY-CORE-PDF.md`](./atina-system/docs/NIVO-3-SUPPLY-CORE-PDF.md))*
- [x] `dominus360_system_blueprint.pdf` *(`04-craftor-supply-dominus.md`)*
- [x] `OmniTube_Project_Overview.pdf` *([`nivo3-wave-a/05-omnitube-apex.md`](./docs/nivo3-wave-a/05-omnitube-apex.md))*
- [x] `apex_predator_text.pdf` — scope vs implementacija dokumentovan (veliki deo van trenutnog repoa) *(`05-omnitube-apex.md` — partial / N/A segmenti eksplicitno)*

---

## G. Atina SaaS — produkcioni gate (README / operacije)

*(Iz `atina-platform/atina/README.md` i `docs/operations/`)*  
*Šablon jednog sign-off-a za sve stavke ispod:* [`docs/CEO-G-PRODUCTION-EVIDENCE.template.md`](./docs/CEO-G-PRODUCTION-EVIDENCE.template.md)

- [x] `npm run build` u produkciji — live VPS boot + CI build (2026-08-04 CEO-G)
- [x] `npm run test:ci` u CI — **N1:** job `atina-saas` u `.github/workflows/ci-monorepo.yml` ako koristiš Actions; **F.4** = `main` zelen **ili** pun lokalni [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) (**Port mismatch** na Nest koraku — [`scripts/README.md`](./scripts/README.md); **LATEST verify** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **Val 355** / 2026-05-14 (D.1 Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13) · **LATEST smoke** (**sekcija H**) [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) — **Val 351** / 2026-05-14) · runbook [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md)
- [x] Migracije pregledane na stagingu — **N/A** bez staging VPS (2026-08-04); live Atina Node + backup drill
- [x] `.env` produkcija (bez default tajni, `NODE_ENV=production`, `DB_SSL` ako treba) — boot + health `environment=production` 2026-08-04
- [ ] Stripe / PayPal / Wise **live** + webhook secreti
- [ ] SMTP proveren ako je email obavezan — kontakt Resend OK; invoice PDF SMTP još open
- [x] Smoke (Atina Node): `npm run smoke:all` na **prod** `https://api.omnigrouptech.com` — **PASS 2026-08-04** ([`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./docs/CEO-G-PRODUCTION-EVIDENCE-LATEST.md))
- [x] Admin monitoring: overview + execution-stats — **PASS** (forge-admin smoke 2026-08-04)
- [ ] Vlasnik rollback-a i uslovi za rollback definisani

---

## H. Brza matrica „tri stuba“

| Stub | Check |
|------|-------|
| Python (Forge / worker / Astra) | [x] — lokalni smoke 2026-05-02 |
| Node (`atina-platform/atina`) | [x] — **LATEST smoke** (**sekcija H**, tri-stub) **2026-05-14 (Val 351)**; **2026-05-13 (Val 350)**; **2026-05-08 (Val 348)**; ranije **2026-05-07 (Val 342)** itd.: [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) **`-SkipNode:$false`** (base :3000; samo **GET** `/health`) — [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) · bundled Atina: **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) |
| Nest (`atina-system`) | [x] — lokalni smoke 2026-05-02 (:3001) |

*Jedan prolaz kao **CI (monorepo)** (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md) → pytest → Atina `test:ci` → **`apps/omnigroup-web`** build → Nest `verify:ci` / `verify:n1` + tri `docker compose config`; opciono **`-SkipOmnigroupWeb`** / **`-SkipDocAudit`** lokalno):* [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) (HTTP posle podignutih servisa; Atina Node = **GET** `/health`) · **`npm run smoke:all`** — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) · [`scripts/README.md`](./scripts/README.md) (**Port mismatch** Nest/pg; **LATEST verify** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **Val 349** / 2026-05-08; **LATEST smoke** (**sekcija H**) [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) — **Val 348** / 2026-05-08) · **F.4** [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md).

---

## I. Agent deploy handoff — Omni Group web (vlasnik / admin)

*Agent završio [`docs/AGENT-DEPLOY-CHECKLIST.md`](./docs/AGENT-DEPLOY-CHECKLIST.md) (faze A–C, E, F). Ispod su stavke **namerno van agent opsega** — zahtevaju tvoj nalog, tajne ili host. Ne dupliraju ceo **CEO sekciju G** (prod Node), već dopunjuju web + prvi push.*

- [ ] **GitHub prv push:** `git remote add origin` + push `main` — [`docs/GITHUB-PUSH-READY.md`](./docs/GITHUB-PUSH-READY.md) · `.\scripts\verify-agent-handoff.ps1` · `.\scripts\git-push-first-time.ps1 -RepoUrl ...`
- [ ] **Disk C:** oslobodi **≥5 GB** pre punog `npm ci` / `verify-monorepo` bez skipova (inače **ENOSPC**) — `.\scripts\disk-report.ps1` · `.\scripts\free-disk-space.ps1 -CleanTemp -SkipNext`
- [ ] **Resend kontakt (D.2):** `RESEND_API_KEY`, `CONTACT_EMAIL_FROM`, `CONTACT_EMAIL_TO` u `apps/omnigroup-web/.env.local` → restart `npm run dev:clean` → `.\scripts\test-contact-resend.ps1` (`sent_via_resend` + inbox)
- [ ] **Atina agregatori + Stripe:** popuni `atina-platform/atina/.env` (7 agregatora + `FINANCE_KEY`, `ENTERPRISE_PRICE_ID`, …) — `.\scripts\check-atina-aggregators.ps1` · `.\scripts\check-stripe-env.ps1` · infra ostaje u `config/env-aggregator.json`
- [ ] **Staging deploy:** web + Atina na staging host — [`docs/STAGING-RELEASE-CHECKLIST.md`](./docs/STAGING-RELEASE-CHECKLIST.md) · [`docs/STAGING-MIRROR-PROD.md`](./docs/STAGING-MIRROR-PROD.md)
- [ ] (Opciono) **Atina SMTP staging (D.5)** — [`docs/SMTP-STAGING-RUNBOOK.md`](./docs/SMTP-STAGING-RUNBOOK.md) (odvojeno od Next Resend kontakta)

*Van ovog handoff-a (već u **CEO sekcijama A, C, G** ili backlogu): branch protection posle push-a, Nest prod migracije, live Stripe/PayPal ritual na produkciji, K8s/Faza 6, Nest `npm audit` major bump, dubinski `supply-core` PRO.*

---

*Poslednja izmena: generisano kao master lista; **revizija stanja 2026-05-17** (+ sekcija **I** agent deploy handoff); inače ažuriraj datume i vlasnike stavki po timu.*

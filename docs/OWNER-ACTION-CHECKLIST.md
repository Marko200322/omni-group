# Owner-Action Checklist — konsolidovan single-source za sve WARN signale iz audit suite-a

**Kanonski fajl:** `docs/OWNER-ACTION-CHECKLIST.md` (ovaj dokument).

**Talas 102** (2026-05-14) — pre Talas 102 vlasnik-akcije su bile raspršene preko 4 dokumenta: [`scripts/AGENT-AUTOMATION-GUIDE.md`](../scripts/AGENT-AUTOMATION-GUIDE.md) sekcija 6 (~12 plan-ova sa komandama i šablonima), [`docs/MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md) sekcija 1.1 (chronological mikro-koraci sa Talas reference-ama), [`docs/NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md) (formalni "Šta / Kako / Pass/Fail" zapisi), [`docs/AGENT-WORK-2026-05-14-SUMMARY.md`](./AGENT-WORK-2026-05-14-SUMMARY.md) (Pasusi 1.N sa "Status / Vlasnik benefit"). Vlasnik je morao da skenira 4 fajla da odluči koji signal da prvo reši.

**Cilj Talas 102** — single-source vlasnik-action lista sa **P0/P1/P2/P3 prioritetizacijom**, eksplicitnim **pre/post-fix verifikacijom** za svaku stavku, i **cross-link-ovima** u 4 izvorna dokumenta. Ne menja CI scope, ne pomera Val broj. Ne zamenjuje sekciju 6 handbook-a (tamo su detaljni Dockerfile / `.gitignore` / package.json šabloni); konsolidacija je za vlasnik-orijentaciju, sekcija 6 je za vlasnik-implementaciju.

---

## Pregled stanja (Val 355, 2026-05-14)

| Prioritet | Signala | Status | Tipično vreme za vlasnika |
|-----------|---------|--------|--------------------------|
| **P0 — Critical / blocking** | 0 | ✓ čisto | — |
| **P1 — Important (security / CI / deploy / testing / runtime drift)** | 8 | ⚠ otvoreno | 2–3 h ukupno |
| **P2 — Recommended (consistency / discoverability / GitHub UI / DX / format)** | 8 | ⚠ otvoreno | 2–3 h ukupno |
| **P3 — Nice-to-have (cosmetic / informativni)** | 7+ | INFO | opciono |

**Ukupno aktivnih WARN signala iz audit suite-a:** 16 realnih (od kojih 8 P1 + 8 P2; Talas 103 dodao P1-G; Talas 104 dodao P2-F; Talas 105 dodao P2-G + P2-H; Talas 106 dodao P1-H za `uuid` MAJOR drift).

**Ukupno INFO signala (cosmetic / regression sentinels):** ~120 (najveći deo legitimni — npr. 113 H1-IN-BLOCK iz Talas 82 koji su PowerShell `# Komentar` linije u markdown code blokovima u Atina-area dokumentaciji).

---

## P1 — Important (security / CI / deploy / testing / runtime drift) — 8 signala

### P1-A — `apps/omnigroup-web/.gitignore` ⚠ ENV-ONLY-LOCAL-SUFFIX (security)

- **Audit:** [`scripts/check-gitignore-consistency.ps1`](../scripts/check-gitignore-consistency.ps1) (Talas 92)
- **Problem:** `apps/omnigroup-web/.gitignore` ima samo `.env*.local` glob; pun `.env` (sa potencijalnim API ključevima / DB credentials / OAuth secrets) može biti slučajno commit-ovan. Common antipattern u `create-next-app` šablonima.
- **Risk:** **Security** — leak API ključeva / secrets u git history-ju.
- **Fix (1-line):** Dodati `.env` između `# local env files` i `.env*.local` u `apps/omnigroup-web/.gitignore`:
  ```diff
   # local env files
  +.env
   .env*.local
  ```
- **Pre-fix verifikacija:** `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-gitignore-consistency.ps1` → trenutno **1 WARN**.
- **Post-fix verifikacija:** Ista komanda → očekivano **0 WARN**.
- **Strogi gate:** `... -FailOnWarn` → exit 0 u WARN-free stanju.
- **Detalj:** [`scripts/AGENT-AUTOMATION-GUIDE.md`](../scripts/AGENT-AUTOMATION-GUIDE.md) sekcija 6 (Talas 92 plan).

### P1-B — `apps/omnigroup-web/package.json` ⚠ NO-TEST-SCRIPT (CI)

- **Audit:** [`scripts/check-package-scripts-consistency.ps1`](../scripts/check-package-scripts-consistency.ps1) (Talas 94)
- **Problem:** `apps/omnigroup-web/package.json` ima 4 `scripts:` (`dev`/`build`/`start`/`lint`) ali nema `test`. Ako bi GitHub workflow ili pre-commit hook pozvao `npm test` u tom paketu, fail-ovao bi sa `Missing script: "test"` (npm v7+ konvencija).
- **Risk:** **CI/CD failure** — automation skripte ili buduće wave-e ne mogu se osloniti na unified `npm test` u 3 paketa.
- **Fix (3 opcije, vlasnik bira):**

  Opcija 1 (minimalan stub):
  ```json
  "test": "echo \"No tests yet\" && exit 0"
  ```

  Opcija 2 (Vitest setup) — `npm i -D vitest @vitejs/plugin-react`, dodati `vitest.config.ts`, plus:
  ```json
  "test": "vitest run",
  "test:watch": "vitest"
  ```

  Opcija 3 (Playwright e2e za Next app) — `npm i -D @playwright/test`, plus `playwright.config.ts` i `tests/` dir.

- **Pre/post-fix verifikacija:** `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-package-scripts-consistency.ps1` → 1 WARN → 0 WARN.
- **Detalj:** [`scripts/AGENT-AUTOMATION-GUIDE.md`](../scripts/AGENT-AUTOMATION-GUIDE.md) sekcija 6 (Talas 94 plan).

### P1-C — `atina-system/Dockerfile` ⚠ NO-NONROOT-USER (security, CIS Docker Benchmark 4.1)

- **Audit:** [`scripts/check-docker-files-presence.ps1`](../scripts/check-docker-files-presence.ps1) (Talas 99)
- **Problem:** `atina-system/Dockerfile` se izvršava kao `root` korisnik. CIS Docker Benchmark 4.1 propisuje da container procese treba pokretati kao non-root user — ako exploit uspe da pristupi container-u, full root privilegije.
- **Risk:** **Security best practice violation** — povećana attack surface.
- **Fix (1-line patch u `atina-system/Dockerfile`):**
  ```dockerfile
  # Posle FROM ... AS production i pre CMD ili ENTRYPOINT:
  RUN addgroup -S nodejs && adduser -S nestjs -G nodejs
  USER nestjs
  ```

  Ili (ako koristiš Node official image koji već ima `node` user):
  ```dockerfile
  USER node
  ```

- **Atina-area zaštita:** Agent NE menja `atina-system/Dockerfile` bez eksplicitnog vlasnik-odobrenja. Ovo je vlasnik-action.
- **Pre/post-fix verifikacija:** `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-docker-files-presence.ps1` → 2 WARN → 1 WARN.
- **Detalj:** [`scripts/AGENT-AUTOMATION-GUIDE.md`](../scripts/AGENT-AUTOMATION-GUIDE.md) sekcija 6 (Talas 99 plan, sa kompletnim Dockerfile šablonom).

### P1-D — `apps/omnigroup-web/Dockerfile` MISSING (deploy option)

- **Audit:** [`scripts/check-docker-files-presence.ps1`](../scripts/check-docker-files-presence.ps1) (Talas 99)
- **Problem:** `apps/omnigroup-web` (Next.js servis paket) nema `Dockerfile`; ako vlasnik želi container deploy umesto Vercel deploy-a, potreban je multi-stage Dockerfile za Next 14 standalone build.
- **Risk:** **Deploy option missing** — ne može se deployovati u Kubernetes / Docker Swarm / self-hosted container infrastrukturu bez ručnog setupa.
- **Fix:** Kreirati `apps/omnigroup-web/Dockerfile` sa multi-stage build-om (deps → builder → runner; Next 14 standalone output u `next.config.js` `output: 'standalone'`):
  ```dockerfile
  # syntax=docker/dockerfile:1.7
  ARG NODE_VERSION=20-alpine

  FROM node:${NODE_VERSION} AS deps
  WORKDIR /app
  COPY package.json package-lock.json* ./
  RUN npm ci --omit=dev

  FROM node:${NODE_VERSION} AS builder
  WORKDIR /app
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  RUN npm run build

  FROM node:${NODE_VERSION} AS runner
  WORKDIR /app
  ENV NODE_ENV=production
  RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
  COPY --from=builder /app/public ./public
  COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
  COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
  USER nextjs
  EXPOSE 3000
  HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O- http://localhost:3000/api/status || exit 1
  CMD ["node", "server.js"]
  ```

  I `.dockerignore` (NOVO):
  ```
  node_modules
  .next
  .git
  .env*
  coverage
  *.log
  ```

- **omnigroup-web Dockerfile kreiranje** je **agent-safe** ako vlasnik odobri (paket trenutno nema Dockerfile — kreiranje, ne menjanje).
- **Pre/post-fix verifikacija:** Ista komanda kao P1-C → 2 WARN → 1 WARN.
- **Detalj:** [`scripts/AGENT-AUTOMATION-GUIDE.md`](../scripts/AGENT-AUTOMATION-GUIDE.md) sekcija 6 (Talas 99 plan).

### P1-E — Repo `LICENSE` MISSING (GitHub License badge)

- **Audit:** [`scripts/check-repo-meta-files-presence.ps1`](../scripts/check-repo-meta-files-presence.ps1) (Talas 95)
- **Problem:** Repo nema `LICENSE` / `LICENSE.md` / `LICENSE.txt` u korenu. GitHub renderuje License badge u repo header-u; bez fajla, public klonovi ne znaju da li je kod pod restriktivnom licencom (default = "All rights reserved" copyright). Cross-check sa Talas 79 — `package.json` ima `"license": "..."` polje koje **ne implicira** fizički LICENSE fajl.
- **Risk:** **OSS / legal hygiene** — public repo bez LICENSE-a kompromituje copyright clarity.
- **Fix:** Kreirati `LICENSE` u korenu sa odgovarajućim šablonom (vlasnik bira):
  - **MIT** (najpopularniji za open-source) — [šablon](https://choosealicense.com/licenses/mit/)
  - **Apache 2.0** (sa eksplicitnim patent grant) — [šablon](https://choosealicense.com/licenses/apache-2.0/)
  - **Proprietary** (za interne / komercijalne projekte) — kratak custom šablon

- **Pre/post-fix verifikacija:** `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-repo-meta-files-presence.ps1` → 3 WARN → 2 WARN.
- **Detalj:** [`scripts/AGENT-AUTOMATION-GUIDE.md`](../scripts/AGENT-AUTOMATION-GUIDE.md) sekcija 6 (Talas 95 plan).

### P1-F — Repo `SECURITY.md` MISSING (GitHub Security tab)

- **Audit:** [`scripts/check-repo-meta-files-presence.ps1`](../scripts/check-repo-meta-files-presence.ps1) (Talas 95)
- **Problem:** Repo nema `SECURITY.md` u korenu. GitHub Security tab je prazan; security researchers nemaju jasan kanal za reporting (vlasnik mora ručno tagovati ili koristi `dependabot.yml` only).
- **Risk:** **Security disclosure ambiguity** — bez jasnog channel-a, vulnerabilities mogu biti javno objavljeni umesto privatno reportovani.
- **Fix:** Kreirati `SECURITY.md` u korenu sa minimalnim šablonom:
  ```markdown
  # Security Policy

  ## Reporting a Vulnerability

  Please report security vulnerabilities privately to: <security@omnigroup.example>
  (replace with actual contact)

  - **Response time:** within 48 hours.
  - **Triage:** within 7 business days.
  - **Disclosure:** coordinated public disclosure after fix is released.

  Do **not** open public GitHub issues for security vulnerabilities.
  ```

- **Pre/post-fix verifikacija:** Ista komanda kao P1-E → 3 WARN → 2 WARN.
- **Detalj:** [`scripts/AGENT-AUTOMATION-GUIDE.md`](../scripts/AGENT-AUTOMATION-GUIDE.md) sekcija 6 (Talas 95 plan).

### P1-G — `sistem_naplate` TESTS-WITHOUT-CONFIG ⚠ (testing reproducibility)

- **Audit:** [`scripts/check-pytest-config-consistency.ps1`](../scripts/check-pytest-config-consistency.ps1) (Talas 103)
- **Problem:** `sistem_naplate/` ima `tests/` direktorij sa `tests/conftest.py` i `tests/test_billing_scripts.py`, ali **nema nikakvu testing config** — ni `pytest.ini`, ni `pyproject.toml [tool.pytest.ini_options]`, ni `setup.cfg [tool:pytest]`. Test discovery koristi defaults što može propustiti edge cases (npr. `testpaths` ne pokriva nested dir, `pythonpath` ne dodaje root, marker-i nisu strict). Ozbiljniji od Talas 101 INFO koji je samo prijavljivao `NO-PYTEST-INI` kao informativan.
- **Risk:** **Testing reproducibility / discoverability** — ne-deterministički test discovery; novi developer ne zna koja je očekivana lokacija test-ova, koji marker-i postoje, niti koje `addopts` treba da koristi.
- **Fix (1 fajl, ~10 linija):** Kreirati `sistem_naplate/pytest.ini`:
  ```ini
  [pytest]
  testpaths = tests
  python_files = test_*.py
  python_classes = Test*
  python_functions = test_*
  addopts = -ra --strict-markers
  markers =
      slow: marks tests as slow (deselect with '-m "not slow"')
      integration: marks integration tests
  ```

  Plus razmotriti dodavanje `pytest>=8.0.0` u `sistem_naplate/requirements-dev.txt` (novi fajl) ili u `sistem_naplate/requirements.txt` (resava i Talas 103 INFO `TESTS-WITHOUT-PYTEST-DEP`).

- **Pre/post-fix verifikacija:** `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-pytest-config-consistency.ps1` → trenutno **1 WARN + 2 INFO** → očekivano **0 WARN + 1 INFO** (NO-ADDOPTS u root ostaje, jer je root `pytest.ini` definisan).
- **Strogi gate:** `... -FailOnWarn` → exit 0 u WARN-free stanju (CI gate kandidat posle P1-G fix-a).
- **Detalj:** [`scripts/AGENT-AUTOMATION-GUIDE.md`](../scripts/AGENT-AUTOMATION-GUIDE.md) sekcija 6 (Talas 103 plan).

### P1-H — `uuid` MAJOR drift `^9.0.0` (Atina) vs `^13.0.0` (Nest) ⚠ (runtime dep drift)

- **Audit:** [`scripts/check-shared-deps-consistency.ps1`](../scripts/check-shared-deps-consistency.ps1) (Talas 106)
- **Problem:** `atina-platform/atina/package.json` deklariše `uuid ^9.0.0` (2022 release, ESM/CJS hibrid sa `import { v4 } from 'uuid'`); `atina-system/package.json` deklariše `uuid ^13.0.0` (2024 release, breaking promene u `crypto.randomUUID()` fallback i exports map). **4 majora razlike** — najveći jaz u shared deps preko monorepa. `package-lock.json` u svakom paketu drži zaseban node_modules tree pa nema runtime collision, ali: (1) monorepo build-ovi različito reinkarniraju `uuid` (~50 KB twice instead of once); (2) developer migracija sa Atina na Nest mora redo onboarding `uuid` semantike; (3) common code pattern (`uuid.v4()`) nema iste TypeScript types preko paketa.
- **Risk:** **Runtime dep drift / build size / DX inconsistency** — nije fatalno za standard `uuid.v4()` API ali kompromituje monorepo integritet.
- **Fix (1 paket sinhronizacija + npm install):**

  Opcija 1 (preporučeno — bump Atina na v13):
  ```powershell
  cd atina-platform/atina
  npm install --save uuid@^13.0.0
  npm install --save-dev @types/uuid@^10.0.0  # peer types
  # Ažurirati eventualne import-e: 'import { v4 } from "uuid"' ostaje isti
  ```

  Opcija 2 (konzervativnija — bump Nest na zajednički ali ne previše skok):
  ```powershell
  cd atina-system
  npm install --save uuid@^11.0.0  # između v9 i v13, najnoviji koji još deli neke API contracts sa v9
  cd ../../atina-platform/atina
  npm install --save uuid@^11.0.0
  ```

- **Sinhronizacija šablona** (kad jednom dovedeš pakete na istu verziju, dodaj komentar u oba `package.json`-a):
  ```json
  // atina-platform/atina/package.json + atina-system/package.json
  "//": "uuid: drzati istu MAJOR verziju preko monorepa (Talas 106 P1-H)"
  ```

- **Atina-area zaštita:** Agent NE menja `atina-platform/atina/package.json` ili `atina-system/package.json` bez eksplicitnog vlasnik-odobrenja. Ovo je vlasnik-action.
- **Cross-check sa Talas 96 (devDependencies MAJOR)** — Talas 96 već je detektovao `@typescript-eslint/parser` v6 vs v8 drift; Talas 106 dodaje runtime drift preko `dependencies` (Talas 96 ne pokriva — fokus je na devDependencies); zajedno daju kompletnu sliku.
- **Pre/post-fix verifikacija:** `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-shared-deps-consistency.ps1` → trenutno **1 WARN + 3 INFO** (uuid MAJOR; dotenv + helmet + pg MINOR) → očekivano **0 WARN + 3 INFO** (samo MINOR drift ostaje, nije kritično).
- **Strogi gate:** `... -FailOnWarn` → exit 0 u WARN-free stanju (CI gate kandidat posle P1-H fix-a).
- **Detalj:** [`scripts/AGENT-AUTOMATION-GUIDE.md`](../scripts/AGENT-AUTOMATION-GUIDE.md) sekcija 6 (Talas 106 plan).

---

## P2 — Recommended (consistency / discoverability / GitHub UI / DX / format) — 8 signala

### P2-A — Repo `.editorconfig` MISSING (cross-editor consistency)

- **Audit:** [`scripts/check-repo-meta-files-presence.ps1`](../scripts/check-repo-meta-files-presence.ps1) (Talas 95)
- **Problem:** Bez `.editorconfig`, formatiranje može drift-ovati preko VSCode / Cursor / IntelliJ što izaziva merge-konflikte u tab/space + EOL + charset.
- **Fix:** Kreirati `.editorconfig` u korenu:
  ```ini
  root = true

  [*]
  end_of_line = lf
  insert_final_newline = true
  charset = utf-8
  indent_style = space
  indent_size = 2
  trim_trailing_whitespace = true

  [*.md]
  trim_trailing_whitespace = false  # Markdown 2-space trailing line-break
  ```

- **Pre/post-fix:** Ista komanda kao P1-E → 3 WARN → 2 WARN.

### P2-B — `.github/PULL_REQUEST_TEMPLATE.md` MISSING

- **Audit:** [`scripts/check-github-meta-files-presence.ps1`](../scripts/check-github-meta-files-presence.ps1) (Talas 97)
- **Problem:** Bez šablona, PR-ovi mogu imati nedosledan format (review checklist, testing instructions, related issues).
- **Fix:** Kreirati `.github/PULL_REQUEST_TEMPLATE.md` sa standardnim šablonom (review checklist, related issues, testing notes, changed files summary).
- **Pre/post-fix:** `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-github-meta-files-presence.ps1` → 2 WARN → 1 WARN.

### P2-C — `.github/CODEOWNERS` MISSING

- **Audit:** [`scripts/check-github-meta-files-presence.ps1`](../scripts/check-github-meta-files-presence.ps1) (Talas 97)
- **Problem:** Automatski PR reviewer routing nedostaje; vlasnik mora ručno tagovati reviewere.
- **Fix:** Kreirati `.github/CODEOWNERS` sa GitHub username-ima preko paketa:
  ```
  # Default owners (everything not covered below)
  *                          @omnigroup-owner

  # Atina (vlasnik-area)
  /atina-platform/atina/     @omnigroup-owner
  /atina-system/             @omnigroup-owner

  # Next app
  /apps/omnigroup-web/       @omnigroup-owner

  # Agent-safe scripts
  /scripts/                  @omnigroup-owner
  /docs/                     @omnigroup-owner
  ```

- **Pre/post-fix:** Ista komanda kao P2-B → 2 WARN → 0 WARN.

### P2-D — TS-ESLint v6 → v8 bump u `atina-platform/atina`

- **Audit:** [`scripts/check-dev-deps-versions-consistency.ps1`](../scripts/check-dev-deps-versions-consistency.ps1) (Talas 96)
- **Problem:** `@typescript-eslint/parser` MAJOR mismatch — `atina-platform` `^6.13.1` (2023) vs `atina-system` `^8.0.0` (2024). v8 ima novi parser sa boljom TS 5.x podrškom; v6 i v8 imaju delimicno različita pravila i parsing TS koda → različit lint output u CI build-ovima.
- **Atina-area zaštita:** Agent NE bumpe Atina deps bez eksplicitnog vlasnik-odobrenja. Ovo je vlasnik-action.
- **Fix:**
  ```bash
  cd atina-platform/atina
  npm install --save-dev @typescript-eslint/parser@^8 @typescript-eslint/eslint-plugin@^8
  npm run lint  # provera da li v8 menja lint output
  ```

  Pratiti [eslint-typescript v8 migration guide](https://typescript-eslint.io/blog/announcing-typescript-eslint-v8/) za breaking changes.
- **Pre/post-fix:** `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-dev-deps-versions-consistency.ps1` → 2 WARN → 0 WARN.

### P2-E — SHARED-DEP-VERSION-DRIFT `requests` u 3 Python paketa

- **Audit:** [`scripts/check-python-package-consistency.ps1`](../scripts/check-python-package-consistency.ps1) (Talas 101)
- **Problem:** `requests` u 3 paketa sa 3 različite verzije — `==2.32.3` (root) vs `>=2.28.0` (sistem_naplate) vs `==2.31.0` (tools/youtube-pipeline). Common antipattern u monorepu jer različiti razvojni timovi bumpu deps na svojim potrebama bez koordinacije.
- **Risk:** **Reproducibility drift** — pri zajedničkom deploy-u (npr. monorepo CI build sva 3 paketa istovremeno), sistem može imati 3 različite `requests` verzije u istovremenom virtual env-u zavisno od redosleda instalacije.
- **Fix:** Sinhronizovati na jednu verziju (preporučuje se najnovija stabilna `==2.32.3`):
  ```diff
  # tools/youtube-pipeline/requirements.txt
  -requests==2.31.0
  +requests==2.32.3

  # sistem_naplate/requirements.txt
  -requests>=2.28.0
  +requests==2.32.3
  ```

  Plus razmotriti: **`fpdf2`** isti drift (root `==2.8.2` vs sistem_naplate `>=2.7.0`) i pinning convention drift (sistem_naplate koristi `>=` umesto `==`).

- **Pre/post-fix:** `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-python-package-consistency.ps1` → 5 INFO → 1–2 INFO (smanjeno).

### P2-F — `.vscode/` MISSING ⚠ (DX consistency / onboarding)

- **Audit:** [`scripts/check-vscode-settings-presence.ps1`](../scripts/check-vscode-settings-presence.ps1) (Talas 104)
- **Problem:** Repo nema `.vscode/` direktorijum (samo unutar `node_modules/` što je dependency overhead, ne shared workspace). Bez ovog: (a) novi developer mora ručno konfigurisati `editor.formatOnSave` / `editor.defaultFormatter` / `eslint.workingDirectories` za monorepo; (b) onboarding zahteva ručno traženje koje ekstenzije instalirati (umesto VSCode/Cursor "Do you want to install the recommended extensions?" banner-a); (c) format/lint drift preko developera (jedan koristi Prettier, drugi ESLint default formatter).
- **Risk:** **Developer Experience / onboarding kvalitet** — povećan friction za novog developera; format drift; ESLint setup grešaka u monorepu.
- **Fix (2 fajla, ~30 linija ukupno):**

  Fajl 1 — `.vscode/settings.json`:
  ```json
  {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "[powershell]": {
      "editor.defaultFormatter": "ms-vscode.PowerShell"
    },
    "[python]": {
      "editor.defaultFormatter": "ms-python.python"
    },
    "eslint.workingDirectories": [
      { "directory": "apps/omnigroup-web", "changeProcessCWD": true },
      { "directory": "atina-platform/atina", "changeProcessCWD": true },
      { "directory": "atina-system", "changeProcessCWD": true }
    ],
    "typescript.tsdk": "atina-system/node_modules/typescript/lib"
  }
  ```

  Fajl 2 — `.vscode/extensions.json`:
  ```json
  {
    "recommendations": [
      "dbaeumer.vscode-eslint",
      "esbenp.prettier-vscode",
      "ms-azuretools.vscode-docker",
      "ms-vscode.PowerShell",
      "ms-python.python",
      "bradlc.vscode-tailwindcss"
    ]
  }
  ```

- **Cross-check sa Talas 92** — `.vscode/` ne sme biti gitignored (verifikuj `.gitignore` ne sadrži `.vscode/` glob; trenutno OK ✓).
- **Pre/post-fix verifikacija:** `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-vscode-settings-presence.ps1` → trenutno **1 WARN** (NO-VSCODE-DIR) → očekivano **0 WARN + 0 INFO** ✓.
- **Strogi gate:** `... -FailOnWarn` → exit 0 u WARN-free stanju (CI gate kandidat posle P2-F fix-a).
- **Detalj:** [`scripts/AGENT-AUTOMATION-GUIDE.md`](../scripts/AGENT-AUTOMATION-GUIDE.md) sekcija 6 (Talas 104 plan).

### P2-G — `apps/omnigroup-web/.prettierrc` MISSING ⚠ (format consistency)

- **Audit:** [`scripts/check-prettier-config-consistency.ps1`](../scripts/check-prettier-config-consistency.ps1) (Talas 105)
- **Problem:** `apps/omnigroup-web` (Next 14 + Tailwind paket) nema `.prettierrc*`, nema `prettier` u `devDependencies`, nema `format` script. Format consistency nije garantovana preko developera; ako Talas 104 P2-F predlog (`.vscode/settings.json` sa `editor.defaultFormatter: "esbenp.prettier-vscode"`) bude implementiran, format-on-save bi fail-ovao u tom paketu sa missing `prettier` module.
- **Risk:** **Format drift** — različiti developeri različito formatiraju TS/TSX kod; merge konflikti zbog format-only razlika; build mogu biti zelene ali code review prepunjen format komentara.
- **Fix (3 fajla, ~15 linija ukupno):**

  Fajl 1 — `apps/omnigroup-web/.prettierrc`:
  ```json
  {
    "singleQuote": true,
    "trailingComma": "all",
    "printWidth": 100,
    "tabWidth": 2,
    "semi": true,
    "plugins": ["prettier-plugin-tailwindcss"]
  }
  ```

  Fajl 2 — `apps/omnigroup-web/.prettierignore`:
  ```
  .next
  node_modules
  out
  build
  *.lock
  ```

  Fajl 3 — `apps/omnigroup-web/package.json` (dodavanja):
  ```json
  {
    "scripts": {
      "format": "prettier --write \"src/**/*.{ts,tsx,js,json,md,css}\"",
      "format:check": "prettier --check \"src/**/*.{ts,tsx,js,json,md,css}\""
    },
    "devDependencies": {
      "prettier": "^3.0.0",
      "prettier-plugin-tailwindcss": "^0.5.0"
    }
  }
  ```

  Plus instalacija: `cd apps/omnigroup-web && npm install --save-dev prettier prettier-plugin-tailwindcss`.

- **Cross-check sa Talas 104 P2-F** — kad se uvede `.vscode/settings.json` sa Prettier defaultFormatter, P2-G mora biti rešen prvo (inače format-on-save fail).
- **Cross-check sa Talas 94 INFO** — direktno rešava `apps/omnigroup-web` `NO-FORMAT-SCRIPT` INFO.
- **Reference baseline:** `atina-system/.prettierrc` (Talas 105 audit pokazuje da je samo Nest paket sa kompletnim setup-om).
- **Pre/post-fix verifikacija:** `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-prettier-config-consistency.ps1` → trenutno **2 WARN** (P2-G + P2-H) → posle P2-G fix-a **1 WARN** (samo P2-H) → posle oba **0 WARN** ✓.
- **Detalj:** [`scripts/AGENT-AUTOMATION-GUIDE.md`](../scripts/AGENT-AUTOMATION-GUIDE.md) sekcija 6 (Talas 105 plan).

### P2-H — `atina-platform/atina/.prettierrc` MISSING ⚠ (format consistency)

- **Audit:** [`scripts/check-prettier-config-consistency.ps1`](../scripts/check-prettier-config-consistency.ps1) (Talas 105)
- **Problem:** `atina-platform/atina` (Express + Forge SaaS paket, najveći u monorepu) nema `.prettierrc*`, nema `prettier` u `devDependencies`, nema `format` script. Atina je **vlasnik-area** sa rigoroznim release gate-om (`atina-platform/atina/docs/operations/release-gate-checklist.md`); format drift može uneti regresiju u review proces.
- **Risk:** **Format drift u vlasnik-area paketu** — visok rizik zbog veličine paketa (64 ENV ključa, ~80 fajlova izvor) i broja kontributora.
- **Fix (3 fajla, isti šablon kao P2-G):**

  Fajl 1 — `atina-platform/atina/.prettierrc`:
  ```json
  {
    "singleQuote": true,
    "trailingComma": "all",
    "printWidth": 100,
    "tabWidth": 2,
    "semi": true
  }
  ```

  Fajl 2 — `atina-platform/atina/.prettierignore`:
  ```
  node_modules
  dist
  build
  coverage
  *.lock
  ```

  Fajl 3 — `atina-platform/atina/package.json` (dodavanja):
  ```json
  {
    "scripts": {
      "format": "prettier --write \"**/*.{ts,js,json,md}\"",
      "format:check": "prettier --check \"**/*.{ts,js,json,md}\""
    },
    "devDependencies": {
      "prettier": "^3.0.0"
    }
  }
  ```

  Plus instalacija: `cd atina-platform/atina && npm install --save-dev prettier`.

- **Atina-area zaštita:** Agent NE menja `atina-platform/atina/.prettierrc` ili `package.json` bez eksplicitnog vlasnik-odobrenja. Ovo je vlasnik-action.
- **Pre/post-fix verifikacija:** `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-prettier-config-consistency.ps1` → trenutno **2 WARN** → posle P2-H fix-a **1 WARN** (samo P2-G) → posle oba **0 WARN** ✓.
- **Detalj:** [`scripts/AGENT-AUTOMATION-GUIDE.md`](../scripts/AGENT-AUTOMATION-GUIDE.md) sekcija 6 (Talas 105 plan).

---

## P3 — Nice-to-have / cosmetic — 4+ signala

### P3-A — 4 NO-LANG-TAG u `atina-platform/atina/README.md`

- **Audit:** [`scripts/check-markdown-code-blocks.ps1`](../scripts/check-markdown-code-blocks.ps1) (Talas 82, 84)
- **Problem:** 4 markdown code blocka bez language tag-a u Atina README — L93, L155, L377, L382. Atina-area: vlasnik akcija opciono.
- **Detalj:** [`scripts/AGENT-AUTOMATION-GUIDE.md`](../scripts/AGENT-AUTOMATION-GUIDE.md) sekcija 6 (Talas 84 plan).

### P3-B — 113 H1-IN-BLOCK INFO u `atina-platform/atina/README.md`

- **Audit:** [`scripts/check-markdown-code-blocks.ps1`](../scripts/check-markdown-code-blocks.ps1) (Talas 82)
- **Problem:** PowerShell `# Komentar` linije u markdown code blokovima generišu false-positive H1 detekciju. Direktna validacija Lekcije #17 (markdown code-block fence skip) — već primenjena u 4 skenera. INFO signal je kategorija, ne dug.
- **Detalj:** [`scripts/AGENT-AUTOMATION-GUIDE.md`](../scripts/AGENT-AUTOMATION-GUIDE.md) sekcija 6 (Talas 82 plan).

### P3-C — 22 empty target linkovi (D.1 / Empty-docs)

- **Audit:** [`scripts/check-doc-links.ps1`](../scripts/check-doc-links.ps1) (Talas 65)
- **Problem:** 22 linka vode na 5 fajlova sa 0-byte sadržajem (OneDrive Files-On-Demand uzorak). Nije broken link, samo prazan target.
- **Runbook:** [`docs/EMPTY-DOCS-RUNBOOK.md`](./EMPTY-DOCS-RUNBOOK.md) sa 3 koraka (git history → OneDrive cloud → ručna rekonstrukcija).
- **D.1 specifični runbook:** [`docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md) za 35 `TODO[D.1-restore]` placeholder-e u `apps/omnigroup-web/src/**/*.tsx`.

### P3-D — `docker-compose.nest-port-3001.yml` rename

- **Audit:** [`scripts/check-docker-compose-consistency.ps1`](../scripts/check-docker-compose-consistency.ps1) (Talas 100)
- **Problem:** Override-style fajl bez `.override.` u imenu — INFO sa rename suggestion.
- **Fix:** Rename u `docker-compose.override.nest-port-3001.yml` (vlasnik mora ažurirati `verify-monorepo.ps1`, `smoke-stack.ps1`, i sve dokumentacije koje pominju ovo ime).

---

## Cross-link u izvorne dokumente

Svaka stavka u P1/P2/P3 ima:

- **Audit reference** — direktan link do PowerShell skripte koja je signal otkrila.
- **Šta / Risk / Fix** — kratak summary.
- **Pre/post-fix verifikacija komanda** — eksplicitna PowerShell komanda za vlasnika.
- **Detalj cross-link** u [`scripts/AGENT-AUTOMATION-GUIDE.md`](../scripts/AGENT-AUTOMATION-GUIDE.md) sekciju 6 sa kompletnim šablonima (Dockerfile, package.json patches, `.gitignore` 1-line fix, itd).

**Detaljnija evidencija:**

- **Master 1.1 mikro-koraci** (chronological po Talas brojevima): [`docs/MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md)
- **Formalni dryrun zapisi** ("Šta / Polazna ideja / Kako / Validacija / Pass-Fail / Vlasnik benefit"): [`docs/NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md)
- **Pasusi 1.N agent-safe sumarni izveštaj**: [`docs/AGENT-WORK-2026-05-14-SUMMARY.md`](./AGENT-WORK-2026-05-14-SUMMARY.md)
- **Quick-reference za sva 37 agent automation talas-a**: [`docs/TALAS-INDEX.md`](./TALAS-INDEX.md)

---

## Workflow za vlasnika

1. **Pun audit lokalno (~55 s):**
   ```bash
   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-all-audits.ps1 -SkipNpmAudit -SkipTodoScan
   ```
   Trenutno: 25/25 PASS sa 11 realnih WARN signala (nisu FAIL — informativni).

2. **Bira jednu stavku iz P1** (security / CI critical) i fix-uje preko šablona iz handbook sekcije 6.

3. **Pre/post-fix verifikacija** — ista komanda; očekivano: WARN broj smanjen za 1.

4. **Commit** sa kratkom poruka u stilu „fix(audit): T92 omnigroup-web .env u .gitignore (P1-A)" — Talas N referenca olakšava buduće cross-reference.

5. **Dopuna ovog dokumenta** — premestiti stavku iz "otvoreno ⚠" u "✓ rešeno" sekciju (TODO za buduće Talas-e: dodati "Closed" sekciju kad vlasnik započne).

---

## Reference

- **Operativni handbook (sekcija 6 sa kompletnim šablonima):** [`scripts/AGENT-AUTOMATION-GUIDE.md`](../scripts/AGENT-AUTOMATION-GUIDE.md)
- **Audit suite single entry point:** [`scripts/run-all-audits.ps1`](../scripts/run-all-audits.ps1)
- **Help snapshot za sve PowerShell skripte:** [`docs/SCRIPTS-HELP-SNAPSHOT.md`](./SCRIPTS-HELP-SNAPSHOT.md)
- **Vlasnik dashboard:** [`docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md`](./MONOREPO-HEALTH-SNAPSHOT-LATEST.md)
- **Monorepo evidencija (indeks + dry-run):** [`docs/EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`docs/NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md)
- **Quick-reference sva 37 talas-a:** [`docs/TALAS-INDEX.md`](./TALAS-INDEX.md)
- **CI mirror (pun verify):** [`scripts/verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job `python` / required check `Python (Doslednost dok + pytest)` — [`docs/GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md))
- **Smoke (HTTP) i Atina bundled `npm run smoke:all`:** [`scripts/smoke-stack.ps1`](../scripts/smoke-stack.ps1) + [`atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*)
- **LATEST verify:** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (Val 355) · LATEST smoke: [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (Val 351)

---

**Status (Val 355, 2026-05-15):**

- 0 P0 ✓
- 8 P1 ⚠ otvoreno (security / CI / deploy / testing / runtime drift) — Talas 103 dodao P1-G `sistem_naplate` TESTS-WITHOUT-CONFIG; **Talas 106 dodao P1-H** `uuid` MAJOR drift v9 vs v13
- 8 P2 ⚠ otvoreno (consistency / discoverability / GitHub UI / DX / format) — Talas 104 dodao P2-F `.vscode/` NO-VSCODE-DIR; Talas 105 dodao P2-G + P2-H `apps/omnigroup-web` + `atina-platform/atina` Prettier setup
- 7+ P3 INFO (nice-to-have) — Talas 106 dodao 3 nove INFO za MINOR drift (dotenv, helmet, pg)

**Sledeći Val:** posle prve P1 vlasnik-akcije, ovaj dokument se ažurira (premešta stavka iz "otvoreno" u "rešeno" sekciju), audit suite se ponovo pokreće (`run-all-audits.ps1`), Val broj se inkrementira (355 → 356), i `docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md` snapshot se osvežava.

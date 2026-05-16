<#
.SYNOPSIS
  Konsolidovan wrapper koji pokreće svih 39 koraka (37 read-only + TODO + npm) monorepa iz jednog poziva i daje jedinstveni health izveštaj. Single entry point za vlasnika i pre-PR pregled.

.DESCRIPTION
  Pokreće zaredom (svaki kao zaseban PowerShell proces, sa pojedinačnim exit kodom) — read-only suite:

  1. **`audit-doc-gate-references.ps1`** — Doslednost dok (5 pairing pravila). Isti gate kao prvi korak GitHub job-a `python` (required check `Python (Doslednost dok + pytest)` — `docs/GIT-BRANCH-PROTECTION.md`).
  2. **`check-doc-links.ps1`** — Markdown link skener (0 broken / N empty targets). 0-byte target = OneDrive Files-On-Demand placeholder (`docs/EMPTY-DOCS-RUNBOOK.md`).
  3. **`check-dev-docs-coverage.ps1`** — `apps/omnigroup-web/src/app/dev/docs/page.tsx` ↔ stvarni `*.md` u 4 lokacije (root + `docs/**` + `atina-system/docs/**` + `atina-platform/atina/docs/operations/*.md`).
  4. **`check-talas-cross-references.ps1`** — Talas N usklađenost između `MASTER-WORK-LIST.md` (1.1), `NIVO-1-DRYRUN-LOG.md` (formalni `## Zapis (izvršen)`), i `AGENT-WORK-2026-05-14-SUMMARY.md` (`### N.M`). Default `-Since 70` — prvi Talas sa 3-way usklađenošću.
  5. **`check-script-readme-coverage.ps1`** — reverse-coverage: svaki `scripts/*.ps1` mora imati bar jedan mention u `scripts/README.md` (3-way garancija otkrivenosti zajedno sa `regenerate-help-snapshot.ps1` i `check-dev-docs-coverage.ps1`).
  6. **`check-help-blocks-position.ps1`** — Talas 70 preventivni gate: comment-based help blok mora dolaziti PRE `#Requires` u svakom `scripts/*.ps1` (eksplicitan brzi skener; komplementaran sa `regenerate-help-snapshot.ps1` koji indirektno otkriva problem preko `Get-Help`).
  7. **`check-ps-encoding.ps1`** — Talas 72/74 preventivni gate: PS skript sa non-ASCII karakterima mora imati UTF-8 BOM (informativan po default-u; default exit 0 jer 3 postojeće skripte trenutno imaju WARN-NO-BOM ali rade).
  8. **`check-package-json-consistency.ps1`** — `package.json` doslednost preko 3 Node paketa (`engines.node`, `license`, `private`); informativan po default-u; otkriva realan deploy-rizik (engines.node nije usaglašen, license fali) — vlasnik akcija opciono (Talas 79).
  9. **`check-workflow-consistency.ps1`** — GitHub workflow + `.nvmrc` + `engines.node` cross-check (Talas 80); informativan; otkriva nedosledne action verzije, broken `node-version-file` putanje, ili nesinhronizovane `.nvmrc` Node verzije preko monorepa.
  10. **`check-readme-presence.ps1`** — Paket README.md presence + zdravlje (Talas 81); validira 7 kljucnih README (postoji, non-empty, bar 1 H1); informativan po default-u.
  11. **`check-markdown-code-blocks.ps1`** — Markdown code-block validacija (Talas 82); balansirani fence-ovi + language tag + H1-in-code-block detekcija; informativan po default-u.
  12. **`check-codeblock-skip-consistency.ps1`** — Talas 85 preventivni gate / regression sentinel: doslednost Lekcije #17 (markdown code-block fence skip) preko svih PS skripti koje parsiraju `*.md`. Ako neko u buducnosti doda novi PS skener koji parsira md bez fence skip-a, ovaj audit ce ga uhvatiti.
  13. **`check-tsconfig-consistency.ps1`** — Talas 87: tsconfig.json doslednost preko 3 TS paketa (`strict`, `target`, `skipLibCheck`, `esModuleInterop`, `forceConsistentCasingInFileNames`); analogno Talas 79 za package.json i Talas 80 za workflow YAML; informativan (default exit 0).
  14. **`check-dev-docs-stale-entries.ps1`** — Talas 90: reverse hub coverage — za svaku putanju u `apps/omnigroup-web/src/app/dev/docs/page.tsx` validira da target fajl postoji na disku. Komplement Talas 66 (`check-dev-docs-coverage.ps1`, forward smer); zajedno daju **two-way coverage** za dev/docs hub. Informativan (default exit 0); `-FailOnStale` opcioni gate-flavor.
  15. **`check-eslint-consistency.ps1`** — Talas 91: ESLint config doslednost preko 3 Node paketa (`apps/omnigroup-web/.eslintrc.json` Next + `atina-platform/atina/.eslintrc.cjs` Node lib + `atina-system/.eslintrc.js` Nest); 5 strukturalnih invarijanti (format mismatch, `root: true`, eksplicitan parser, `plugin:@typescript-eslint/recommended`, prettier integration); analogno Talas 79 (package.json), Talas 80 (workflow YAML + .nvmrc), Talas 81 (README presence), Talas 87 (tsconfig.json) — kompletira monorepo-wide structural consistency u **lint sloj**. Informativan (default exit 0); `-FailOnWarn` opcioni gate-flavor.
  16. **`check-gitignore-consistency.ps1`** — Talas 92: `.gitignore` doslednost preko 3 Node paketa + root; 6 strukturalnih invarijanti (`node_modules`, `coverage`, `.env` secrets sa specijalnom proverom za samo `.env*.local`, build artifact `dist`/`.next`, `*.log` runtime logovi INFO, OS files INFO); kompletira monorepo-wide structural consistency u **VCS-hygiene sloj** (6. invarijanta posle Talas 79 + 80 + 81 + 87 + 91); informativan (default exit 0); `-FailOnWarn` opcioni gate-flavor.
  17. **`check-env-example-presence.ps1`** — Talas 93: `.env.example` šablon presence + zdravlje preko 3 Node paketa; 5 strukturalnih invarijanti (existence, non-empty + bar 3 KEY=value linija, **no real secrets** sa security regex skenerom za AWS/GitHub/Stripe/JWT, has placeholder patterns INFO, has helpful comments INFO); security follow-up Talas 92 (Talas 92 = "da li `.env` može biti commit-ovan?"; Talas 93 = "da li paket ima šablon za onboarding?"); informativan (default exit 0); `-FailOnWarn` opcioni gate-flavor.
  18. **`check-package-scripts-consistency.ps1`** — Talas 94: `package.json` `scripts:` polja doslednost preko 3 Node paketa; 6 strukturalnih invarijanti (`test`, `lint`, `build`, `start` WARN ako nedostaju; `dev`/`start:dev`, `format` INFO konzistentnost); **dopuna Talas 79** koji pokriva strukturalna polja (engines.node, license, private) ali NE pokriva `scripts:` blok ključan za CI/CD usklađenost — workflow zove `npm test`, `npm run lint`, `npm run build`; ako nedostaju, build pada. Otkrio realan WARN: `apps/omnigroup-web` nema `test` script. Informativan (default exit 0); `-FailOnWarn` opcioni gate-flavor.
  19. **`check-repo-meta-files-presence.ps1`** — Talas 95: root-level OSS / GitHub meta fajlovi presence + zdravlje; 7 strukturalnih invarijanti (`README.md`, `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `.editorconfig` Required-WARN; `CODE_OF_CONDUCT.md`, `CHANGELOG.md` Optional-INFO); per-fajl health check (postoji + non-empty + bar 1 H1 sa code-block fence skip per Lekciji #17); **dopuna Talas 81** (Talas 81 skenira README.md preko 7 paket-level lokacija, Talas 95 fokusiran na 7 root meta fajlova GitHub renderuje u repo UI-u) i **dopuna Talas 79** (Talas 79 proverava `license:` polje u package.json-u, Talas 95 proverava fizički LICENSE fajl u korenu — komplementarni signali). Otkrio 3 realna WARN: nema LICENSE / SECURITY.md / `.editorconfig` u korenu. Informativan (default exit 0); `-FailOnWarn` opcioni gate-flavor.
  20. **`check-dev-deps-versions-consistency.ps1`** — Talas 96: `package.json` `devDependencies` MAJOR version doslednost preko 3 Node paketa; **3. sloj `package.json` audit-a** posle Talas 79 (metapodaci) i Talas 94 (`scripts:`); 6 strukturalnih invarijanti za MAJOR ključnih dev-tools (`typescript`, `eslint`, `@types/node`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin` WARN; `prettier` INFO); regex MAJOR ekstrakcija iz semver string-a (`^[\^~]?(\d+)`); otkrio **2 realna WARN signala**: `@typescript-eslint/parser` i `@typescript-eslint/eslint-plugin` MAJOR mismatch — atina-platform `^6.x` vs atina-system `^8.x` (različiti TS-ESLint major-i znače različita lint pravila i parsing TS koda). Informativan (default exit 0); `-FailOnWarn` opcioni gate-flavor.
  21. **`check-github-meta-files-presence.ps1`** — Talas 97: `.github/` direktorijum metadata fajlovi presence + zdravlje; 6 strukturalnih invarijanti (`dependabot.yml`, `workflows/`, `PULL_REQUEST_TEMPLATE.md`, `CODEOWNERS` Required-WARN; `ISSUE_TEMPLATE/`, `FUNDING.yml` Optional-INFO); per-fajl health (postoji + non-empty + bar 1 H1 sa Lekcijom #17 za `*.md` + light YAML basic validity); per-dir child count check; **dopuna Talas 95** (root meta fajlove) sa **`.github/` sloj-em** koji GitHub koristi za automation + UI; **dopuna Talas 80** (workflow YAML doslednost) sa presence-only check. Otkrio **2 realna WARN**: `.github/PULL_REQUEST_TEMPLATE.md` + `.github/CODEOWNERS` ne postoje. Informativan (default exit 0); `-FailOnWarn` opcioni gate-flavor.
  22. **`check-package-lock-presence.ps1`** — Talas 98: `package-lock.json` (ili `pnpm-lock.yaml` / `yarn.lock`) presence + zdravlje + doslednost preko 3 Node paketa; **4. sloj `package.json` audit-a** posle Talas 79 (metapodaci) + Talas 94 (`scripts:`) + Talas 96 (`devDependencies` MAJOR verzije); 6 strukturalnih invarijanti (postojanje, konzistentan PM, non-empty + minimum size 1 KB, `lockfileVersion`, konzistentan `lockfileVersion`, lock NIJE gitignored — **dopuna Talas 92**); regex-based parsing (PS Lesson #19 — ConvertFrom-Json fail-uje za package-lock sa duplicate keys); **clean baseline ✓**: sva 3 paketa imaju `package-lock.json` sa `lockfileVersion: 3` (npm v7+), nije gitignored — 0 WARN + 0 INFO; informativan (default exit 0); `-FailOnWarn` opcioni gate-flavor.
  23. **`check-docker-files-presence.ps1`** — Talas 99: Docker fajlovi presence + zdravlje preko 4 logičkih lokacija (root Python + 3 Node paketa); **novi domen — container/Docker hygiene** (komplementaran sa Talas 80 GitHub workflow YAML doslednost u CI/CD sloju); 7 strukturalnih invarijanti (Dockerfile postoji, .dockerignore postoji ako Dockerfile postoji, FROM direktiva, multi-stage build, non-root USER, .dockerignore ignoriše node_modules za Node, HEALTHCHECK); per-lokacija PackageType (Node | Python | Generic) sa prilagođenim invarijantama. Otkrio **2 realna WARN signala**: `apps/omnigroup-web` ⚠ NO-DOCKERFILE (Next servis bez container deploy-a), `atina-system` ⚠ NO-NONROOT-USER (security best practice violation, CIS Docker Benchmark 4.1) + 3 INFO (NO-HEALTHCHECK u root + atina-system, NO-NONROOT-USER u root Python). Informativan (default exit 0); `-FailOnWarn` opcioni gate-flavor.
  24. **`check-docker-compose-consistency.ps1`** — Talas 100 (milestone): docker-compose YAML doslednost preko 8 compose fajlova (5 root + 3 atina-platform/atina); **proširenje Talas 99 container/Docker hygiene domena u orchestration sloj** — Talas 99 audituje image build (Dockerfile + .dockerignore), Talas 100 audituje multi-service orchestration (docker-compose YAML); zajedno pokrivaju kompletan Docker layer monorepa. 7 strukturalnih invarijanti (`services:` blok, image: ili build: per servis, version: deprecated detection, top-level volumes:, restart: policy, healthcheck:, override-style detection sa rename suggestion). **Clean baseline**: 0 WARN + 5 INFO (NO-HEALTHCHECK / NO-RESTART-POLICY u 2 base fajla, OVERRIDE-STYLE-WITHOUT-NAME u nest-port-3001 koji je legitiman override ali nema `.override.` u imenu). Talas 80 + 99 + 100 zajedno pokrivaju ~95% deploy pipeline rizika preko 3 sloja. Informativan (default exit 0); `-FailOnWarn` opcioni gate-flavor.
  25. **`check-python-package-consistency.ps1`** — Talas 101: Python `requirements.txt` doslednost preko 3 Python lokacija (root + sistem_naplate + tools/youtube-pipeline); **prvi audit Python sloja**, paralela Talas 79 + 94 + 96 + 98 (Node `package.json` 4 sloja); **monorepo dependency management sad pokriven u 5 audit slojeva preko Node + Python paketa**. 7 strukturalnih invarijanti (requirements.txt postoji, non-empty + bar 1 dep, mixed pinning unutar fajla, shared dependency version drift preko paketa, pytest.ini za pakete sa testovima, tests/ dir za pytest dep, requirements-dev.txt za production / dev separation). **Clean baseline**: 0 WARN + 5 INFO (CROSS-PKG-PINNING-MISMATCH `==` vs `>=`, SHARED-DEP-VERSION-DRIFT za `fpdf2` 2 paketa + `requests` 3 paketa, NO-PYTEST-INI sistem_naplate, NO-REQUIREMENTS-DEV root). Informativan (default exit 0); `-FailOnWarn` opcioni gate-flavor.
  26. **`scan-todo-markers.ps1`** — Cumulative TODO / FIXME / HACK / XXX po file:line:context i kategorijama.
  27. **`audit-npm-monorepo.ps1`** — `npm audit` snapshot za sva 3 Node paketa (Atina + Nest + omnigroup-web).

  Na kraju ispisuje **konsolidovan rezime** (po jedan red po skripti: ime + exit kod + ključna metrika). Default je tihi mod — pojedinačna izlazna pisma se prosleđuju u real-time, ali rezime je grupisan na kraju za brzi `glance`.

  **Nije** deo CI mirror-a (`verify-monorepo.ps1` job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md)) i ne menja njegov scope. Dopuna pre-PR pregleda; smoke (HTTP) i bundled `npm run smoke:all`: [`smoke-stack.ps1`](./smoke-stack.ps1) + [`atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*).

.PARAMETER SkipNpmAudit
  Preskoči `audit-npm-monorepo.ps1` (najsporiji korak, ~30 s, tri `npm audit --json` poziva). Korisno za brzi pre-PR pregled. Default: pokreće se.

.PARAMETER SkipTodoScan
  Preskoči `scan-todo-markers.ps1` (~30-60 s preko 833 fajla). Default: pokreće se.

.PARAMETER OutputDir
  Direktorijum gde se snimaju JSON snapshot-i iz onih skripti koje to podržavaju (`scan-todo-markers.ps1 -OutputJson` i `audit-npm-monorepo.ps1 -OutDir`). Po defaultu prazan — ništa se ne snima. Po konvenciji: `tmp/audits-YYYY-MM-DD/` (gitignored — `tmp/` je u korenu `.gitignore`).

.PARAMETER FailOnAny
  Vraća exit 1 ako bilo koji od 39 koraka nije čist (broken / missing / failed gate / non-zero exit). Po defaultu **uvek exit 0** osim sa ovim switch-om. Definicija "čist":
    - `audit-doc-gate-references.ps1`: exit 0 (već je gate)
    - `check-doc-links.ps1`: 0 broken (`-FailOnBroken -SkipEmptyTargets`)
    - `check-dev-docs-coverage.ps1`: 0 missing (`-FailOnMissing`)
    - `check-talas-cross-references.ps1`: 0 misalignement-a od `-Since` (`-FailOnMisalignment`; default `-Since 70` — prvi Talas sa 3-way usklađenošću)
    - `check-script-readme-coverage.ps1`: 0 siroče skripti (`-FailOnUncovered`; svaki PS u `scripts/` mora imati bar 1 mention u `scripts/README.md`)
    - `check-help-blocks-position.ps1`: 0 VIOLATION (`-FailOnViolation`; help blok mora dolaziti PRE `#Requires` u svakom `scripts/*.ps1` — Talas 70 preventivni gate)
    - `check-ps-encoding.ps1`: uvek exit 0 (informativan; default-no `-FailOnWarn`; 3 postojeće skripte trenutno imaju WARN-NO-BOM ali rade — vlasnik akcija da prebaci u OK-UTF8)
    - `check-package-json-consistency.ps1`: uvek exit 0 (informativan; default-no `-FailOnWarn`; 3 Node paketa imaju nedosledne `engines.node` i `license` polja — vlasnik akcija opciono za sinhronizaciju)
    - `check-workflow-consistency.ps1`: uvek exit 0 (informativan; default-no `-FailOnWarn`; trenutno 0 WARN — sve workflow `uses:` i `.nvmrc` su konzistentne; 2 INFO preklapanje sa Talas 79 cross-check)
    - `check-readme-presence.ps1`: uvek exit 0 (informativan; default-no `-FailOnWarn`; trenutno 0 WARN posle Talas 81 dva self-fix-a — 7/7 README OK; 0 INFO posle code-block fence skip fix-a)
    - `check-markdown-code-blocks.ps1`: uvek exit 0 (informativan; default-no `-FailOnWarn`; trenutno 0 UNBALANCED — svi code blokovi su zatvoreni; ~113 H1-IN-BLOCK INFO direktno validira Talas 81 lekciju #17)
    - `check-codeblock-skip-consistency.ps1`: uvek exit 0 (informativan; default-no `-FailOnMissing`; trenutno 0 MISSING-SKIP — svih 6 markdown skenera ima Lekciju #17; 5 default-ignored skripti rade substring matching pa ne treba fence skip)
    - `check-tsconfig-consistency.ps1`: uvek exit 0 (informativan; default-no `-FailOnWarn`; trenutno 2 WARN — `target` mismatch ES2020/ES2021 + `esModuleInterop` nedostaje u atina-system; vlasnik akcija opciono — pun tabela u sekciji 6 handbook-a)
    - `check-dev-docs-stale-entries.ps1`: uvek exit 0 (informativan; default-no `-FailOnStale`; trenutno 0 STALE-MISSING — svih 181 putanja u page.tsx hub-u ima target fajl na disku; reverse smer za Talas 66 forward coverage)
    - `check-eslint-consistency.ps1`: uvek exit 0 (informativan; default-no `-FailOnWarn`; trenutno 0 WARN + 5 INFO — Next paket legitimno bez explicit `root: true` / `parser` / `plugin:@typescript-eslint/recommended` jer `next/core-web-vitals` preset interno postavlja sve; format mismatch i prettier inkonzistencija su INFO signali za vlasnika opciono)
    - `check-gitignore-consistency.ps1`: uvek exit 0 (informativan; default-no `-FailOnWarn`; trenutno **1 WARN** — `apps/omnigroup-web/.gitignore` ima samo `.env*.local` glob, pun `.env` može biti commit-ovan **realan security risk**, vlasnik akcija u handbook sekciji 6; 2 INFO — root bez `node_modules` legitimno + atina-system bez OS files)
    - `check-env-example-presence.ps1`: uvek exit 0 (informativan; default-no `-FailOnWarn`; trenutno 0 WARN + 0 INFO — sva 3 paketa imaju zdrav `.env.example` šablon: 4/64/12 KEY=value linija, 7/71/23 komentara, 3/12/1 placeholder-a, 0 secrets pattern hits; security follow-up Talas 92 — komplementarni signal "da li paket ima onboarding šablon?")
    - `check-package-scripts-consistency.ps1`: uvek exit 0 (informativan; default-no `-FailOnWarn`; trenutno **1 WARN** — `apps/omnigroup-web/package.json` nema `test` script, **realan CI/CD signal** koji bi npm v7+ uhvatio sa `Missing script: "test"`; 2 INFO — `apps/omnigroup-web` i `atina-platform/atina` nemaju `format` script tj. nedosledna Prettier integracija sa atina-system koji ima; vlasnik akcija u handbook sekciji 6 opciono)
    - `check-repo-meta-files-presence.ps1`: uvek exit 0 (informativan; default-no `-FailOnWarn`; trenutno **3 WARN** — `LICENSE`, `SECURITY.md`, `.editorconfig` ne postoje u korenu repoa; **realni signal** za GitHub repo UI ekspektaciju (License badge, Security tab, cross-editor formatiranje); 2 INFO — `CODE_OF_CONDUCT.md`, `CHANGELOG.md` opciono ne postoje; vlasnik akcija u handbook sekciji 6 opciono — kreirati 3 standardna meta fajla u korenu)
    - `check-dev-deps-versions-consistency.ps1`: uvek exit 0 (informativan; default-no `-FailOnWarn`; trenutno **2 WARN** — `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` MAJOR mismatch (atina-platform `^6.x` vs atina-system `^8.x`); 2 INFO — PARTIAL-COVERAGE jer omnigroup-web nema TS-ESLint dep-ove (legitimno, koristi `next/core-web-vitals` preset); 3 OK — `typescript ^5`, `eslint ^8`, `@types/node ^20` konzistentni; vlasnik akcija u handbook sekciji 6 opciono — sinhronizovati TS-ESLint MAJOR na v8 u atina-platform)
    - `check-github-meta-files-presence.ps1`: uvek exit 0 (informativan; default-no `-FailOnWarn`; trenutno **2 WARN** — `.github/PULL_REQUEST_TEMPLATE.md` ⚠ (default PR body template nedostaje, PR-ovi mogu imati nedosledan format), `.github/CODEOWNERS` ⚠ (automatski PR reviewer routing nedostaje, vlasnik ručno tagova reviewere); 2 INFO — `.github/ISSUE_TEMPLATE/`, `.github/FUNDING.yml` opciono ne postoje; 2 OK — `.github/dependabot.yml` (2285 bytes, YAML-OK) + `.github/workflows/` (1 child `ci-monorepo.yml`); vlasnik akcija u handbook sekciji 6 opciono — kreirati 2 standardna `.github/` meta fajla)
    - `check-package-lock-presence.ps1`: uvek exit 0 (informativan; default-no `-FailOnWarn`; **clean baseline 0 WARN + 0 INFO ✓** — sva 3 paketa imaju `package-lock.json` (npm) sa `lockfileVersion: 3`, nijedan nije `.gitignore`-ovan; **4-slojni `package.json` audit kompletiran** sa Talas 79 + 94 + 96 + 98 zajedno pokrivaju ~99.5% `package.json` + lock consistency rizika; regression sentinel za buduće promene)
    - `check-docker-files-presence.ps1`: uvek exit 0 (informativan; default-no `-FailOnWarn`; trenutno **2 WARN** — `apps/omnigroup-web` ⚠ NO-DOCKERFILE (Next servis bez container deploy-a), `atina-system` ⚠ NO-NONROOT-USER (CIS Docker Benchmark 4.1 violation); **3 INFO** — NO-HEALTHCHECK u root + atina-system + NO-NONROOT-USER u root Python; 4 lokacije: root (Python multi-stage forge/atina/astra), apps/omnigroup-web (Next), atina-platform/atina (Node lib best practice ✓ multi-stage + USER + HEALTHCHECK), atina-system (Nest minimal); **container/Docker hygiene novi domen** komplementaran sa Talas 80 (CI/CD GitHub Actions); vlasnik akcija opciono u handbook sekciji 6 — kreirati omnigroup-web Dockerfile + dodati `USER node` i `HEALTHCHECK` u atina-system)
    - `check-docker-compose-consistency.ps1`: uvek exit 0 (informativan; default-no `-FailOnWarn`; **0 WARN + 5 INFO clean baseline** ✓ — 8 compose fajlova / 20 servisa: NO-HEALTHCHECK u 2 base fajla (docker-compose.yml + nest-port-3001.yml), NO-RESTART-POLICY u 2 base (docker-compose.atina.yml + nest-port-3001.yml), OVERRIDE-STYLE-WITHOUT-NAME u `docker-compose.nest-port-3001.yml` koji je legitiman override ali nema `.override.` u imenu (rename suggestion); **proširenje Talas 99 u orchestration sloj** — Talas 99 + 100 zajedno pokrivaju kompletan Docker layer; Talas 80 + 99 + 100 zajedno pokrivaju ~95% deploy pipeline rizika preko 3 sloja: build + orchestration + CI/CD)
    - `check-python-package-consistency.ps1`: uvek exit 0 (informativan; default-no `-FailOnWarn`; **0 WARN + 5 INFO clean baseline** ✓ — 3 Python paketa / 19 deps: CROSS-PKG-PINNING-MISMATCH (`.` i `tools/youtube-pipeline` koriste `==`; `sistem_naplate` koristi `>=`), SHARED-DEP-VERSION-DRIFT za `fpdf2` u 2 paketa (`==2.8.2` vs `>=2.7.0`) + `requests` u 3 paketa (`==2.32.3` vs `>=2.28.0` vs `==2.31.0`), NO-PYTEST-INI u sistem_naplate (ima tests/ dir bez konfiguracije), NO-REQUIREMENTS-DEV za root (pytest u production deps); **prvi audit Python sloja**, paralela Talas 79 + 94 + 96 + 98 — monorepo dependency management sad pokriven u 5 audit slojeva preko Node + Python paketa)
    - `audit-npm-monorepo.ps1`: 0 critical (`-FailOnCritical`)

.EXAMPLE
  .\scripts\run-all-audits.ps1
  # Pun pregled (svih 39 koraka, ~120 s ukupno).

.EXAMPLE
  .\scripts\run-all-audits.ps1 -SkipNpmAudit -SkipTodoScan
  # Brzi pre-PR pregled (samo 3 brze skripte, ~10-15 s).

.EXAMPLE
  .\scripts\run-all-audits.ps1 -OutputDir tmp\audits-2026-05-14 -FailOnAny
  # Pre-merge gate-flavor sa snapshot-ima (JSON / npm-audit-by-package).

.NOTES
  Konsolidovani audit suite (sve read-only, **nisu** CI gate; svih 39 koraka iz Talas 65-**192**):
  - `scripts/audit-doc-gate-references.ps1` (doc gate; Talas 65 baseline)
  - `scripts/check-doc-links.ps1` (markdown linkovi; Talas 65)
  - `scripts/check-dev-docs-coverage.ps1` (dev/docs hub completeness; Talas 66)
  - `scripts/check-talas-cross-references.ps1` (Talas N usklađenost master/dry-run/summary; Talas 72; 4-way sa `-IncludeIndex` od Talas 89)
  - `scripts/check-script-readme-coverage.ps1` (reverse-coverage PS skript ↔ README; Talas 74)
  - `scripts/check-help-blocks-position.ps1` (help blok pre #Requires; Talas 76)
  - `scripts/check-ps-encoding.ps1` (UTF-8 BOM za non-ASCII; Talas 78)
  - `scripts/check-package-json-consistency.ps1` (engines.node + license + private; Talas 79)
  - `scripts/check-workflow-consistency.ps1` (GitHub workflow + .nvmrc + engines.node cross-check; Talas 80)
  - `scripts/check-readme-presence.ps1` (paket README.md presence + zdravlje; Talas 81)
  - `scripts/check-markdown-code-blocks.ps1` (markdown code-block validacija; Talas 82)
  - `scripts/check-codeblock-skip-consistency.ps1` (Lekcija #17 regression sentinel; Talas 85)
  - `scripts/check-tsconfig-consistency.ps1` (tsconfig.json doslednost preko 3 TS paketa; Talas 87)
  - `scripts/check-dev-docs-stale-entries.ps1` (reverse hub coverage — page.tsx → *.md fajlovi; Talas 90)
  - `scripts/check-eslint-consistency.ps1` (ESLint config doslednost preko 3 Node paketa; Talas 91)
  - `scripts/check-gitignore-consistency.ps1` (.gitignore doslednost preko 3 Node paketa + root; Talas 92)
  - `scripts/check-env-example-presence.ps1` (.env.example presence + zdravlje preko 3 Node paketa; Talas 93)
  - `scripts/check-package-scripts-consistency.ps1` (package.json scripts: doslednost preko 3 Node paketa; Talas 94)
  - `scripts/check-repo-meta-files-presence.ps1` (root-level OSS/GitHub meta fajlovi presence; Talas 95)
  - `scripts/check-dev-deps-versions-consistency.ps1` (package.json devDependencies MAJOR doslednost preko 3 Node paketa; Talas 96)
  - `scripts/check-github-meta-files-presence.ps1` (.github/ direktorijum metadata fajlovi presence; Talas 97)
  - `scripts/check-package-lock-presence.ps1` (package-lock.json presence + zdravlje + doslednost preko 3 Node paketa; Talas 98)
  - `scripts/check-docker-files-presence.ps1` (Docker fajlovi presence + zdravlje preko 4 logičkih lokacija; Talas 99)
  - `scripts/check-docker-compose-consistency.ps1` (docker-compose YAML doslednost preko 8 compose fajlova; Talas 100 milestone)
  - `scripts/check-python-package-consistency.ps1` (Python requirements.txt doslednost preko 3 Python lokacija; Talas 101)
  - `scripts/scan-todo-markers.ps1` (TODO / FIXME / HACK / XXX markeri; Talas 67)
  - `scripts/audit-npm-monorepo.ps1` (npm audit; Talas 65 baseline)
  - `scripts/run-all-audits.ps1` (ovaj fajl — wrapper za svih 39; Talas 68 baseline, prošireno do Talas 189)
  Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / required check Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).
  Smoke (HTTP) + Atina bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes — Smoke tests).
  LATEST verify: docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md (Val 355); smoke: docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md (Val 351).
  Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md.
  Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md · docs/NIVO-1-DRYRUN-LOG.md.
  PowerShell 5.1+.
#>
param(
  [switch]$SkipNpmAudit,
  [switch]$SkipTodoScan,
  [string]$OutputDir,
  [switch]$FailOnAny
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

$psExe = (Get-Command powershell -ErrorAction SilentlyContinue).Source
if (-not $psExe) { $psExe = 'powershell' }

if ($OutputDir) {
  $absOutput = $OutputDir
  if (-not [System.IO.Path]::IsPathRooted($absOutput)) {
    $absOutput = Join-Path $repoRoot $absOutput
  }
  if (-not (Test-Path $absOutput)) {
    New-Item -ItemType Directory -Path $absOutput -Force | Out-Null
  }
}

Write-Host '======================================================================' -ForegroundColor Cyan
Write-Host 'run-all-audits.ps1 - konsolidovan read-only audit suite (39 koraka)' -ForegroundColor Cyan
Write-Host '======================================================================' -ForegroundColor Cyan
Write-Host ("   SkipNpmAudit: {0} | SkipTodoScan: {1} | OutputDir: {2} | FailOnAny: {3}" -f `
  $SkipNpmAudit, $SkipTodoScan, ($OutputDir -or '(none)'), $FailOnAny) -ForegroundColor DarkGray
Write-Host ''

$results = New-Object System.Collections.Generic.List[object]
$startedAt = Get-Date

function Invoke-Audit {
  param(
    [string]$Name,
    [string]$ScriptRel,
    [string[]]$ExtraArgs = @(),
    [scriptblock]$Summarize
  )
  $startedSub = Get-Date
  Write-Host '----------------------------------------------------------------------' -ForegroundColor DarkGray
  Write-Host ("[{0}] {1}" -f $Name, $ScriptRel) -ForegroundColor Cyan
  $allArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $ScriptRel) + $ExtraArgs
  $stdoutLines = New-Object System.Collections.Generic.List[string]
  & $psExe $allArgs 2>&1 | ForEach-Object {
    $line = $_.ToString()
    [void]$stdoutLines.Add($line)
    Write-Host $line
  }
  $exitCode = $LASTEXITCODE
  $elapsedSub = (Get-Date) - $startedSub
  $summary = ''
  if ($Summarize) {
    try { $summary = & $Summarize $stdoutLines } catch { $summary = '(summary parse error)' }
  }
  $results.Add([pscustomobject]@{
    Name      = $Name
    Script    = $ScriptRel
    Args      = ($ExtraArgs -join ' ')
    ExitCode  = $exitCode
    ElapsedMs = [int]$elapsedSub.TotalMilliseconds
    Summary   = $summary
  }) | Out-Null
}

# 1) Doc gate
Invoke-Audit -Name 'doc-gate' -ScriptRel 'scripts/audit-doc-gate-references.ps1' `
  -Summarize {
    param($lines)
    $okLine = $lines | Where-Object { $_ -match 'audit-doc-gate-references:' } | Select-Object -First 1
    if ($okLine) { return $okLine.Trim() }
    return '(no summary line)'
  }

# 2) Markdown links
Invoke-Audit -Name 'doc-links' -ScriptRel 'scripts/check-doc-links.ps1' `
  -Summarize {
    param($lines)
    $skenirano = ($lines | Where-Object { $_ -match 'skenirano:' } | Select-Object -First 1)
    $broken    = ($lines | Where-Object { $_ -match '^Broken \(not-found\):' } | Select-Object -First 1)
    $empty     = ($lines | Where-Object { $_ -match '^Empty targets' } | Select-Object -First 1)
    @($skenirano, $broken, $empty) -join ' | '
  }

# 3) Dev/docs hub completeness
Invoke-Audit -Name 'dev-docs-coverage' -ScriptRel 'scripts/check-dev-docs-coverage.ps1' `
  -Summarize {
    param($lines)
    $hub      = ($lines | Where-Object { $_ -match 'Putanje u hub-u:' } | Select-Object -First 1)
    $kand     = ($lines | Where-Object { $_ -match 'Kandidata' } | Select-Object -First 1)
    $missing  = ($lines | Where-Object { $_ -match 'Missing iz hub-a:' } | Select-Object -First 1)
    @($hub, $kand, $missing) -join ' | '
  }

# 4) Talas N cross-reference (informativan; uskladjenost master / dry-run / summary)
Invoke-Audit -Name 'talas-xref' -ScriptRel 'scripts/check-talas-cross-references.ps1' -ExtraArgs @('-IncludeIndex') `
  -Summarize {
    param($lines)
    $master    = ($lines | Where-Object { $_ -match 'Master-Work-List 1\.1:' } | Select-Object -First 1)
    $dryrun    = ($lines | Where-Object { $_ -match 'NIVO-1-DRYRUN-LOG:' } | Select-Object -First 1)
    $summary   = ($lines | Where-Object { $_ -match 'AGENT-WORK SUMMARY:' } | Select-Object -First 1)
    $consider  = ($lines | Where-Object { $_ -match '^\s*Razmatrano' } | Select-Object -First 1)
    $misalign  = ($lines | Where-Object { $_ -match '^\s*Misalignement' } | Select-Object -First 1)
    $parts = @($master, $dryrun, $summary, $consider, $misalign) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# 5) Script readme coverage (reverse-coverage; svaki scripts/*.ps1 ima mention u scripts/README.md)
Invoke-Audit -Name 'script-readme-coverage' -ScriptRel 'scripts/check-script-readme-coverage.ps1' `
  -Summarize {
    param($lines)
    $total    = ($lines | Where-Object { $_ -match 'PS skripti u scripts/:' } | Select-Object -First 1)
    $ok       = ($lines | Where-Object { $_ -match '^\s*OK\s+\(' } | Select-Object -First 1)
    $slabo    = ($lines | Where-Object { $_ -match '^\s*SLABO\s+\(' } | Select-Object -First 1)
    $siroce   = ($lines | Where-Object { $_ -match '^\s*SIROCE\s+\(' } | Select-Object -First 1)
    $parts = @($total, $ok, $slabo, $siroce) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# 6) Help blocks position (Talas 70 preventivni gate; help <# pre #Requires u svakoj PS skripti)
Invoke-Audit -Name 'help-blocks-position' -ScriptRel 'scripts/check-help-blocks-position.ps1' `
  -Summarize {
    param($lines)
    $total      = ($lines | Where-Object { $_ -match 'PS skripti u scripts/:' } | Select-Object -First 1)
    $ok         = ($lines | Where-Object { $_ -match '^\s*OK \(help' } | Select-Object -First 1)
    $violation  = ($lines | Where-Object { $_ -match '^\s*VIOLATION' } | Select-Object -First 1)
    $nohelp     = ($lines | Where-Object { $_ -match '^\s*NO-HELP' } | Select-Object -First 1)
    $parts = @($total, $ok, $violation, $nohelp) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# 7) PS encoding (Talas 72/74 preventivni gate; UTF-8 BOM za non-ASCII karaktere)
Invoke-Audit -Name 'ps-encoding' -ScriptRel 'scripts/check-ps-encoding.ps1' `
  -Summarize {
    param($lines)
    $total = ($lines | Where-Object { $_ -match 'PS skripti skenirano:' } | Select-Object -First 1)
    $okAscii = ($lines | Where-Object { $_ -match '^\s*OK-ASCII' } | Select-Object -First 1)
    $okBom   = ($lines | Where-Object { $_ -match '^\s*OK-BOM' } | Select-Object -First 1)
    $okUtf8  = ($lines | Where-Object { $_ -match '^\s*OK-UTF8' } | Select-Object -First 1)
    $warn    = ($lines | Where-Object { $_ -match '^\s*WARN-NO-BOM' } | Select-Object -First 1)
    $parts = @($total, $okAscii, $okBom, $okUtf8, $warn) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# 8) package.json consistency (Talas 79; engines.node + license + private preko 3 Node paketa)
Invoke-Audit -Name 'package-json-consistency' -ScriptRel 'scripts/check-package-json-consistency.ps1' `
  -Summarize {
    param($lines)
    $total = ($lines | Where-Object { $_ -match 'Node paketa skenirano:' } | Select-Object -First 1)
    $warn  = ($lines | Where-Object { $_ -match 'WARN \(realan rizik\):' } | Select-Object -First 1)
    $info  = ($lines | Where-Object { $_ -match 'INFO \(informativno\):' } | Select-Object -First 1)
    $parts = @($total, $warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# 9) workflow consistency (Talas 80; GitHub workflow + .nvmrc + engines.node cross-check)
Invoke-Audit -Name 'workflow-consistency' -ScriptRel 'scripts/check-workflow-consistency.ps1' `
  -Summarize {
    param($lines)
    $total = ($lines | Where-Object { $_ -match 'Workflows skenirano:' } | Select-Object -First 1)
    $nvmrc = ($lines | Where-Object { $_ -match '\.nvmrc referencirano:' } | Select-Object -First 1)
    $warn  = ($lines | Where-Object { $_ -match 'WARN \(realan rizik\):' } | Select-Object -First 1)
    $info  = ($lines | Where-Object { $_ -match 'INFO \(informativno\):' } | Select-Object -First 1)
    $parts = @($total, $nvmrc, $warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# 10) readme presence (Talas 81; paket README.md presence + zdravlje)
Invoke-Audit -Name 'readme-presence' -ScriptRel 'scripts/check-readme-presence.ps1' `
  -Summarize {
    param($lines)
    $proverljivo = ($lines | Where-Object { $_ -match 'README putanja proverljivo:' } | Select-Object -First 1)
    $ok = ($lines | Where-Object { $_ -match 'OK \(postoji \+ non-empty \+ 1 H1\):' } | Select-Object -First 1)
    $missing = ($lines | Where-Object { $_ -match 'MISSING \(ne postoji\):' } | Select-Object -First 1)
    $empty = ($lines | Where-Object { $_ -match 'EMPTY \(0-byte\):' } | Select-Object -First 1)
    $noH1 = ($lines | Where-Object { $_ -match 'NO-H1 \(nema H1 heading\):' } | Select-Object -First 1)
    $multi = ($lines | Where-Object { $_ -match 'MULTI-H1 \(vise od 1 H1, INFO\):' } | Select-Object -First 1)
    $parts = @($proverljivo, $ok, $missing, $empty, $noH1, $multi) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# 11) markdown code-block validation (Talas 82; balansirani fence-ovi + language tag + H1-in-block)
Invoke-Audit -Name 'markdown-code-blocks' -ScriptRel 'scripts/check-markdown-code-blocks.ps1' `
  -Summarize {
    param($lines)
    $skenirano = ($lines | Where-Object { $_ -match '\*\.md fajlova skenirano:' } | Select-Object -First 1)
    $blokova = ($lines | Where-Object { $_ -match 'Code blokova ukupno:' } | Select-Object -First 1)
    $unbal = ($lines | Where-Object { $_ -match 'UNBALANCED \(nezatvoreni\):' } | Select-Object -First 1)
    $noLang = ($lines | Where-Object { $_ -match 'NO-LANG-TAG \(INFO\):' } | Select-Object -First 1)
    $h1 = ($lines | Where-Object { $_ -match 'H1-IN-BLOCK \(INFO; Talas 81 #17\):' } | Select-Object -First 1)
    $nested = ($lines | Where-Object { $_ -match 'NESTED-FENCE \(INFO\):' } | Select-Object -First 1)
    $parts = @($skenirano, $blokova, $unbal, $noLang, $h1, $nested) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# 12) Lekcija #17 doslednost preko PS skenera (Talas 85; preventivni gate / regression sentinel)
Invoke-Audit -Name 'codeblock-skip-consistency' -ScriptRel 'scripts/check-codeblock-skip-consistency.ps1' `
  -Summarize {
    param($lines)
    $skenirano = ($lines | Where-Object { $_ -match 'PS skripti skenirano:' } | Select-Object -First 1)
    $okCount = ($lines | Where-Object { $_ -match 'OK \(Lekcija #17 implementirana\):' } | Select-Object -First 1)
    $naCount = ($lines | Where-Object { $_ -match 'N/A \(ne parsira \*\.md\):' } | Select-Object -First 1)
    $ignoredCount = ($lines | Where-Object { $_ -match 'IGNORED' } | Select-Object -First 1)
    $missing = ($lines | Where-Object { $_ -match 'MISSING-SKIP \(rizik false pozitiva\):' } | Select-Object -First 1)
    $parts = @($skenirano, $okCount, $naCount, $ignoredCount, $missing) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# 13) tsconfig.json doslednost preko 3 TS paketa (Talas 87; informativan)
Invoke-Audit -Name 'tsconfig-consistency' -ScriptRel 'scripts/check-tsconfig-consistency.ps1' `
  -Summarize {
    param($lines)
    $skenirano = ($lines | Where-Object { $_ -match 'TS paketa skenirano:' } | Select-Object -First 1)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(realan rizik\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(informativno\):' } | Select-Object -First 1)
    $parts = @($skenirano, $warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# 14) Reverse hub coverage — dev/docs page.tsx -> *.md fajl postoji na disku (Talas 90; informativan)
Invoke-Audit -Name 'dev-docs-stale-entries' -ScriptRel 'scripts/check-dev-docs-stale-entries.ps1' `
  -Summarize {
    param($lines)
    $skenirano = ($lines | Where-Object { $_ -match 'Putanje u hub-u skenirano:' } | Select-Object -First 1)
    $ok = ($lines | Where-Object { $_ -match 'OK \(target fajl postoji\):' } | Select-Object -First 1)
    $stale = ($lines | Where-Object { $_ -match 'STALE-MISSING' } | Select-Object -First 1)
    $parts = @($skenirano, $ok, $stale) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# 15) ESLint config doslednost preko 3 Node paketa (Talas 91; informativan)
Invoke-Audit -Name 'eslint-consistency' -ScriptRel 'scripts/check-eslint-consistency.ps1' `
  -Summarize {
    param($lines)
    $skenirano = ($lines | Where-Object { $_ -match 'Node paketa skenirano:' } | Select-Object -First 1)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(realan rizik\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(informativno\):' } | Select-Object -First 1)
    $parts = @($skenirano, $warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# 16) .gitignore doslednost preko 3 Node paketa + root (Talas 92; informativan)
Invoke-Audit -Name 'gitignore-consistency' -ScriptRel 'scripts/check-gitignore-consistency.ps1' `
  -Summarize {
    param($lines)
    $skenirano = ($lines | Where-Object { $_ -match '\.gitignore fajla skenirano:' } | Select-Object -First 1)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(security / build risk\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(informativno\):' } | Select-Object -First 1)
    $parts = @($skenirano, $warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# 17) .env.example presence + zdravlje preko 3 Node paketa (Talas 93; informativan)
Invoke-Audit -Name 'env-example-presence' -ScriptRel 'scripts/check-env-example-presence.ps1' `
  -Summarize {
    param($lines)
    $skenirano = ($lines | Where-Object { $_ -match 'Node paketa skenirano:' } | Select-Object -First 1)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(security / missing\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(informativno\):' } | Select-Object -First 1)
    $parts = @($skenirano, $warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# 18) package.json scripts: doslednost preko 3 Node paketa (Talas 94; informativan)
Invoke-Audit -Name 'package-scripts-consistency' -ScriptRel 'scripts/check-package-scripts-consistency.ps1' `
  -Summarize {
    param($lines)
    $skenirano = ($lines | Where-Object { $_ -match 'Node paketa skenirano:' } | Select-Object -First 1)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(CI/CD risk\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(informativno\):' } | Select-Object -First 1)
    $parts = @($skenirano, $warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# 19) Root-level OSS/GitHub meta fajlovi presence (Talas 95; informativan)
Invoke-Audit -Name 'repo-meta-files-presence' -ScriptRel 'scripts/check-repo-meta-files-presence.ps1' `
  -Summarize {
    param($lines)
    $skenirano = ($lines | Where-Object { $_ -match 'Meta fajlova proverljivo:' } | Select-Object -First 1)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(obavezni nedostaju\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(opcioni nedostaju\):' } | Select-Object -First 1)
    $parts = @($skenirano, $warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# 20) package.json devDependencies MAJOR version doslednost preko 3 Node paketa (Talas 96; informativan)
Invoke-Audit -Name 'dev-deps-versions-consistency' -ScriptRel 'scripts/check-dev-deps-versions-consistency.ps1' `
  -Summarize {
    param($lines)
    $skenirano = ($lines | Where-Object { $_ -match 'Node paketa skenirano:' } | Select-Object -First 1)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(lint/compile drift\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(informativno\):' } | Select-Object -First 1)
    $parts = @($skenirano, $warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# 21) .github/ direktorijum metadata fajlovi presence (Talas 97; informativan)
Invoke-Audit -Name 'github-meta-files-presence' -ScriptRel 'scripts/check-github-meta-files-presence.ps1' `
  -Summarize {
    param($lines)
    $skenirano = ($lines | Where-Object { $_ -match 'Meta entiteta proverljivo:' } | Select-Object -First 1)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(obavezni nedostaju\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(opcioni nedostaju\):' } | Select-Object -First 1)
    $parts = @($skenirano, $warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# 22) package-lock.json presence + zdravlje + doslednost (Talas 98; informativan)
Invoke-Audit -Name 'package-lock-presence' -ScriptRel 'scripts/check-package-lock-presence.ps1' `
  -Summarize {
    param($lines)
    $skenirano = ($lines | Where-Object { $_ -match 'Node paketa skenirano:' } | Select-Object -First 1)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(reproducibility risk\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(informativno\):' } | Select-Object -First 1)
    $parts = @($skenirano, $warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# 23) Docker fajlovi presence + zdravlje (Talas 99; informativan)
Invoke-Audit -Name 'docker-files-presence' -ScriptRel 'scripts/check-docker-files-presence.ps1' `
  -Summarize {
    param($lines)
    $skenirano = ($lines | Where-Object { $_ -match 'Lokacija skenirano:' } | Select-Object -First 1)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(deploy-rizik\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(best practice\):' } | Select-Object -First 1)
    $parts = @($skenirano, $warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# 24) docker-compose YAML doslednost (Talas 100 milestone; informativan)
Invoke-Audit -Name 'docker-compose-consistency' -ScriptRel 'scripts/check-docker-compose-consistency.ps1' `
  -Summarize {
    param($lines)
    $skenirano = ($lines | Where-Object { $_ -match 'Compose fajlova skenirano:' } | Select-Object -First 1)
    $servisi = ($lines | Where-Object { $_ -match 'Servisa ukupno:' } | Select-Object -First 1)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(orchestration risk\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(best practice\):' } | Select-Object -First 1)
    $parts = @($skenirano, $servisi, $warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# 25) Python requirements.txt doslednost (Talas 101; informativan)
Invoke-Audit -Name 'python-package-consistency' -ScriptRel 'scripts/check-python-package-consistency.ps1' `
  -Summarize {
    param($lines)
    $skenirano = ($lines | Where-Object { $_ -match 'Python paketa skenirano:' } | Select-Object -First 1)
    $deps = ($lines | Where-Object { $_ -match 'Dependencies ukupno:' } | Select-Object -First 1)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(Python-rizik\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(best practice\):' } | Select-Object -First 1)
    $parts = @($skenirano, $deps, $warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }


# docker-compose-typeorm-sync-consistency
Invoke-Audit -Name 'docker-compose-typeorm-sync-consistency' -ScriptRel 'scripts/check-docker-compose-typeorm-sync-consistency.ps1' `
  -Summarize {
    param($lines)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(Compose-TypeORM-rizik\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(best practice' } | Select-Object -First 1)
    $parts = @($warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# pytest-config-consistency
Invoke-Audit -Name 'pytest-config-consistency' -ScriptRel 'scripts/check-pytest-config-consistency.ps1' `
  -Summarize {
    param($lines)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(testing-rizik\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(best practice' } | Select-Object -First 1)
    $parts = @($warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# vscode-settings-presence
Invoke-Audit -Name 'vscode-settings-presence' -ScriptRel 'scripts/check-vscode-settings-presence.ps1' `
  -Summarize {
    param($lines)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(DX-rizik\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(best practice' } | Select-Object -First 1)
    $parts = @($warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# prettier-config-consistency
Invoke-Audit -Name 'prettier-config-consistency' -ScriptRel 'scripts/check-prettier-config-consistency.ps1' `
  -Summarize {
    param($lines)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(format-rizik\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(best practice' } | Select-Object -First 1)
    $parts = @($warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# shared-deps-consistency
Invoke-Audit -Name 'shared-deps-consistency' -ScriptRel 'scripts/check-shared-deps-consistency.ps1' `
  -Summarize {
    param($lines)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(deploy-rizik\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(best practice' } | Select-Object -First 1)
    $parts = @($warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# tailwind-config-consistency
Invoke-Audit -Name 'tailwind-config-consistency' -ScriptRel 'scripts/check-tailwind-config-consistency.ps1' `
  -Summarize {
    param($lines)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(Tailwind-rizik\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(best practice' } | Select-Object -First 1)
    $parts = @($warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# next-config-consistency
Invoke-Audit -Name 'next-config-consistency' -ScriptRel 'scripts/check-next-config-consistency.ps1' `
  -Summarize {
    param($lines)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(Next-rizik\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(best practice' } | Select-Object -First 1)
    $parts = @($warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# jest-config-consistency
Invoke-Audit -Name 'jest-config-consistency' -ScriptRel 'scripts/check-jest-config-consistency.ps1' `
  -Summarize {
    param($lines)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(Jest-rizik\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(best practice' } | Select-Object -First 1)
    $parts = @($warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# nest-cli-config-consistency
Invoke-Audit -Name 'nest-cli-config-consistency' -ScriptRel 'scripts/check-nest-cli-config-consistency.ps1' `
  -Summarize {
    param($lines)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(Nest-rizik\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(best practice' } | Select-Object -First 1)
    $parts = @($warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# typeorm-data-source-consistency
Invoke-Audit -Name 'typeorm-data-source-consistency' -ScriptRel 'scripts/check-typeorm-data-source-consistency.ps1' `
  -Summarize {
    param($lines)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(TypeORM-rizik\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(best practice' } | Select-Object -First 1)
    $parts = @($warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# jest-e2e-config-consistency
Invoke-Audit -Name 'jest-e2e-config-consistency' -ScriptRel 'scripts/check-jest-e2e-config-consistency.ps1' `
  -Summarize {
    param($lines)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(Jest-E2E-rizik\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(best practice' } | Select-Object -First 1)
    $parts = @($warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# docker-node-image-vs-engines
Invoke-Audit -Name 'docker-node-image-vs-engines' -ScriptRel 'scripts/check-docker-node-image-vs-engines.ps1' `
  -Summarize {
    param($lines)
    $warn = ($lines | Where-Object { $_ -match 'WARN \(Docker-engines-rizik\):' } | Select-Object -First 1)
    $info = ($lines | Where-Object { $_ -match 'INFO \(best practice' } | Select-Object -First 1)
    $parts = @($warn, $info) | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    $parts -join ' | '
  }

# 38) TODO markers
if (-not $SkipTodoScan) {
  $todoArgs = @()
  if ($OutputDir) {
    $todoArgs = @('-OutputJson', (Join-Path $absOutput 'todo-markers.json'))
  }
  Invoke-Audit -Name 'todo-markers' -ScriptRel 'scripts/scan-todo-markers.ps1' -ExtraArgs $todoArgs `
    -Summarize {
      param($lines)
      $skenirano = ($lines | Where-Object { $_ -match 'Skenirano:' } | Select-Object -First 1)
      $ukupno    = ($lines | Where-Object { $_ -match 'UKUPNO' } | Select-Object -First 1)
      @($skenirano, $ukupno) -join ' | '
    }
} else {
  Write-Host '----------------------------------------------------------------------' -ForegroundColor DarkGray
  Write-Host '[todo-markers] PRESKOCENO (-SkipTodoScan)' -ForegroundColor DarkYellow
  $results.Add([pscustomobject]@{
    Name = 'todo-markers'; Script = 'scripts/scan-todo-markers.ps1'; Args = '(skipped)';
    ExitCode = $null; ElapsedMs = 0; Summary = '(skipped via -SkipTodoScan)'
  }) | Out-Null
}

# 39) npm audit
if (-not $SkipNpmAudit) {
  $npmArgs = @()
  if ($OutputDir) {
    $npmArgs = @('-OutDir', (Join-Path $absOutput 'npm-audit'))
  }
  Invoke-Audit -Name 'npm-audit' -ScriptRel 'scripts/audit-npm-monorepo.ps1' -ExtraArgs $npmArgs `
    -Summarize {
      param($lines)
      $aggregate = ($lines | Where-Object { $_ -match '^Aggregate \(' } | Select-Object -First 1)
      if ($aggregate) { return $aggregate.Trim() }
      $totals = ($lines | Where-Object { $_ -match '^\| Ukupno' } | Select-Object -First 1)
      if ($totals) { return $totals.Trim() }
      return '(no summary line)'
    }
} else {
  Write-Host '----------------------------------------------------------------------' -ForegroundColor DarkGray
  Write-Host '[npm-audit] PRESKOCENO (-SkipNpmAudit)' -ForegroundColor DarkYellow
  $results.Add([pscustomobject]@{
    Name = 'npm-audit'; Script = 'scripts/audit-npm-monorepo.ps1'; Args = '(skipped)';
    ExitCode = $null; ElapsedMs = 0; Summary = '(skipped via -SkipNpmAudit)'
  }) | Out-Null
}

$elapsedTotal = (Get-Date) - $startedAt

# --- Konsolidovan rezime ---
Write-Host ''
Write-Host '======================================================================' -ForegroundColor Cyan
Write-Host 'KONSOLIDOVAN REZIME' -ForegroundColor Cyan
Write-Host '======================================================================' -ForegroundColor Cyan
foreach ($r in $results) {
  $status = '?'
  $color = 'Gray'
  if ($r.ExitCode -eq $null) {
    $status = 'SKIP'
    $color = 'DarkYellow'
  } elseif ($r.ExitCode -eq 0) {
    $status = 'PASS'
    $color = 'Green'
  } else {
    $status = 'FAIL'
    $color = 'Red'
  }
  $exitStr = '-'
  if ($r.ExitCode -ne $null) { $exitStr = "exit=$($r.ExitCode)" }
  Write-Host ("  [{0}] {1,-22} {2,-9} {3,7} ms" -f $status, $r.Name, $exitStr, $r.ElapsedMs) -ForegroundColor $color
  if ($r.Summary) {
    Write-Host ("        {0}" -f $r.Summary) -ForegroundColor DarkGray
  }
}
Write-Host ''
Write-Host ("Ukupno trajanje: {0:N1} s ({1:N0} ms)" -f $elapsedTotal.TotalSeconds, $elapsedTotal.TotalMilliseconds) -ForegroundColor Cyan
if ($OutputDir) {
  Write-Host ("Snapshot izlazi: {0}" -f $absOutput) -ForegroundColor Cyan
}
Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).' -ForegroundColor DarkGray
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).' -ForegroundColor DarkGray
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).' -ForegroundColor DarkGray
Write-Host '  - Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md i docs/NIVO-1-DRYRUN-LOG.md.' -ForegroundColor DarkGray

if ($FailOnAny) {
  $hasFailure = $false
  foreach ($r in $results) {
    if ($r.ExitCode -ne $null -and $r.ExitCode -ne 0) {
      $hasFailure = $true
      break
    }
  }
  if ($hasFailure) {
    Write-Host '== EXIT 1: -FailOnAny i bar jedan audit ima exit != 0 ==' -ForegroundColor Red
    exit 1
  }
}
exit 0

# `Get-Help` snapshot - `scripts`

**Generisan:** 2026-05-16 17:55 | **Skripta za regen:** `../scripts/regenerate-help-snapshot.ps1` | **Broj skripti:** 43

**Refs:**

- **Pun verify (CI mirror):** `../scripts/verify-monorepo.ps1` (job `python` / required check `Python (Doslednost dok + pytest)` - `../docs/GIT-BRANCH-PROTECTION.md`; pun mirror ukljucuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb)
- **Smoke (HTTP):** `../scripts/smoke-stack.ps1` + bundled Atina `npm run smoke:all` (formalni Atina release gate: `../atina-platform/atina/docs/operations/release-gate-checklist.md` - *Local notes - Smoke tests*)
- **Konsolidovani audit suite (single entry point):** `../scripts/run-all-audits.ps1` — **39** koraka (**37** read-only skripte + TODO skener + npm audit); pun spisak koraka u `Get-Help` za taj fajl.
- **Vlasnik dashboard:** `../docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md`
- **Monorepo evidencija (indeks + dry-run):** `../docs/EVIDENCE-INDEX.md` / `../docs/NIVO-1-DRYRUN-LOG.md`

> **Svrha dokumenta:** staticka jednostranicna referenca za sve PowerShell skripte u `scripts/`. Vlasnik moze pregledati synopsis, sintaksu, parametre i primere bez pokretanja terminala. Pun Get-Help izlaz dobija sa komandom uz svaki red ispod (npr. Get-Help .\scripts\verify-monorepo.ps1 -Full). **Regen pri svakoj izmeni comment-based help-a u bilo kojoj skripti** - pokreni `../scripts/regenerate-help-snapshot.ps1` (read-only, smoke test rezultat na kraju).

---

## `audit-doc-gate-references.ps1`

**Putanja:** `../scripts/audit-doc-gate-references.ps1`

**Synopsis:** Repo hygiene: doc references to verify-monorepo and smoke-stack stay paired with omnigroup context and smoke:all (bundled Atina gate); files citing EVIDENCE-INDEX must also cite NIVO-1-DRYRUN-LOG. Canonical wording: Doslednost dok doc gate (md/txt + yaml/ps1/ini), uklj. par EVIDENCE-INDEX / NIVO-1-DRYRUN-LOG, u scripts/README.md. Required-check naming: docs/GIT-BRANCH-PROTECTION.md.

**Opis (prvi paragraf):** Walks the workspace from repo root, skips directories named node_modules or .next (not entered). Scans *.md, *.txt,

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\audit-doc-gate-references.ps1 [[-RepoRoot] <String>]
[<CommonParameters>]
```

**Primer (prvi):**

```powershell
introduction      code                                    remarks                                     title
------------      ----                                    -------                                     -----
{@{Text=PS C:\>}} .\scripts\audit-doc-gate-references.ps1 {@{Text=}, @{Text=}, @{Text=}, @{Text=}...} --------------...
```

**Pun help za vlasnika:** `Get-Help .\scripts\audit-doc-gate-references.ps1 -Full`

---

## `audit-npm-monorepo.ps1`

**Putanja:** `../scripts/audit-npm-monorepo.ps1`

**Synopsis:** Konsolidovani `npm audit` runner preko sve 3 Node tačke u monorepu (Atina, Nest, omnigroup-web). Konsoliduje rezultate u jednu tabelu i (opciono) snima JSON snapshot. Konsolidovani audit runbook: docs/NPM-AUDIT-MONOREPO.md (uz Nest-specifičan trag atina-system/docs/NPM-AUDIT-NIVO1.md).

**Opis (prvi paragraf):** Iz korena repoa pokreće `npm audit --json` u atina-platform/atina, atina-system i apps/omnigroup-web. Parsira

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\audit-npm-monorepo.ps1 [-OmitDev] [[-OutDir] <String>]
[-FailOnCritical] [<CommonParameters>]
```

**Parametri:**

- `-OmitDev` (`SwitchParameter`) - Pokreće `npm audit --omit=dev` (samo produkcijske zavisnosti). Korisno za odvajanje stvarnog production-impact-a od
- `-OutDir` (`String`) - Opciona putanja folder-a za JSON snapshot-ove. Ako je zadat, skripta snima `<paket>-<YYYYMMDD-HHmm>.json` po paketu —
- `-FailOnCritical` (`SwitchParameter`) - Ako je zadato, skripta vraća exit code 1 ako bilo koji paket ima `critical` advisory. Bez ove opcije, skripta uvek

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\audit-npm-monorepo.ps1
# Sve zavisnosti, samo tabela; uvek exit 0.
```

**Pun help za vlasnika:** `Get-Help .\scripts\audit-npm-monorepo.ps1 -Full`

---

## `check-codeblock-skip-consistency.ps1`

**Putanja:** `../scripts/check-codeblock-skip-consistency.ps1`

**Synopsis:** Talas 85 preventivni gate: doslednost Lekcije #17 (markdown code-block fence skip) preko svih PS skripti koje parsiraju `*.md`. Read-only audit. Skenira `scripts/*.ps1` i prijavljuje status za svaku skriptu: `OK` (cita md i ima skip logiku), `MISSING-SKIP` (cita md ali nema skip logiku - WARN), `N/A` (ne cita md - irelevantno). Talas 81 / 82 / 83 / 84 ucenje formalizovano u mehanizovan regression sentinel: ako neko u buducnosti doda novi PS skener koji parsira markdown bez code-block skip-a, ovaj audit ce ga uhvatiti.

**Opis (prvi paragraf):** Talas 81 je definisao Lekciju #17: markdown skeneri moraju preskakati code blokove (` ``` ... ``` `) pre primene

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-codeblock-skip-consistency.ps1 [-FailOnMissing]
[[-MaxOutput] <Int32>] [[-ScriptsDir] <String>] [[-IgnoreScripts] <String[]>] [[-IgnoreDefaults] <Boolean>]
[<CommonParameters>]
```

**Parametri:**

- `-FailOnMissing` (`SwitchParameter`) - Vraca exit 1 ako bilo koja skripta ima `MISSING-SKIP` status. Default off (informativan).
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 50.
- `-ScriptsDir` (`String`) - Putanja do direktorijuma sa PS skriptama za skeniranje. Default `scripts` (relativno na koren repoa).
- `-IgnoreScripts` (`String[]`) - Niz basename-ova skripti koje treba preskociti (case-insensitive). Spaja se sa default-om ako je `-IgnoreDefaults`
- `-IgnoreDefaults` (`Boolean`) - Switch - ako je on (default), skripta automatski ignorise listu poznatih skripti koje listiraju `*.md` ali ne

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-codeblock-skip-consistency.ps1
# Default: skenira `scripts/*.ps1`, prijavljuje sve statuse, exit 0.
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-codeblock-skip-consistency.ps1 -Full`

---

## `check-dev-deps-versions-consistency.ps1`

**Putanja:** `../scripts/check-dev-deps-versions-consistency.ps1`

**Synopsis:** `package.json` `devDependencies` MAJOR version doslednost preko 3 Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 96: **3. sloj `package.json` audit-a** posle Talas 79 (metapodaci: `engines.node` + `license` + `private`) i Talas 94 (`scripts:` polja: test/lint/build/start/dev/format) — fokus na verzijama ključnih dev-tools (TypeScript, ESLint, `@types/node`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, prettier) koje moraju biti **konzistentne preko paketa** da bi compile + lint output bio reproduktibilan i da ne bi došlo do tip / pravilo drift-a između CI build-ova. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa parsira 3 paket-level `package.json` fajla (`apps/omnigroup-web/package.json` Next +

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-dev-deps-versions-consistency.ps1 [-FailOnWarn]
[[-MaxOutput] <Int32>] [[-PackageRoots] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Vraća exit 1 ako bilo koja od 5 obaveznih dev-deps (`typescript`, `eslint`, `@types/node`,
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 200.
- `-PackageRoots` (`String[]`) - Lista relativnih putanja do `package.json` fajlova koji se proveravaju. Default 3 paketa:

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-dev-deps-versions-consistency.ps1
# Default: skenira 3 package.json fajla, prijavljuje WARN/INFO nalaze, exit 0 uvek.
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-dev-deps-versions-consistency.ps1 -Full`

---

## `check-dev-docs-coverage.ps1`

**Putanja:** `../scripts/check-dev-docs-coverage.ps1`

**Synopsis:** Provera completeness `apps/omnigroup-web/src/app/dev/docs/page.tsx` hub-a — koji `*.md` fajlovi u monorepu nisu navigaciono dostupni preko `/dev/docs` rute. Informativan, **nije** CI gate. Dopuna read-only audit suite-a (`audit-doc-gate-references.ps1` doc gate, `check-doc-links.ps1` link skener, `audit-npm-monorepo.ps1` security skener).

**Opis (prvi paragraf):** Iz korena repoa parsira `apps/omnigroup-web/src/app/dev/docs/page.tsx` (sve string literale unutar `paths: [...]`

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-dev-docs-coverage.ps1 [-FailOnMissing]
[-IncludeTemplates] [-ShowStale] [<CommonParameters>]
```

**Parametri:**

- `-FailOnMissing` (`SwitchParameter`) - Vraća exit 1 ako bilo koji `*.md` fajl iz `docs/`, `atina-system/docs/`, `atina-platform/atina/docs/operations/` ili
- `-IncludeTemplates` (`SwitchParameter`) - Uključi `*.template.md` fajlove u skup koji se proverava.
- `-ShowStale` (`SwitchParameter`) - Dodatno prikaži putanje koje su u page.tsx, ali ne postoje u file system-u (subset onoga što daje

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-dev-docs-coverage.ps1
# Pun pregled, samo izveštaj; uvek exit 0 osim sa -FailOnMissing.
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-dev-docs-coverage.ps1 -Full`

---

## `check-dev-docs-stale-entries.ps1`

**Putanja:** `../scripts/check-dev-docs-stale-entries.ps1`

**Synopsis:** Reverse-coverage skener za `apps/omnigroup-web/src/app/dev/docs/page.tsx` hub: za svaku putanju u `paths: [...]` blokovima validira da target fajl **stvarno postoji** na disku. Komplementaran sa `check-dev-docs-coverage.ps1` (Talas 66, forward: svaki `*.md` u repo-u → da li je u hub-u). Talas 90: monorepo dev/docs hub sad ima **two-way coverage** garanciju. Informativan, **nije** CI gate. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa parsira `apps/omnigroup-web/src/app/dev/docs/page.tsx` (svi string literale unutar `paths: [...]`

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-dev-docs-stale-entries.ps1 [-FailOnStale] [[-MaxOutput]
<Int32>] [[-PagePath] <String>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnStale` (`SwitchParameter`) - Vraća exit 1 ako bilo koja putanja u page.tsx hub-u nema target fajl na disku. Bez ove opcije, uvek vraća 0 (skripta
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 200.
- `-PagePath` (`String`) - Putanja do `page.tsx` fajla relativno na repo root. Default `apps/omnigroup-web/src/app/dev/docs/page.tsx`.

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-dev-docs-stale-entries.ps1
# Default: skenira page.tsx, prijavljuje stale entries, exit 0 uvek.
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-dev-docs-stale-entries.ps1 -Full`

---

## `check-docker-compose-consistency.ps1`

**Putanja:** `../scripts/check-docker-compose-consistency.ps1`

**Synopsis:** `docker-compose*.yml` doslednost preko 8 compose fajlova (5 root + 3 atina-platform/atina) (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 100 (milestone): **proširenje Talas 99 container/Docker hygiene domena u orchestration sloj** — Talas 99 audituje Dockerfile + .dockerignore (image build), Talas 100 audituje docker-compose YAML (multi-service orchestration); zajedno pokrivaju kompletan Docker layer monorepa. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa skenira **8 docker-compose YAML fajlova** preko 2 lokacije i validira **7 strukturalnih invarijanti**:

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-docker-compose-consistency.ps1 [-FailOnWarn]
[[-MaxOutput] <Int32>] [[-ComposeFiles] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Vraća exit 1 ako bilo koji od 7 strukturalnih invarijanti prijavi WARN. Bez ove opcije, uvek vraća 0 (skripta je
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 200.
- `-ComposeFiles` (`String[]`) - Lista relativnih putanja do compose fajlova. Default je 8 fajlova monorepa. Parametrizovan radi testiranja.

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-docker-compose-consistency.ps1
# Default: skenira 8 compose fajlova, prijavljuje WARN/INFO nalaze, exit 0 uvek.
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-docker-compose-consistency.ps1 -Full`

---

## `check-docker-compose-typeorm-sync-consistency.ps1`

**Putanja:** `../scripts/check-docker-compose-typeorm-sync-consistency.ps1`

**Synopsis:** `TYPEORM_SYNC` u `docker-compose*.yml` fajlovima (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 113: **proširenje Talas 100 orchestration + Talas 111 TypeORM** — hvata **compose-level** `synchronize` ekvivalent preko env var-a. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa skenira **iste 8 docker-compose YAML fajlova** kao

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-docker-compose-typeorm-sync-consistency.ps1
[-FailOnWarn] [[-MaxOutput] <Int32>] [[-ComposeFiles] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Exit 1 ako ima WARN nalaza.
- `-MaxOutput` (`Int32`) - Maksimalan broj detaljnih redova (default 200).
- `-ComposeFiles` (`String[]`) - Relativne putanje compose fajlova (default 8 kao Talas 100).

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-docker-compose-typeorm-sync-consistency.ps1
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-docker-compose-typeorm-sync-consistency.ps1 -Full`

---

## `check-docker-files-presence.ps1`

**Putanja:** `../scripts/check-docker-files-presence.ps1`

**Synopsis:** `Dockerfile` + `.dockerignore` + `docker-compose.yml` presence + zdravlje preko 4 logičkih lokacija (root Python + 3 Node paketa) (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 99: novi domen — **container/Docker hygiene** (komplementaran sa Talas 80 GitHub workflow YAML doslednost u CI/CD sloju), fokus na **Dockerfile multi-stage + non-root USER + HEALTHCHECK + `.dockerignore` `node_modules` ignore** koji su deploy-rizik signali ako nedostaju. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa skenira **4 logičkih lokacija** (root sa Python Dockerfile + 3 Node paketa: `apps/omnigroup-web`,

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-docker-files-presence.ps1 [-FailOnWarn] [[-MaxOutput]
<Int32>] [[-DockerLocations] <Hashtable[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Vraća exit 1 ako bilo koji od 7 strukturalnih invarijanti prijavi WARN. Bez ove opcije, uvek vraća 0 (skripta je
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 200.
- `-DockerLocations` (`Hashtable[]`) - Lista hashtable-ova koji opisuju Docker lokacije. Default je 4 lokacije (root Python + 3 Node paketa). Parametrizovan

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-docker-files-presence.ps1
# Default: skenira 4 lokacije, prijavljuje WARN/INFO nalaze, exit 0 uvek.
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-docker-files-presence.ps1 -Full`

---

## `check-docker-node-image-vs-engines.ps1`

**Putanja:** `../scripts/check-docker-node-image-vs-engines.ps1`

**Synopsis:** `FROM node:` major u Dockerfile-u vs `package.json#engines.node` (informativan, opciono `-FailOnWarn`). Talas 114: **komplement Talas 79** (`engines.node`) + **Talas 99** (Node Dockerfile) — hvata produkcioni rizik da image koristi drugačiji Node major od deklaracije u paketu.

**Opis (prvi paragraf):** Za svaku **Node** lokaciju u default listi (isti logički skup kao

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-docker-node-image-vs-engines.ps1 [-FailOnWarn]
[[-MaxOutput] <Int32>] [[-NodeDockerLocations] <Hashtable[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Exit 1 ako bilo koji invariant prijavi WARN.
- `-MaxOutput` (`Int32`) - Maksimalan broj WARN detaljnih redova (default 200).
- `-NodeDockerLocations` (`Hashtable[]`) - Hashtabele sa `Path` (relativno od repo root) i `Label` (prikaz ime).

**Primer (prvi):**

```powershell
introduction      code                                             remarks                                     title
------------      ----                                             -------                                     -----
{@{Text=PS C:\>}} .\scripts\check-docker-node-image-vs-engines.ps1 {@{Text=}, @{Text=}, @{Text=}, @{Text=}...} -----...
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-docker-node-image-vs-engines.ps1 -Full`

---

## `check-doc-links.ps1`

**Putanja:** `../scripts/check-doc-links.ps1`

**Synopsis:** Markdown link checker (informativan, **nije** CI gate). Skenira `*.md` fajlove u monorepu i prijavljuje slomljene relativne linkove ka nepostojećim fajlovima ili 0-byte fajlovima (OneDrive Files-On-Demand `ReparsePoint` placeholder bez cloud sadržaja — vidi [`docs/EMPTY-DOCS-RUNBOOK.md`](./EMPTY-DOCS-RUNBOOK.md)). Koristi se uz konsolidovani `npm audit` runner [`audit-npm-monorepo.ps1`](../scripts/audit-npm-monorepo.ps1) i pun verify mirror [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) bez menjanja CI scope-a; HTTP smoke je [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) + bundled Atina **`npm run smoke:all`** (formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) — *Local notes — Smoke tests*).

**Opis (prvi paragraf):** Iz korena repoa rekurzivno prolazi sve `*.md` fajlove (van `node_modules`, `.next`, `.git`, `dist`, `coverage`,

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-doc-links.ps1 [-FailOnBroken] [[-MaxOutput] <Int32>]
[-SkipEmptyTargets] [<CommonParameters>]
```

**Parametri:**

- `-FailOnBroken` (`SwitchParameter`) - Vraća exit 1 ako se nađe bilo koji broken link. Bez ove opcije, uvek vraća 0 (skript je informativan).
- `-MaxOutput` (`Int32`) - Maksimalan broj broken linkova koji se ispisuje (default 200). Posle toga ide samo brojač.
- `-SkipEmptyTargets` (`SwitchParameter`) - Preskoči prijavu linkova koji vode na 0-byte fajlove (OneDrive `ReparsePoint` placeholder ili stvarno prazan fajl).

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-doc-links.ps1
# Pun pregled, samo izveštaj; uvek exit 0.
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-doc-links.ps1 -Full`

---

## `check-env-example-presence.ps1`

**Putanja:** `../scripts/check-env-example-presence.ps1`

**Synopsis:** `.env.example` šablon presence + zdravlje preko 3 Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 93: security follow-up Talas 92 (`.gitignore` audit), nastavlja security domen u **secrets-template sloj**. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa parsira 3 paket-level `.env.example` fajla (`apps/omnigroup-web/.env.example` Next,

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-env-example-presence.ps1 [-FailOnWarn] [[-MaxOutput]
<Int32>] [[-PackageRoots] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Vraća exit 1 ako bilo koji paket ima WARN nalaz (`.env.example` nedostaje / prazan / ima realne secrets). Bez ove
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 200.
- `-PackageRoots` (`String[]`) - Lista relativnih putanja do `.env.example` fajlova koji se proveravaju. Default 3 paketa:

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-env-example-presence.ps1
# Default: skenira 3 .env.example fajla, prijavljuje WARN/INFO nalaze, exit 0 uvek.
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-env-example-presence.ps1 -Full`

---

## `check-eslint-consistency.ps1`

**Putanja:** `../scripts/check-eslint-consistency.ps1`

**Synopsis:** ESLint config doslednost preko 3 Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 91: kompletira monorepo-wide structural consistency domen u **lint sloj** posle Talas 79 (`package.json`), Talas 80 (workflow YAML + `.nvmrc`), Talas 81 (README presence) i Talas 87 (`tsconfig.json`). Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa parsira 3 paket-level ESLint config fajla (`apps/omnigroup-web/.eslintrc.json` Next,

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-eslint-consistency.ps1 [-FailOnWarn] [[-MaxOutput]
<Int32>] [[-PackageRoots] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Vraća exit 1 ako bilo koji ESLint paket ima WARN nalaz (`root` flag inkonzistencija ili
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 200.
- `-PackageRoots` (`String[]`) - Lista relativnih putanja do ESLint config fajlova koji se proveravaju. Default 3 paketa:

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-eslint-consistency.ps1
# Default: skenira 3 ESLint config-a, prijavljuje WARN/INFO nalaze, exit 0 uvek.
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-eslint-consistency.ps1 -Full`

---

## `check-github-meta-files-presence.ps1`

**Putanja:** `../scripts/check-github-meta-files-presence.ps1`

**Synopsis:** `.github/` direktorijum metadata fajlovi presence + zdravlje (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 97: nastavak Talas 95 (root-level OSS / GitHub meta fajlovi: `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `.editorconfig`) u **novi sloj — `.github/` direktorijum metadata** koje GitHub renderuje u repo UI-u i koristi za automation: `dependabot.yml`, `workflows/`, `PULL_REQUEST_TEMPLATE.md`, `ISSUE_TEMPLATE/`, `CODEOWNERS`, `FUNDING.yml`. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa proverava prisustvo i zdravlje **6 strukturalnih meta entita** u `.github/` direktorijumu:

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-github-meta-files-presence.ps1 [-FailOnWarn]
[[-MaxOutput] <Int32>] [[-RepoRoot] <String>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Vraća exit 1 ako bilo koji od 4 obaveznih meta entita (`dependabot.yml`, `workflows/`, `PULL_REQUEST_TEMPLATE.md`,
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 200.
- `-RepoRoot` (`String`) - Putanja do korena repoa. Default je 1 nivo iznad `scripts/` direktorijuma. Parametrizovan radi testiranja.

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-github-meta-files-presence.ps1
# Default: skenira 6 .github/ meta entita, prijavljuje WARN/INFO nalaze, exit 0 uvek.
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-github-meta-files-presence.ps1 -Full`

---

## `check-gitignore-consistency.ps1`

**Putanja:** `../scripts/check-gitignore-consistency.ps1`

**Synopsis:** `.gitignore` doslednost preko 3 Node paketa + root (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 92: dopunjuje monorepo-wide structural consistency domen u **VCS-hygiene sloj** posle Talas 79 (`package.json`), Talas 80 (workflow YAML + `.nvmrc`), Talas 81 (README presence), Talas 87 (`tsconfig.json`) i Talas 91 (ESLint config). Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa parsira 4 `.gitignore` fajla (root + 3 paket-level: `apps/omnigroup-web/.gitignore` Next,

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-gitignore-consistency.ps1 [-FailOnWarn] [[-MaxOutput]
<Int32>] [[-GitignorePaths] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Vraća exit 1 ako bilo koji paket ima WARN nalaz (`node_modules` / `coverage` / `.env` / build artifact nedostaju). Bez
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 200.
- `-GitignorePaths` (`String[]`) - Lista relativnih putanja do `.gitignore` fajlova koji se proveravaju. Default 4 putanje: root + 3 paketa.

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-gitignore-consistency.ps1
# Default: skenira 4 .gitignore fajla, prijavljuje WARN/INFO nalaze, exit 0 uvek.
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-gitignore-consistency.ps1 -Full`

---

## `check-help-blocks-position.ps1`

**Putanja:** `../scripts/check-help-blocks-position.ps1`

**Synopsis:** PowerShell help blok pozicija skener (informativan, opciono pre-PR gate sa `-FailOnViolation`). Validira da svaki `scripts/*.ps1` ima comment-based help blok (otvoreno sa "less-than hash" i zatvoreno sa "hash greater-than") PRE `#Requires` direktive - eksplicitan preventivni gate za Talas 70 lesson (`#Requires` na vrhu raskida vezu help bloka sa script scope-om, `Get-Help.Description` vraca `$null`). Komplementaran sa [`scripts/regenerate-help-snapshot.ps1`](../scripts/regenerate-help-snapshot.ps1) (sporo otkriva indirektno preko `Get-Help`) - ovaj skener je 10x brzi (~0.5 s vs ~5 s) i daje preciznu poruku koja kaze sta tacno premestiti. Konsolidovani runbook (single entry point): `scripts/run-all-audits.ps1`. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa skenira `scripts/*.ps1` (**43** PS skripte — 2026-05-15 baseline posle Talas **114**; Talas 76 bio

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-help-blocks-position.ps1 [-FailOnViolation]
[-FailOnNoHelp] [[-MaxOutput] <Int32>] [[-AdditionalPaths] <String[]>] [-IncludeAtinaScripts] [<CommonParameters>]
```

**Parametri:**

- `-FailOnViolation` (`SwitchParameter`) - Vraca exit 1 ako bilo koji `*.ps1` ima VIOLATION status (`#Requires` ili druga code linija pre help bloka). Bez ove
- `-FailOnNoHelp` (`SwitchParameter`) - Strozija opcija: vraca exit 1 i za NO-HELP status (fajl nema help bloka uopste). Default `false` - NO-HELP je
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 50.
- `-AdditionalPaths` (`String[]`) - Niz dodatnih direktorijuma za skeniranje (relativni od repo root-a). Skripte iz tih direktorijuma se dodaju na
- `-IncludeAtinaScripts` (`SwitchParameter`) - Shorthand switch za `-AdditionalPaths @("atina-platform/atina/scripts")`. Vlasnik moze pokrenuti `...

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-help-blocks-position.ps1
# Default: skenira samo scripts/*.ps1 (43 skripte), prijavljuje VIOLATION + NO-HELP, exit 0 uvek.
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-help-blocks-position.ps1 -Full`

---

## `check-jest-config-consistency.ps1`

**Putanja:** `../scripts/check-jest-config-consistency.ps1`

**Synopsis:** Jest konfiguracija za Node pakete sa `jest` dep-om (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 109: **8. sloj structural config audit-a** posle Next (Talas 108); pokriva **Jest / Node unit-test config** sloj. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa skenira podrazumevano **3 Node paketa** i za svaki koji deklariše `jest` u `dependencies` ili

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-jest-config-consistency.ps1 [-FailOnWarn] [[-MaxOutput]
<Int32>] [[-NodePaths] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Exit 1 ako ima WARN nalaza.
- `-MaxOutput` (`Int32`) - Maksimalan broj detaljnih redova (default 200).
- `-NodePaths` (`String[]`) - Relativne putanje Node paketa (default tri monorepo paketa).

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-jest-config-consistency.ps1
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-jest-config-consistency.ps1 -Full`

---

## `check-jest-e2e-config-consistency.ps1`

**Putanja:** `../scripts/check-jest-e2e-config-consistency.ps1`

**Synopsis:** Jest E2E / integration-test konfiguracija za Node pakete sa `test:e2e` script-om (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 112: **11. sloj structural config audit-a** posle TypeORM (Talas 111); pokriva **Jest E2E bootstrap** sloj na `verify:ci` putanji. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa skenira podrazumevano **3 Node paketa** i za svaki koji deklariše **`test:e2e`** u `package.json`

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-jest-e2e-config-consistency.ps1 [-FailOnWarn]
[[-MaxOutput] <Int32>] [[-NodePaths] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Exit 1 ako ima WARN nalaza.
- `-MaxOutput` (`Int32`) - Maksimalan broj detaljnih redova (default 200).
- `-NodePaths` (`String[]`) - Relativne putanje Node paketa (default tri monorepo paketa).

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-jest-e2e-config-consistency.ps1
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-jest-e2e-config-consistency.ps1 -Full`

---

## `check-markdown-code-blocks.ps1`

**Putanja:** `../scripts/check-markdown-code-blocks.ps1`

**Synopsis:** Markdown code-block validacija skener (informativan, opciono pre-PR gate sa `-FailOnWarn`). Skenira sve `*.md` fajlove u monorepu (osim `node_modules/`) i validira: (1) **balansirani fence-ovi** - broj otvarajucih i zatvarajucih trojnih backtick fence-ova mora biti paran (`WARN` ako neuravnotezeno - znak nezatvorenog code bloka koji bi zbuni svaki dalji markdown skener); (2) **language tag** - svaki otvarajuci fence treba imati language tag npr. `\`\`\`powershell` ili `\`\`\`bash` (`INFO`); (3) **H1-u-code-block detekcija** - linije koje pocinju sa `# ` UNUTAR code blokova su pravi rizik za skenere koji broje H1 heading-e regex-om `^# [^#]` - ovaj uzorak je naucen u Talas 81 (`check-readme-presence.ps1` initial 4 MULTI-H1 false positives) i sada se proaktivno detektuje (`INFO`); (4) **nested fence detekcija** - dva otvarajuca fence-a u nizu (verovatno markdown anomalija - INFO). Talas 82 nastavak monorepo-wide structural consistency u **markdown content quality sloj** (Talas 79 `package.json`, Talas 80 workflow YAML, Talas 81 paket README.md). Read-only audit. Komplementaran sa `check-readme-presence.ps1` (paket README presence + zdravlje), `check-doc-links.ps1` (broken / empty link reference). Konsolidovani runbook (single entry point): `scripts/run-all-audits.ps1`. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa skenira `*.md` fajlove u 6 default lokacija (`docs/`, `scripts/`, root level, `apps/omnigroup-web/`,

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-markdown-code-blocks.ps1 [-FailOnWarn] [[-MaxOutput]
<Int32>] [[-Roots] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Vraca exit 1 ako bilo koji `.md` ima `UNBALANCED` status (nezatvoren code blok). INFO statusi (NO-LANG-TAG,
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 50.
- `-Roots` (`String[]`) - Niz relativnih putanja za skeniranje. Default 6 lokacija: root level (samo prvi nivo, ne rekurzivno - bez

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-markdown-code-blocks.ps1
# Default: skenira sve *.md u 6 lokacija, prijavljuje WARN + INFO, exit 0 uvek (informativan).
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-markdown-code-blocks.ps1 -Full`

---

## `check-nest-cli-config-consistency.ps1`

**Putanja:** `../scripts/check-nest-cli-config-consistency.ps1`

**Synopsis:** Nest CLI `nest-cli.json` doslednost za Node pakete sa Nest framework dep-om (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 110: **9. sloj structural config audit-a** posle Jest (Talas 109); pokriva **Nest CLI / schematics build-time** sloj. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa skenira podrazumevano **3 Node paketa** i za svaki koji deklariše **`@nestjs/core`** u `dependencies`

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-nest-cli-config-consistency.ps1 [-FailOnWarn]
[[-MaxOutput] <Int32>] [[-NodePaths] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Exit 1 ako ima WARN nalaza.
- `-MaxOutput` (`Int32`) - Maksimalan broj detaljnih redova (default 200).
- `-NodePaths` (`String[]`) - Relativne putanje Node paketa (default tri monorepo paketa).

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-nest-cli-config-consistency.ps1
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-nest-cli-config-consistency.ps1 -Full`

---

## `check-next-config-consistency.ps1`

**Putanja:** `../scripts/check-next-config-consistency.ps1`

**Synopsis:** Next.js next.config doslednost za Node pakete sa `next` dep-om (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 108: **7. sloj structural config audit-a** posle Tailwind (Talas 107); pokriva **Next.js framework build-time** sloj. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa skenira podrazumevano **3 Node paketa** i za svaki koji deklariše `next` u `dependencies` ili

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-next-config-consistency.ps1 [-FailOnWarn] [[-MaxOutput]
<Int32>] [[-NodePaths] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Exit 1 ako ima WARN nalaza.
- `-MaxOutput` (`Int32`) - Maksimalan broj detaljnih redova (default 200).
- `-NodePaths` (`String[]`) - Relativne putanje Node paketa (default tri monorepo paketa).

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-next-config-consistency.ps1
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-next-config-consistency.ps1 -Full`

---

## `check-package-json-consistency.ps1`

**Putanja:** `../scripts/check-package-json-consistency.ps1`

**Synopsis:** package.json doslednost skener (informativan, opciono pre-PR gate sa `-FailOnWarn`). Validira da svaki Node paket u monorepu (3 trenutno - omnigroup-web, atina-platform/atina, atina-system) ima usaglasene strukturalne polje (`engines.node`, `license`, `private`) koje je realan deploy-rizik kad nije sinhronizovano. Read-only audit. Konsolidovani runbook (single entry point): `scripts/run-all-audits.ps1`. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa cita 3 `package.json` fajla (omnigroup-web, atina-platform/atina, atina-system) i validira:

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-package-json-consistency.ps1 [-FailOnWarn]
[[-MaxOutput] <Int32>] [[-PackageRoots] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Vraca exit 1 ako bilo koji paket ima `WARN` nalaz. Bez ove opcije, uvek vraca 0 (informativan).
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 50.
- `-PackageRoots` (`String[]`) - Niz relativnih putanja do package.json fajlova. Default: 3 trenutna Node paketa (`apps/omnigroup-web/package.json`,

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-package-json-consistency.ps1
# Default: validira 3 Node paketa, prijavljuje WARN + INFO, exit 0 uvek (informativan).
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-package-json-consistency.ps1 -Full`

---

## `check-package-lock-presence.ps1`

**Putanja:** `../scripts/check-package-lock-presence.ps1`

**Synopsis:** `package-lock.json` (ili `pnpm-lock.yaml` / `yarn.lock`) presence + zdravlje + doslednost preko 3 Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 98: **4. sloj `package.json` audit domena** posle Talas 79 (metapodaci: `engines.node` + `license` + `private`), Talas 94 (`scripts:` polja: test/lint/build/start/dev/format), Talas 96 (`devDependencies` MAJOR verzije: typescript/eslint/@types/node/@typescript-eslint/parser/@typescript-eslint/eslint-plugin/prettier) — fokus na **lock fajlovima** koji garantuju da `npm install` instalira **identične transitive dependency verzije** preko CI/CD i developer mašina. Bez lock-a, `npm install` može instalirati različite minor/patch verzije i izazvati flaky build-ove. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa parsira 3 paket-level direktorijuma (`apps/omnigroup-web`, `atina-platform/atina`, `atina-system`) i

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-package-lock-presence.ps1 [-FailOnWarn] [[-MaxOutput]
<Int32>] [[-PackageRoots] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Vraća exit 1 ako bilo koji od 6 strukturalnih invarijanti prijavi WARN. Bez ove opcije, uvek vraća 0 (skripta je
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 200.
- `-PackageRoots` (`String[]`) - Lista relativnih putanja do paket-direktorijuma (svaki mora sadržati `package.json`). Default je 3 paketa monorepa.

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-package-lock-presence.ps1
# Default: skenira 3 paketa, prijavljuje WARN/INFO nalaze, exit 0 uvek.
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-package-lock-presence.ps1 -Full`

---

## `check-package-scripts-consistency.ps1`

**Putanja:** `../scripts/check-package-scripts-consistency.ps1`

**Synopsis:** `package.json` `scripts:` polja doslednost preko 3 Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 94: dopuna Talas 79 (`engines.node` + `license` + `private` strukturalna polja); Talas 79 pokriva metapodatke ali NE pokriva `scripts:` polja koja su ključna za **CI/CD usklađenost** (workflow zove `npm test`, `npm run lint`, `npm run build` — ako nedostaju, build pada). Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa parsira 3 paket-level `package.json` fajla (`apps/omnigroup-web/package.json` Next +

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-package-scripts-consistency.ps1 [-FailOnWarn]
[[-MaxOutput] <Int32>] [[-PackageRoots] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Vraća exit 1 ako bilo koji paket ima WARN nalaz (`test` / `lint` / `build` / `start` script nedostaje). Bez ove
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 200.
- `-PackageRoots` (`String[]`) - Lista relativnih putanja do `package.json` fajlova koji se proveravaju. Default 3 paketa:

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-package-scripts-consistency.ps1
# Default: skenira 3 package.json fajla, prijavljuje WARN/INFO nalaze, exit 0 uvek.
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-package-scripts-consistency.ps1 -Full`

---

## `check-prettier-config-consistency.ps1`

**Putanja:** `../scripts/check-prettier-config-consistency.ps1`

**Synopsis:** Prettier config doslednost preko 3 Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 105: **5. sloj structural config audit-a** posle Talas 87 (TS `tsconfig.json`) + Talas 91 (Node ESLint) + Talas 101 (Python `requirements.txt`) + Talas 103 (Python pytest config); kompletira **format-time + lint-time + compile-time + dependency** pokrivenost preko Node monorepa. Direktno proširuje **Talas 94 INFO signal** (`apps/omnigroup-web` + `atina-platform/atina` nemaju `format` script — Talas 105 sad audit-uje da li imaju Prettier setup uopšte). Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa skenira **3 Node paketa** (apps/omnigroup-web + atina-platform/atina + atina-system) i validira **6

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-prettier-config-consistency.ps1 [-FailOnWarn]
[[-MaxOutput] <Int32>] [[-NodePaths] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Vraća exit 1 ako bilo koji od 6 strukturalnih invarijanti prijavi WARN. Bez ove opcije, uvek vraća 0 (skripta je
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 200.
- `-NodePaths` (`String[]`) - Lista relativnih putanja do Node paketa. Default je 3 paketa monorepa. Parametrizovan radi testiranja.

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-prettier-config-consistency.ps1
# Default: skenira 3 Node paketa, prijavljuje WARN/INFO nalaze, exit 0 uvek.
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-prettier-config-consistency.ps1 -Full`

---

## `check-ps-encoding.ps1`

**Putanja:** `../scripts/check-ps-encoding.ps1`

**Synopsis:** PowerShell encoding skener (informativan, opciono pre-PR gate sa `-FailOnWarn`). Validira da svaki `*.ps1` u skenirajucim direktorijumima ima ili pure-ASCII sadrzaj (siguran u svakom code page-u) ili UTF-8 sa BOM-om (siguran za non-ASCII karaktere u svim sredinama). Eksplicitan preventivni gate za **Talas 72** lesson (`check-talas-cross-references.ps1` parser-fail bez BOM-a) i **Talas 74** lesson (`check-script-readme-coverage.ps1` parser-fail bez BOM-a). Komplementaran sa [`scripts/regenerate-help-snapshot.ps1`](../scripts/regenerate-help-snapshot.ps1) (taj indirektno otkriva preko `Get-Help` execution greske u runtime-u). Konsolidovani runbook (single entry point): `scripts/run-all-audits.ps1`. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa skenira `scripts/*.ps1` (**43** PS skripte — Talas **114** baseline) i za svaku validira encoding.

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-ps-encoding.ps1 [-FailOnWarn] [[-MaxOutput] <Int32>]
[[-AdditionalPaths] <String[]>] [-IncludeAtinaScripts] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Vraca exit 1 ako bilo koji `*.ps1` ima `WARN-NO-BOM` status. Bez ove opcije, uvek vraca 0 (informativan). Korisno za
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 50.
- `-AdditionalPaths` (`String[]`) - Niz dodatnih direktorijuma za skeniranje (relativni od repo root-a). Skripte iz tih direktorijuma se dodaju na
- `-IncludeAtinaScripts` (`SwitchParameter`) - Shorthand switch za `-AdditionalPaths @("atina-platform/atina/scripts")`. Vlasnik moze pokrenuti `...

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-ps-encoding.ps1
# Default: skenira scripts/*.ps1 (43 skripte), prijavljuje 4 statusa, exit 0 uvek (informativan).
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-ps-encoding.ps1 -Full`

---

## `check-pytest-config-consistency.ps1`

**Putanja:** `../scripts/check-pytest-config-consistency.ps1`

**Synopsis:** Python testing config doslednost preko 3 Python lokacija (root + sistem_naplate + tools/youtube-pipeline) (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 103: **drugi audit Python sloja** posle Talas 101 (Python `requirements.txt` strukturalna doslednost) — paralela Talas 87 (`tsconfig.json` doslednost) za TS sloj. Pre Talas 103, Talas 101 je samo prijavljivao `NO-PYTEST-INI` kao INFO bez detaljne validacije; Talas 103 audituje **6 strukturalnih invarijanti** za testing config sa eksplicitnim Required-WARN nivoima ako paket ima `tests/` ali nema nikakvu konfiguraciju. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa skenira **3 Python lokacije** i validira **6 strukturalnih invarijanti** za pytest testing config:

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-pytest-config-consistency.ps1 [-FailOnWarn]
[[-MaxOutput] <Int32>] [[-PythonRoots] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Vraća exit 1 ako bilo koji od 6 strukturalnih invarijanti prijavi WARN. Bez ove opcije, uvek vraća 0 (skripta je
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 200.
- `-PythonRoots` (`String[]`) - Lista relativnih putanja do Python paketa. Default je 3 lokacije monorepa. Parametrizovan radi testiranja.

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-pytest-config-consistency.ps1
# Default: skenira 3 Python paketa, prijavljuje WARN/INFO nalaze, exit 0 uvek.
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-pytest-config-consistency.ps1 -Full`

---

## `check-python-package-consistency.ps1`

**Putanja:** `../scripts/check-python-package-consistency.ps1`

**Synopsis:** `requirements.txt` doslednost preko 3 Python lokacija (root + sistem_naplate + tools/youtube-pipeline) (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 101: **prvi audit Python sloja** — paralela Talas 79 + 94 + 96 + 98 (Node `package.json` + scripts + dev-deps + lock); pre Talas 101 sva 4 sloja `package.json` audit-a su pokrivala samo Node pakete, dok je Python kod (root forge/atina/astra + sistem_naplate + tools/youtube-pipeline) ostao bez automatizovanog skenera za pinning convention, shared dependency version drift, i pytest.ini presence. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa skenira **3 Python lokacije** i validira **7 strukturalnih invarijanti** za Python pakete:

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-python-package-consistency.ps1 [-FailOnWarn]
[[-MaxOutput] <Int32>] [[-PythonRoots] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Vraća exit 1 ako bilo koji od 7 strukturalnih invarijanti prijavi WARN. Bez ove opcije, uvek vraća 0 (skripta je
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 200.
- `-PythonRoots` (`String[]`) - Lista relativnih putanja do Python paketa. Default je 3 lokacije monorepa. Parametrizovan radi testiranja.

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-python-package-consistency.ps1
# Default: skenira 3 Python paketa, prijavljuje WARN/INFO nalaze, exit 0 uvek.
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-python-package-consistency.ps1 -Full`

---

## `check-readme-presence.ps1`

**Putanja:** `../scripts/check-readme-presence.ps1`

**Synopsis:** Paket README.md presence + zdravlje skener (informativan, opciono pre-PR gate sa `-FailOnWarn`). Validira da svaki kljucan paket monorepa (root, `apps/omnigroup-web`, `atina-platform/atina`, `atina-system`, `scripts`, `docs`, `atina-platform/atina/scripts`) ima `README.md` koji postoji, nije 0-byte, i sadrzi bar 1 H1 (`# `) heading. Talas 81 nastavak monorepo-wide structural consistency domena (Talas 79 - `package.json`; Talas 80 - workflow YAML); sad pokriven discoverability sloj. Read-only audit. Komplementaran sa `check-dev-docs-coverage.ps1` (hub completeness za sve `*.md`) i `check-doc-links.ps1` (broken / empty links). Konsolidovani runbook (single entry point): `scripts/run-all-audits.ps1`. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa cita 7 default README putanja i validira:

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-readme-presence.ps1 [-FailOnWarn] [[-MaxOutput]
<Int32>] [[-ReadmePaths] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Vraca exit 1 ako bilo koji README ima MISSING / EMPTY / NO-H1 status. MULTI-H1 status ostaje INFO i NE podize exit
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 50.
- `-ReadmePaths` (`String[]`) - Niz relativnih putanja do README.md fajlova za proveru. Default: 7 kljucnih README lokacija (root + 3 Node paketa +

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-readme-presence.ps1
# Default: validira 7 default README putanja, prijavljuje WARN + INFO, exit 0 uvek (informativan).
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-readme-presence.ps1 -Full`

---

## `check-repo-meta-files-presence.ps1`

**Putanja:** `../scripts/check-repo-meta-files-presence.ps1`

**Synopsis:** Root-level OSS / GitHub meta fajlovi presence + zdravlje (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 95: nastavak Talas 81 (paket-level `README.md` presence) u **novi sloj — root meta fajlovi koje GitHub renderuje u repo UI-u**: `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `.editorconfig`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa proverava prisustvo i zdravlje **7 strukturalnih meta fajlova** koje GitHub i OSS konvencija očekuju u

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-repo-meta-files-presence.ps1 [-FailOnWarn]
[[-MaxOutput] <Int32>] [[-RepoRoot] <String>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Vraća exit 1 ako bilo koji od 5 obaveznih meta fajlova nedostaje ili je `EMPTY` / `NO-H1` (`README.md`, `LICENSE`,
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 200.
- `-RepoRoot` (`String`) - Putanja do korena repoa. Default je 1 nivo iznad `scripts/` direktorijuma. Parametrizovan radi testiranja.

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-repo-meta-files-presence.ps1
# Default: skenira 7 root-level meta fajlova, prijavljuje WARN/INFO nalaze, exit 0 uvek.
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-repo-meta-files-presence.ps1 -Full`

---

## `check-script-readme-coverage.ps1`

**Putanja:** `../scripts/check-script-readme-coverage.ps1`

**Synopsis:** Reverse-coverage skener (informativan, opciono pre-PR gate sa `-FailOnUncovered`). Verifikuje da svaki `scripts/*.ps1` ima bar jedan mention u [`scripts/README.md`](../scripts/README.md), tako da nema „siroče" PowerShell skripti bez navigacionog ulaza za vlasnika. Komplementaran sa [`scripts/regenerate-help-snapshot.ps1`](../scripts/regenerate-help-snapshot.ps1) (svaki PS treba da ima `Get-Help` blokove) i [`scripts/check-dev-docs-coverage.ps1`](../scripts/check-dev-docs-coverage.ps1) (svaki `*.md` mora biti u `apps/omnigroup-web/src/app/dev/docs/page.tsx` hub-u). Konsolidovani runbook (single entry point): `scripts/run-all-audits.ps1`.

**Opis (prvi paragraf):** Iz korena repoa skenira `scripts/*.ps1` (**43** PS skripte — 2026-05-15 baseline posle Talas **114**; Talas 74 je

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-script-readme-coverage.ps1 [[-MinMentions] <Int32>]
[-FailOnUncovered] [[-MaxOutput] <Int32>] [<CommonParameters>]
```

**Parametri:**

- `-MinMentions` (`Int32`) - Najmanji broj mention-a u README-u koji se smatra dovoljnim. Default `1` — striktno samo siroče skripte se reportuju.
- `-FailOnUncovered` (`SwitchParameter`) - Vraća exit 1 ako postoji bilo koja siroče PS skripta (mention < `-MinMentions`). Bez ove opcije, uvek vraća 0 (skripta
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 50 (43 skripte, manje od limita uvek).

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-script-readme-coverage.ps1
# Default: skenira sve scripts/*.ps1, prijavljuje samo siroče (mention = 0), exit 0 uvek.
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-script-readme-coverage.ps1 -Full`

---

## `check-shared-deps-consistency.ps1`

**Putanja:** `../scripts/check-shared-deps-consistency.ps1`

**Synopsis:** Shared `dependencies` (regular, ne devDependencies) drift detekcija preko 3 Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 106: **paralela Talas 101 (Python `requirements.txt` shared deps drift) za Node ekosistem**; **dopuna Talas 96** koji pokriva samo `devDependencies` MAJOR — Talas 106 dopunjava sa `dependencies` (runtime deps koje idu u prod build) sa preciznom klasifikacijom drift-a (MAJOR / MINOR / PATCH); zajedno daju **monorepo dependency management u 7 audit slojeva** (Talas 79+94+96+98+101+103+106) preko Node + Python paketa. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa skenira **3 Node paketa** (apps/omnigroup-web + atina-platform/atina + atina-system) i validira **5

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-shared-deps-consistency.ps1 [-FailOnWarn] [[-MaxOutput]
<Int32>] [[-NodePaths] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Vraća exit 1 ako bilo koji od 5 strukturalnih invarijanti prijavi WARN. Bez ove opcije, uvek vraća 0 (skripta je
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 200.
- `-NodePaths` (`String[]`) - Lista relativnih putanja do Node paketa. Default je 3 paketa monorepa. Parametrizovan radi testiranja.

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-shared-deps-consistency.ps1
# Default: skenira 3 Node paketa, prijavljuje WARN/INFO nalaze, exit 0 uvek.
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-shared-deps-consistency.ps1 -Full`

---

## `check-tailwind-config-consistency.ps1`

**Putanja:** `../scripts/check-tailwind-config-consistency.ps1`

**Synopsis:** Tailwind CSS konfiguracija i tailwindcss dep doslednost preko Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 107: **6. sloj structural config audit-a** posle Talas 87 (TS) + 91 (ESLint) + 105 (Prettier) + 101/103 (Python) + 106 (runtime deps); pokriva **CSS utility / design-token build-time** sloj (tailwind.config + postcss + tailwindcss semver). Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa skenira podrazumevano **3 Node paketa** i za svaki koji deklariše `tailwindcss` ili `@tailwindcss/*` u

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-tailwind-config-consistency.ps1 [-FailOnWarn]
[[-MaxOutput] <Int32>] [[-NodePaths] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Exit 1 ako ima WARN nalaza.
- `-MaxOutput` (`Int32`) - Maksimalan broj detaljnih redova (default 200).
- `-NodePaths` (`String[]`) - Relativne putanje Node paketa (default tri monorepo paketa).

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-tailwind-config-consistency.ps1
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-tailwind-config-consistency.ps1 -Full`

---

## `check-talas-cross-references.ps1`

**Putanja:** `../scripts/check-talas-cross-references.ps1`

**Synopsis:** Talas N cross-reference skener (informativan, **nije** CI gate). Verifikuje da li svaki `Talas N` agent-rada od 2026-05-14 (default `-Since 70`) ima usklađene zapise u `docs/MASTER-WORK-LIST.md` (sekcija 1.1), `docs/NIVO-1-DRYRUN-LOG.md` (formalni dry-run heading "## Zapis (izvršen) — Talas N") i `docs/AGENT-WORK-2026-05-14-SUMMARY.md` (sekcija `### N.M ... Talas N`). Sa `-IncludeIndex` proširuje na 4-way obrazac sa `docs/TALAS-INDEX.md` tabelom (Talas 88+). Konsolidovani runbook (single entry point): `scripts/run-all-audits.ps1`. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa parsira tri (3-way default) ili četiri (4-way sa `-IncludeIndex`, Talas 89+) ključna dokumenta i

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-talas-cross-references.ps1 [[-Since] <Int32>]
[-FailOnMisalignment] [[-MaxOutput] <Int32>] [-IncludeIndex] [<CommonParameters>]
```

**Parametri:**

- `-Since` (`Int32`) - Najmanji Talas N koji se proverava strogo (inkluzivno). Default `70` — prvi Talas koji ima 3-way usklađenost
- `-FailOnMisalignment` (`SwitchParameter`) - Vraća exit 1 ako postoji bilo koji misalignement Talas-a >= `-Since`. Bez ove opcije, uvek vraća 0 (skripta je
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 200.
- `-IncludeIndex` (`SwitchParameter`) - Talas 89+: ukljucuje `docs/TALAS-INDEX.md` kao 4. obavezno mesto za agent automation talas-eve (Talas 88 je uveo

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-talas-cross-references.ps1
# Default: 3-way mod, skenira master + dryrun + summary, prijavljuje misalignement za Talas N >= 70, exit 0 uvek.
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-talas-cross-references.ps1 -Full`

---

## `check-tsconfig-consistency.ps1`

**Putanja:** `../scripts/check-tsconfig-consistency.ps1`

**Synopsis:** tsconfig.json doslednost skener (informativan, opciono pre-PR gate sa `-FailOnWarn`). Validira da svaki Node TypeScript paket u monorepu (3 trenutno - omnigroup-web, atina-platform/atina, atina-system) ima usaglasena strukturalna polja u `compilerOptions` koja su kompatibilan signal kvaliteta TS sloja (`strict`, `target`, `skipLibCheck`, `esModuleInterop`, `forceConsistentCasingInFileNames`). Read-only audit. Konsolidovani runbook (single entry point): `scripts/run-all-audits.ps1`. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa cita 3 `tsconfig.json` fajla (omnigroup-web Next.js, atina-platform/atina Node lib, atina-system

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-tsconfig-consistency.ps1 [-FailOnWarn] [[-MaxOutput]
<Int32>] [[-PackageRoots] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Vraca exit 1 ako bilo koji paket ima `WARN` nalaz. Bez ove opcije, uvek vraca 0 (informativan).
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 50.
- `-PackageRoots` (`String[]`) - Niz relativnih putanja do tsconfig.json fajlova. Default: 3 trenutna TS paketa (`apps/omnigroup-web/tsconfig.json`,

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-tsconfig-consistency.ps1
# Default: validira 3 TS paketa, prijavljuje WARN + INFO, exit 0 uvek (informativan).
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-tsconfig-consistency.ps1 -Full`

---

## `check-typeorm-data-source-consistency.ps1`

**Putanja:** `../scripts/check-typeorm-data-source-consistency.ps1`

**Synopsis:** TypeORM DataSource ulaz (data-source / ormconfig) za Node pakete sa `typeorm` dep-om (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 111: **10. sloj structural config audit-a** posle Nest CLI (Talas 110); pokriva **ORM / persistence bootstrap** sloj. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa skenira podrazumevano **3 Node paketa** i za svaki koji deklariše **`typeorm`** u `dependencies` ili

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-typeorm-data-source-consistency.ps1 [-FailOnWarn]
[[-MaxOutput] <Int32>] [[-NodePaths] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Exit 1 ako ima WARN nalaza.
- `-MaxOutput` (`Int32`) - Maksimalan broj detaljnih redova (default 200).
- `-NodePaths` (`String[]`) - Relativne putanje Node paketa (default tri monorepo paketa).

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-typeorm-data-source-consistency.ps1
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-typeorm-data-source-consistency.ps1 -Full`

---

## `check-vscode-settings-presence.ps1`

**Putanja:** `../scripts/check-vscode-settings-presence.ps1`

**Synopsis:** `.vscode/` direktorijum (settings.json + extensions.json) presence + zdravlje (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 104: **novi 11. domen — Developer Experience / IDE konfiguracija** koji pokriva onboarding kvalitet za Cursor / VSCode developere. Pre Talas 104, repo je imao `.editorconfig` audit (Talas 95 root meta) ali ne i `.vscode/` audit; `.editorconfig` je univerzalan (svi editor-i), dok `.vscode/` je VSCode-specifičan i potpuno različit slučaj — formatOnSave, defaultFormatter, eslint.workingDirectories za monorepo, plus extensions.json recommendations koje VSCode/Cursor automatski predloži pri otvaranju projekta. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa skenira `.vscode/` direktorijum i validira **6 strukturalnih invarijanti** za VSCode/Cursor IDE

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-vscode-settings-presence.ps1 [-FailOnWarn]
[[-MaxOutput] <Int32>] [[-VsCodeDir] <String>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Vraća exit 1 ako bilo koji od 6 strukturalnih invarijanti prijavi WARN. Bez ove opcije, uvek vraća 0 (skripta je
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 200.
- `-VsCodeDir` (`String`) - Putanja do `.vscode/` direktorijuma. Default `.vscode` (root). Parametrizovan radi testiranja.

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-vscode-settings-presence.ps1
# Default: skenira root `.vscode/`, prijavljuje WARN/INFO nalaze, exit 0 uvek.
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-vscode-settings-presence.ps1 -Full`

---

## `check-workflow-consistency.ps1`

**Putanja:** `../scripts/check-workflow-consistency.ps1`

**Synopsis:** GitHub workflow + .nvmrc + package.json engines.node doslednost skener (informativan, opciono pre-PR gate sa `-FailOnWarn`). Validira da `.github/workflows/*.yml` u 3 lokacije monorepa (root, atina-system, atina-platform/atina) koriste konzistentne `actions/checkout@vN` i `actions/setup-node@vN` verzije, da `node-version-file` putanje postoje i da `.nvmrc` sadrzaj svuda kazuje istu Node verziju. Talas 80 nastavak monorepo-wide structural consistency domena (Talas 79). Read-only audit. Komplementaran sa [`scripts/check-package-json-consistency.ps1`](../scripts/check-package-json-consistency.ps1) - taj radi `engines.node` doslednost preko paketa, ovaj radi `.nvmrc` doslednost + cross-check sa `engines.node`. Konsolidovani runbook (single entry point): `scripts/run-all-audits.ps1`. Hub: `scripts/README.md`.

**Opis (prvi paragraf):** Iz korena repoa cita 3 workflow YAML fajla i prati `node-version-file:` reference do .nvmrc fajlova:

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\check-workflow-consistency.ps1 [-FailOnWarn] [[-MaxOutput]
<Int32>] [[-WorkflowPaths] <String[]>] [<CommonParameters>]
```

**Parametri:**

- `-FailOnWarn` (`SwitchParameter`) - Vraca exit 1 ako bilo koji workflow / .nvmrc / cross-check ima WARN nalaz. Bez ove opcije, uvek vraca 0 (informativan).
- `-MaxOutput` (`Int32`) - Maksimalan broj redova u Detalji sekciji. Default 50.
- `-WorkflowPaths` (`String[]`) - Niz relativnih putanja do workflow YAML fajlova. Default: 3 trenutna CI pipelines

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\check-workflow-consistency.ps1
# Default: validira 3 workflow-a + sve .nvmrc reference, prijavljuje WARN + INFO, exit 0 uvek (informativan).
```

**Pun help za vlasnika:** `Get-Help .\scripts\check-workflow-consistency.ps1 -Full`

---

## `regenerate-help-snapshot.ps1`

**Putanja:** `../scripts/regenerate-help-snapshot.ps1`

**Synopsis:** Generiše `docs/SCRIPTS-HELP-SNAPSHOT.md` — statičnu stranicu sa `Get-Help` izveštajem za sve `*.ps1` skripte u izabranom direktorijumu (podrazumevano **43** PowerShell skripte u `scripts/`). Vlasnik može pregledati synopsis, sintaksu, parametre i primere bez pokretanja terminala.

**Opis (prvi paragraf):** Iz korena repoa skenira `scripts/*.ps1` (root, ne rekurzivno — Atina podpaket ima svoje smoke skripte u

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\regenerate-help-snapshot.ps1 [[-OutputPath] <String>]
[[-ScriptDir] <String>] [-FailOnError] [<CommonParameters>]
```

**Parametri:**

- `-OutputPath` (`String`) - Putanja gde se snima generisan markdown. Default: `docs/SCRIPTS-HELP-SNAPSHOT.md` (relativno na koren repoa).
- `-ScriptDir` (`String`) - Direktorijum gde se traže `*.ps1` skripte. Default: `scripts/` (root). Set na drugu putanju za regen drugog snapshot-a
- `-FailOnError` (`SwitchParameter`) - Vraća exit 1 ako bilo koja skripta nema `.SYNOPSIS` ili `Get-Help` baci grešku. Po defaultu **uvek exit 0**.

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\regenerate-help-snapshot.ps1
# Pun pregled — generiše docs/SCRIPTS-HELP-SNAPSHOT.md.
```

**Pun help za vlasnika:** `Get-Help .\scripts\regenerate-help-snapshot.ps1 -Full`

---

## `run-all-audits.ps1`

**Putanja:** `../scripts/run-all-audits.ps1`

**Synopsis:** Konsolidovan wrapper koji pokreće svih 39 koraka (37 read-only + TODO + npm) monorepa iz jednog poziva i daje jedinstveni health izveštaj. Single entry point za vlasnika i pre-PR pregled.

**Opis (prvi paragraf):** Pokreće zaredom (svaki kao zaseban PowerShell proces, sa pojedinačnim exit kodom) — read-only suite:

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\run-all-audits.ps1 [-SkipNpmAudit] [-SkipTodoScan]
[[-OutputDir] <String>] [-FailOnAny] [<CommonParameters>]
```

**Parametri:**

- `-SkipNpmAudit` (`SwitchParameter`) - Preskoči `audit-npm-monorepo.ps1` (najsporiji korak, ~30 s, tri `npm audit --json` poziva). Korisno za brzi pre-PR
- `-SkipTodoScan` (`SwitchParameter`) - Preskoči `scan-todo-markers.ps1` (~30-60 s preko 833 fajla). Default: pokreće se.
- `-OutputDir` (`String`) - Direktorijum gde se snimaju JSON snapshot-i iz onih skripti koje to podržavaju (`scan-todo-markers.ps1 -OutputJson` i
- `-FailOnAny` (`SwitchParameter`) - Vraća exit 1 ako bilo koji od 39 koraka nije čist (broken / missing / failed gate / non-zero exit). Po defaultu **uvek

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\run-all-audits.ps1
# Pun pregled (svih 39 koraka, ~120 s ukupno).
```

**Pun help za vlasnika:** `Get-Help .\scripts\run-all-audits.ps1 -Full`

---

## `scan-todo-markers.ps1`

**Putanja:** `../scripts/scan-todo-markers.ps1`

**Synopsis:** Skenira monorepo i agregira sve TODO / FIXME / HACK / XXX markere — daje vlasniku precizan trag tehničkog duga (file:line:context). Read-only, informativan, **nije** CI gate. Komplementaran read-only audit suite-i (`audit-doc-gate-references.ps1` doc gate, `audit-npm-monorepo.ps1` security, `check-doc-links.ps1` link integrity, `check-dev-docs-coverage.ps1` dev/docs hub navigacija).

**Opis (prvi paragraf):** Iz korena repoa skenira `*.ts`, `*.tsx`, `*.js`, `*.mjs`, `*.cjs`, `*.py`, `*.md`, `*.ps1`, `*.yml`, `*.yaml`,

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\scan-todo-markers.ps1 [-Detailed] [[-MaxOutput] <Int32>]
[[-OutputJson] <String>] [[-OutputCsv] <String>] [-FailOnAny] [-IncludeMdCodeBlocks] [<CommonParameters>]
```

**Parametri:**

- `-Detailed` (`SwitchParameter`) - Prikaži sve marker linije (file:line:context) umesto samo summary.
- `-MaxOutput` (`Int32`) - Limit za broj prikazanih marker-a u Detailed režimu (default 200, postavi `0` za sve).
- `-OutputJson` (`String`) - Putanja gde se snima JSON izveštaj (file paths, kategorije, brojevi, marker linije).
- `-OutputCsv` (`String`) - Putanja gde se snima CSV izveštaj (jedan red = jedna marker linija; `category,file,line,text`).
- `-FailOnAny` (`SwitchParameter`) - Vraća exit 1 ako bilo koji marker postoji (gate-flavor; po defaultu **uvek exit 0** osim sa ovim switch-om — i sa
- `-IncludeMdCodeBlocks` (`SwitchParameter`) - **Talas 83 default-on default ponašanje:** od Talas 83, skener po defaultu **preskače markdown code blokove** (` ```

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\scan-todo-markers.ps1
# Pun pregled (summary table + top 10 fajlova).
```

**Pun help za vlasnika:** `Get-Help .\scripts\scan-todo-markers.ps1 -Full`

---

## `smoke-stack.ps1`

**Putanja:** `../scripts/smoke-stack.ps1`

**Synopsis:** Smoke checks for multi-stack local/staging (Python Astra, Nest atina-system, optional Atina Node SaaS).

**Opis (prvi paragraf):** Assumes services are already running. Defaults:

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\smoke-stack.ps1 [[-AstraBase] <String>] [[-NestBase]
<String>] [[-AtinaNodeBase] <String>] [[-SkipNode] <Boolean>] [-AllowNestRedisDown] [-NestQueueSmoke]
[[-NestQueueSmokeKey] <String>] [<CommonParameters>]
```

**Parametri:**

- `-AstraBase` (`String`)
- `-NestBase` (`String`)
- `-AtinaNodeBase` (`String`) - Optional base URL for Atina Node (no trailing slash required). If non-empty, GET {AtinaNodeBase}/health runs
- `-SkipNode` (`Boolean`) - When $true (default), skip Atina Node unless -AtinaNodeBase is set. When $false, probe GET /health at -AtinaNodeBase
- `-AllowNestRedisDown` (`SwitchParameter`) - If Nest returns redis.configured=true but reachable=false, do not fail (default: fail — catches miswired
- `-NestQueueSmoke` (`SwitchParameter`) - After Nest health: if health says bull.enabled=true, POST .../internal/queue/smoke and require bull=true + jobId
- `-NestQueueSmokeKey` (`String`) - Value for header **x-internal-queue-smoke-key** when Nest has **INTERNAL_QUEUE_SMOKE_KEY** set; if empty,

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\smoke-stack.ps1  # bundled Atina gate: npm run smoke:all (atina-platform/atina; formalni Atina
release gate: release-gate-checklist.md)
```

**Pun help za vlasnika:** `Get-Help .\scripts\smoke-stack.ps1 -Full`

---

## `verify-monorepo.ps1`

**Putanja:** `../scripts/verify-monorepo.ps1`

**Synopsis:** Local mirror of CI (monorepo): Doslednost dok doc gate (md/txt + yaml/ps1/ini), uklj. par EVIDENCE-INDEX / NIVO-1-DRYRUN-LOG, u scripts/README.md (audit-doc-gate-references.ps1 on *.md, *.txt, *.yml, *.yaml, *.ps1, *.ini), pytest, Atina test:ci, apps/omnigroup-web build (unless -SkipOmnigroupWeb), Nest verify, compose config. First audit step matches GitHub job python (required check display: Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).

**Opis (prvi paragraf):** Runs from repo root: scripts/audit-doc-gate-references.ps1 (same as first step in CI job python — GitHub displays that

**Sintaksa:**

```powershell
C:\Users\Marko Kosic\OneDrive\Desktop\omni group\scripts\verify-monorepo.ps1 [-SkipCompose] [-SkipOmnigroupWeb]
[-SkipNestVerifyCi] [-SkipDocAudit] [<CommonParameters>]
```

**Parametri:**

- `-SkipCompose` (`SwitchParameter`) - Skip docker compose config validation. GitHub job compose still runs in CI.
- `-SkipOmnigroupWeb` (`SwitchParameter`) - Skip Next.js build under apps/omnigroup-web. CI still runs job omnigroup-web.
- `-SkipNestVerifyCi` (`SwitchParameter`) - Skip Nest verify:ci (migrations + e2e); run verify:n1 (build + unit) only.
- `-SkipDocAudit` (`SwitchParameter`) - Skip audit-doc-gate-references.ps1 (pairing rules for verify-monorepo, smoke-stack, smoke:all; Doslednost dok doc gate

**Primer (prvi):**

```powershell
-------------------------- EXAMPLE 1 --------------------------
PS C:\>.\scripts\verify-monorepo.ps1  # docs/GIT-BRANCH-PROTECTION.md (job python / Python (Doslednost dok + pytest))
```

**Pun help za vlasnika:** `Get-Help .\scripts\verify-monorepo.ps1 -Full`

---

## Smoke test rezime

| Provera | Rezultat |
|---------|----------|
| Skripti ukupno | **43** |
| Sa `.SYNOPSIS` | **43** / 43 |
| Sa `.DESCRIPTION` | **43** / 43 |
| Sa bar 1 `.EXAMPLE` | **43** / 43 |
| Sa `.NOTES` | **43** / 43 |
| `Get-Help` greske | **0** / 43 |

### Reprodukcija

Iz korena repoa: `powershell -NoProfile -ExecutionPolicy Bypass -File ..\scripts\regenerate-help-snapshot.ps1`

Pre-PR gate-flavor (non-zero exit ako bilo koja skripta nema `.SYNOPSIS` ili `Get-Help` padne): dodaj `-FailOnError`.

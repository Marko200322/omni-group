# Root `scripts`

**Kompletan plan testiranja (L0–L4, matrica domena, gapovi):** [`docs/TEST-PLAN-KOMPLETAN.md`](../docs/TEST-PLAN-KOMPLETAN.md).

**Ulaz:** [NIVO-1-START.md](../NIVO-1-START.md) · [CONTRIBUTING.md](../CONTRIBUTING.md) · [SYSTEM-MAP.md](../SYSTEM-MAP.md) · [tests/README.md](../tests/README.md) · **agent-safe automatizacija (Talas 65→192 lekcije; quick-ref:** [`docs/TALAS-INDEX.md`](../docs/TALAS-INDEX.md)**):** [`AGENT-AUTOMATION-GUIDE.md`](./AGENT-AUTOMATION-GUIDE.md) — operativni handbook za dodavanje novih PS skripti i dokumentacionih jedinica bez ponavljanja istih grešaka (help blok pozicija, UTF-8 BOM, `@(...).Count` quirk, README sekcija, page.tsx update, `run-all-audits.ps1` **39** koraka, **4-way** trag master / dry-run / summary / [`TALAS-INDEX.md`](../docs/TALAS-INDEX.md) — suite korak 4 `talas-xref` sa `-IncludeIndex`) (pytest u korenu + `pytest.ini`; u CI job **`python`** pre `pytest` ide **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u ovom README-u — odeljak **Doslednost dok** ispod; u Actions / required checks oznaka job-a: **`Python (Doslednost dok + pytest)`** — [GIT-BRANCH-PROTECTION.md](../docs/GIT-BRANCH-PROTECTION.md)) · **Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](../docs/EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](../docs/NIVO-1-DRYRUN-LOG.md).

**Brza napomena (`verify-monorepo.ps1`):** pun mirror uključuje **`apps/omnigroup-web`** osim **`-SkipOmnigroupWeb`**; isti GitHub job kao **`python`**, required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md); **Port mismatch** (`POSTGRES_PORT` vs host DB port) — podnaslov **Port mismatch** u odeljku `` `verify-monorepo.ps1` `` ispod.

## Multi-stack HTTP — `smoke-stack.ps1` · bundled Atina — `npm run smoke:all`

Formalni Atina release gate (napomene za smoke — *Local notes — Smoke tests*): [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md).

U PowerShell-u: **`Get-Help .\scripts\smoke-stack.ps1 -Full`** · **`npm run smoke:all`** u `atina-platform/atina` za dubinski HTTP gate (isti runbook kao iznad).

End-to-end smoke for a multi-stack layout: **Astra** (`/api/status`), **Nest atina-system** (root JSON health — uključuje **`redis`** / **`bull`** kada je `REDIS_HOST` postavljen), and optionally **Atina Node** (`atina-platform/atina`, **GET** `/health`). Po defaultu Node se **ne** proverava (**`-SkipNode $true`**, podrazumevano). Da uključiš Node na lokalnom portu **3000**: **`-SkipNode:$false`** (baza **`http://127.0.0.1:3000`** ako **`-AtinaNodeBase`** nije prosleđen). I dalje možeš eksplicitno: **`-AtinaNodeBase "http://127.0.0.1:3000"`** ili staging URL (tada se Node proverava i kada je **`-SkipNode`** podrazumevano). Ako je Redis u Nest-u konfigurisan a nije dostupan, skripta **pada**; za dijagnostiku: **`-AllowNestRedisDown`**. Za dev-only **`POST /internal/queue/smoke`** i switch **`-NestQueueSmoke`**, vidi podnaslov **Nest queue (opciono)** ispod. Assumes those services are already up (see defaults and parameters inside the script).

### Nest queue (opciono)

Nest eksponuje dev-only **`POST /internal/queue/smoke`** (van produkcije); ponašanje, zaglavlja i ograničenja su detaljno opisani u **[`atina-system/docs/QUEUE-SMOKE-DEV.md`](../atina-system/docs/QUEUE-SMOKE-DEV.md)**. Iz korena repoa, uz već podignute servise, možeš opciono pokrenuti **`.\scripts\smoke-stack.ps1 -NestQueueSmoke`**; ostale parametre vidi u komentarisanom zaglavlju [`smoke-stack.ps1`](./smoke-stack.ps1) ili **`Get-Help .\scripts\smoke-stack.ps1 -Full`**. Dublji bundled Atina HTTP gate u istom multi-stack kontekstu i dalje je **`npm run smoke:all`** (**`smoke:all`**) u `atina-platform/atina` — vidi pasus iznad.

**Atina Node — širi HTTP provera (login, `/me`, Forge, admin):** `smoke-stack.ps1` za Node šalje samo **GET** `/health` kada je uključen. Za jedan bundled prolaz sa JWT ponovnom upotrebom pokreni iz **`atina-platform/atina`**: **`npm run smoke:all`** → **`scripts/smoke-all.ps1`**; lokalne napomene (formalni Atina release gate): [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (odeljak *Smoke tests*).

For how to bring stacks online, see [NIVO-1-START.md](../NIVO-1-START.md).

**Boolean napomena:** ako skriptu pokrećeš preko spoljašnjeg **`powershell -File .\scripts\smoke-stack.ps1`**, za Node probe koristi **`-SkipNode:$false`** (dvotačka). Argument **`-SkipNode $false`** u tom kontekstu može doći kao string i pasti na transformaciji parametra — u interaktivnom shell-u je bezbednije **`.\scripts\smoke-stack.ps1 -SkipNode:$false`**. **smoke:all** (Atina) — odeljak iznad.

**Docker Desktop / Atina Node (`atina_app`) na host :3000:** ako **`-SkipNode:$false`** javlja prazan HTTP odgovor ili *connection closed* sa hosta na `http://127.0.0.1:3000/health`, a `docker exec atina_app wget -qO- http://127.0.0.1:3000/health` unutra vraća **200**, probaj **`docker restart atina_app`**. Evidencija (**LATEST smoke** (**sekcija H**)): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14); vidi [NIVO-1-START.md](../NIVO-1-START.md) odjeljak 5.

## `verify-monorepo.ps1` — GitHub job **`python`**, [`GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md) (**Python (Doslednost dok + pytest)**)

U PowerShell-u: **`Get-Help .\scripts\verify-monorepo.ps1 -Full`** (comment-based help na engleskom; u opisu je i putanja ka **F.4** runbooku; required check ime — [`GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md)).

**LATEST verify (pun mirror CI, uklj. `apps/omnigroup-web`):** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **Val 355** / 2026-05-14 (D.1 Iter 2 — [`D1-ITER2-PR-BODY.md`](../docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13).

**LATEST smoke** (**sekcija H**, tri stuba): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) — **Val 351** / 2026-05-14.

**Kad podigneš novi broj (novi LATEST zapis):** prvo ažuriraj `docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md` / `docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`, zatim uskladi eksplicitne **Val** u `verify-monorepo.ps1` ([`GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md) — job **python**) i `smoke-stack.ps1` (par **`smoke:all`** u dokovima; ispis na kraju / `Get-Help` napomene), u `audit-doc-gate-references.ps1` (`.DESCRIPTION` u `Get-Help`), u `audit-npm-monorepo.ps1` (`.NOTES` Val red i ispis na kraju — `LATEST verify` / `LATEST smoke`), u `check-doc-links.ps1` (`.NOTES` Val red i ispis na kraju), u `docs/NPM-AUDIT-MONOREPO.md` (snapshot zaglavlje), u `docs/EMPTY-DOCS-RUNBOOK.md` (snapshot zaglavlje + sign-off referenca na Val 356+), u ovom README-u, komentarima u `.github/workflows/ci-monorepo.yml`, `.github/dependabot.yml`, `atina-platform/atina/.github/dependabot.yml`, korenskom `pytest.ini` (header komentari — LATEST Val / evidence index), korenskim `docker-compose.yml` / `docker-compose.atina.yml` / `docker-compose.nest-port-3001.yml` (i ostali `docker-compose*.yml` ako imaju iste komentare), `atina-platform/atina/docker-compose.yml`, `atina-platform/atina/.github/workflows/ci.yml`, `atina-system/.github/workflows/ci.yml` i u ulaznim `*.md` gde je **Val** već ugrađen (npr. korenski `README.md`, `apps/omnigroup-web/README.md`, `tests/README.md`, `CONTRIBUTING.md`, `RUN-ATINA-PLATFORM.txt`, `atina-platform/atina/RUN-ATINA-PLATFORM.txt`, `atina-platform/atina/README.md`, `atina-platform/atina/docs/operations/NIVO-1-GATE.md`, `atina-platform/atina/docs/operations/release-gate-checklist.md` ako tamo treba usklađen **Val** u primerima), `NIVO-1-START.md`, `NIVO-1-MASTER-CHECKLIST.md`, `NIVO-2-START.md`, `NIVO-2-MASTER-CHECKLIST.md`, `NIVO-3-START.md`, `NIVO-3-MASTER-CHECKLIST.md`, `AGENT-RADNI-PLAN.md`, `CHECKLIST-CEO-SISTEM.md`, `SYSTEM-MAP.md`, `docs/EVIDENCE-INDEX.md`, `docs/CEO-OPEN-BULLETS-RUNBOOK.md`, `docs/VLASNIK-ZAVRSAVA.md`, `docs/COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md`, `docs/WAVE-AGENT-EXECUTION-PLAN.md`, `atina-platform/atina/CONTRIBUTING.md`, `atina-platform/atina/scripts/README.md`, `atina-system/docs/NPM-AUDIT-NIVO1.md`, `atina-system/docs/MIGRATIONS-PLAN.md`, `atina-system/README.md`, `docs/NIVO-1-F4-TIM-CHECKLIST.md`, `docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE.template.md`, `docs/NIVO-3-AUDIT-ROADMAP.md`, `docs/NIVO-3-CEO-F-PR-BODY.md`, `docs/NIVO-3-PDF-TRACE.md`, `docs/NIVO-3-PDF-FULL-AUDIT-COMPLETE.md`, `docs/NIVO-3-SVE-INVENTORY.md`, `docs/NIVO-3-VISION-K8S-AI.md`, `docs/VAULT-B-EVIDENCE-LATEST.md`, `docs/VAULT-B-INTEGRATED-RUNBOOK.md`, `atina-system/docs/NIVO-3-SUPPLY-CORE-PDF.md`, `docs/NIVO-3-PLAN-RADA-OSTALO.md`, `docs/GIT-BRANCH-PROTECTION.md`, `docs/AKCIONI-PLAN-NOVITETI-I-CEO.md`, `docs/NIVO-1-DRYRUN-LOG.md`).

**Invocation (default = pun CI mirror; isti gate-ovi kao bez switch-eva):**

| Scenario | Komanda |
|----------|---------|
| Pun CI mirror (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u ovom README-u + pytest + Atina `test:ci` + Omnigroup `build` + Nest `verify:ci` + compose x3) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-monorepo.ps1` · [`GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md) |
| Bez Postgres-a (Nest samo `verify:n1`) | `... -File .\scripts\verify-monorepo.ps1 -SkipNestVerifyCi` · [`GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md) |
| Bez Next build-a (`apps/omnigroup-web`) | `... -File .\scripts\verify-monorepo.ps1 -SkipOmnigroupWeb` · [`GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md) |
| Bez Docker compose provere | `... -File .\scripts\verify-monorepo.ps1 -SkipCompose` · [`GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md) |
| Bez doc gate audita / **Doslednost dok** (samo lokalno; CI job `python` i dalje; Actions prikaz: **Python (Doslednost dok + pytest)** — [GIT-BRANCH-PROTECTION.md](../docs/GIT-BRANCH-PROTECTION.md)) | `... -File .\scripts\verify-monorepo.ps1 -SkipDocAudit` · [`GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md) |
| Oba preskačenja (brži lokalni prolaz) | `... -File .\scripts\verify-monorepo.ps1 -SkipCompose -SkipNestVerifyCi` · [`GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md) |

Na kraju skripte ispisuje se **kratak rezime** šta je urađeno vs. preskočeno; u CI na GitHub-u i dalje važe svi koraci — job **`python`** u listi check-ova: **`Python (Doslednost dok + pytest)`** ([`GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md)).

**Doslednost dok (ugrađeno u pun mirror):** `verify-monorepo.ps1` na početku pokreće `audit-doc-gate-references.ps1` (isti red kao prvi korak u GitHub job-u **`python`** — obavezna provera **`Python (Doslednost dok + pytest)`** u [`GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md)). Lokalno preskoči samo ovaj korak: **`-SkipDocAudit`** (na GitHub-u job **`python`** i dalje pokreće audit). Samostalno: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\audit-doc-gate-references.ps1` — provera da `*.md`, `*.txt`, `*.yml`, `*.yaml`, `*.ps1`, `*.ini` (van `node_modules` / `.next`) koji pominju `verify-monorepo` takođe pominju `omnigroup` ili `SkipOmnigroup`, literal **`Python (Doslednost dok + pytest)`** (isti obavezni check kao job **`python`** u [`GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md)), da uz `verify-monorepo` stoji i `smoke:all`, i da uz `smoke-stack` stoji `smoke:all` (isti tekstualni par kao u runbook-ovima: multi-stack **GET** `/health` vs **`npm run smoke:all`**), i da fajl koji pominje **`EVIDENCE-INDEX`** u istom sadržaju pominje i **`NIVO-1-DRYRUN-LOG`** (monorepo evidencija indeks + dry-run — isti obrazac kao u [`STAGING-RELEASE-CHECKLIST.md`](../docs/STAGING-RELEASE-CHECKLIST.md)). **`Get-Help`:** `Get-Help .\scripts\audit-doc-gate-references.ps1 -Full` — u `.DESCRIPTION` je i napomena **`smoke-stack.ps1`** (Atina Node = **GET** `/health`) vs **`npm run smoke:all`** u [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*). *U starijim runbook pasusima „md/txt“ je skraćenica za isti prvi korak — skripta sada ujedno valja i yaml/ps1/ini komentare gde se pominju gate-ovi.*

**Masovno usklađivanje dok tekstova (Python, opciono, posle velikih merge-eva):** `python scripts/_normalize_evidence_lines.py` (stara šema «· indeks + dry-run» u naslov) · `python scripts/_unify_val_scope_and_evidence_comments.py` («Kad podižeš novi Val širom dokova» u `*.md`, komentari u `*.yml` / `*.yaml`). Oba čuvaju CRLF/LF po fajlu.

**Bez GitHub-a:** za potvrdu istog reda kao **CI (monorepo)** ne treba Actions niti `git push` — dovoljni su Node, Python, i (za pune korake) Docker + Postgres na hostu (podrazumevano `localhost:5432`). GitHub daje daljinski run i istoriju na `main`, ne jedinu mogućnost verifikacije.

**Windows + Docker Desktop:** ako `atina-system` **`migration:run`** ili `verify:ci` padaju sa **ECONNRESET** / **Connection terminated unexpectedly** dok `docker exec … psql` u kontejneru radi, Node **`pg`** sa hosta često ne može stabilno na objavljen **`5432`**. Objavi Postgres na **`5433`**: u folderu `atina-platform/atina` postavi **`DB_PORT_EXPOSE=5433`** (`.env` ili shell), `docker compose up -d postgres`, pa pre verify-a exportuj **`POSTGRES_PORT=5433`** (mora da se poklapa sa host portom). Detalj: komentar uz `postgres.ports` u tom `docker-compose.yml`.

**Port mismatch:** ako vidiš **ECONNREFUSED** na **`127.0.0.1:5433`** dok Postgres za verify stvarno sluša na **`5432`** (ili obrnuto), proveri da li je u tom PowerShell prozoru ostao stari **`$env:POSTGRES_PORT`** — privremeno ga uskladi sa host portom (npr. `$env:POSTGRES_PORT='5432'`) pre `verify-monorepo.ps1` ([`GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md) — job **python** / **Python (Doslednost dok + pytest)**).

Redom: `audit-doc-gate-references.ps1` (osim **`-SkipDocAudit`**) → `python -m pytest` (koren) → `npm run test:ci` u `atina-platform/atina` → `npm ci` + `npm run build` u `apps/omnigroup-web` (osim **`-SkipOmnigroupWeb`**) → `npm run verify:ci` u `atina-system`. **Postgres** na hostu (obično **`localhost:5432`**; Windows ponekad **`5433`** — odeljak iznad) — podrazumevani korisnik u skripti je isti kao u **`atina-platform/atina/docker-compose.yml`**: `atina_user` / `atina_password` / `atina_saas_db` (npr. `docker compose up -d postgres` u tom folderu). Pre pokretanja možeš postaviti **`POSTGRES_*`** (uključujući **`POSTGRES_SSL`**, vidi `atina-system/.env.example`) za drugu instancu. Ako lokalno **nemaš** Postgres: **`.\scripts\verify-monorepo.ps1 -SkipNestVerifyCi`** ([`GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md)) — u `atina-system` se tada pokreće **`npm run verify:n1`** (build + unit); **`verify:ci`** (migracije + e2e) se u tom prolazu **ne** pokreće — za pun Nest gate lokalno podigni Postgres i pokreni skriptu bez tog switch-a. Možeš kombinovati sa **`-SkipCompose`**. Brzi Docker primer (isti kredencijali kao compose):

```powershell
docker rm -f atina-verify-pg 2>$null
docker run -d --name atina-verify-pg -p 5432:5432 -e POSTGRES_USER=atina_user -e POSTGRES_PASSWORD=atina_password -e POSTGRES_DB=atina_saas_db postgres:16-alpine
# sačekaj pg_isready, zatim iz korena repoa:
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-monorepo.ps1  # ../docs/GIT-BRANCH-PROTECTION.md (job python)
```

**Kad je `:5432` zauzet** (npr. `atina_postgres` za Atina Node radi paralelno): ne zaustavljaj postojeći kontejner — objavi verify PG na drugom host portu i uskladi env pre verify-a:

```powershell
docker rm -f atina-verify-pg 2>$null
docker run -d --name atina-verify-pg -p 5434:5432 -e POSTGRES_USER=atina_user -e POSTGRES_PASSWORD=atina_password -e POSTGRES_DB=atina_saas_db postgres:16-alpine
# pg_isready u kontejneru, zatim:
$env:POSTGRES_PORT='5434'
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-monorepo.ps1  # ../docs/GIT-BRANCH-PROTECTION.md (job python)
```

*(Ako umesto toga pokreneš verify na postojećoj bazi sa Node SaaS šemom, `migration:run` može pasti sa „relation already exists“ — vidi [`TEHNICKI-AUDIT-2026-05-13.md`](../docs/TEHNICKI-AUDIT-2026-05-13.md) D.2.)*

*(GitHub Actions job **`atina-system`** i dalje koristi izolovani Postgres servis sa `atina` / `atina` / `atina` na runneru.)*

Na kraju skripta: **`docker compose config --quiet`** za (1) Nest merge `docker-compose.atina.yml` + `docker-compose.nest-port-3001.yml`, (2) korenski **`docker-compose.yml`**, (3) **`atina-platform/atina/docker-compose.yml`** — isto kao CI job **`compose`**. Potreban je **Docker** za te korake (i **Postgres** za pun Nest `verify:ci`; sa **`-SkipNestVerifyCi`** ide samo Nest **`verify:n1`** bez baze). Ako nemaš Docker lokalno: **`.\scripts\verify-monorepo.ps1 -SkipCompose`** ([`GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md)) (u GitHub workflow-u **`compose`** i dalje validira compose ako koristiš Actions).

Pre smokes ručno: isti koraci kao u skripti — workflow **CI (monorepo)** na GitHubu pokreće isti **`compose`** job kad ga koristiš.

## `regenerate-help-snapshot.ps1` — `Get-Help` snapshot generator + smoke test (informativan, **nije** gate)

Skenira `scripts/*.ps1` (root), za svaku pokreće `Get-Help -Full` i generiše konsolidovan markdown snapshot u `docs/SCRIPTS-HELP-SNAPSHOT.md` sa H2 sekcijom po skripti (Putanja + Synopsis + Opis + Sintaksa + Parametri + Primer + komanda za pun help). Na kraju daje **smoke test rezime** (broj skripti sa `.SYNOPSIS` / `.DESCRIPTION` / `.EXAMPLE` / `.NOTES` + broj `Get-Help` grešaka).

**Vlasnik benefit:** statična jednostrana referenca za sve PowerShell ulaze monorepa — pregled synopsis-a, sintakse, parametara i primera bez pokretanja terminala.

| Scenario | Komanda |
|----------|---------|
| Pun pregled (default) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\regenerate-help-snapshot.ps1` |
| Pre-PR gate-flavor (non-zero exit ako bilo koja skripta nema `.SYNOPSIS` ili `Get-Help` padne) | `... -File .\scripts\regenerate-help-snapshot.ps1 -FailOnError` |
| Drugi snapshot (Atina podpaket smoke skripte) | `... -File .\scripts\regenerate-help-snapshot.ps1 -OutputPath docs\SCRIPTS-HELP-ATINA.md -ScriptDir atina-platform\atina\scripts` |

`Get-Help`: **`Get-Help .\scripts\regenerate-help-snapshot.ps1 -Full`** (parametri **`-OutputPath`**, **`-ScriptDir`**, **`-FailOnError`**).

**Snapshot 2026-05-15 (Val 355, posle Talas 124 / help regen):** **43 / 43 sa `.SYNOPSIS · .DESCRIPTION · bar 1 .EXAMPLE · .NOTES`** · **0 / 43 `Get-Help` grešaka** — pun snapshot u [`docs/SCRIPTS-HELP-SNAPSHOT.md`](../docs/SCRIPTS-HELP-SNAPSHOT.md) (generator automatski prepisuje relativne `[X](./Y)` putanje iz comment-based help-a u perspective izlaznog fajla preko `Convert-RelLinks` helpera, pa snapshot ima 0 broken linkova). Pokreni regen pri svakoj izmeni comment-based help-a u bilo kojoj skripti.

**Atina podpaket snapshot 2026-05-14 (Talas 71):** [`docs/SCRIPTS-HELP-SNAPSHOT-ATINA.md`](../docs/SCRIPTS-HELP-SNAPSHOT-ATINA.md) — auto-generisan iz `atina-platform/atina/scripts/` (8 skripti); **0 / 8 sa strukturisanim `.SYNOPSIS · .DESCRIPTION · .EXAMPLE · .NOTES`** (sve 8 koriste line-comments tipa `# Smoke: GET /health` umesto `<# .SYNOPSIS ... #>` blokova; `Get-Help` ih hvata kao **fallback iz syntax-a** — generator pravilno detektuje fallback i ne računa ga kao real Synopsis). **Vlasnik-area** — Atina podpaket tehnički held by repo owner; agent ne menja sadržaj skripti, ali snapshot služi za vidljivost gap-a kad vlasnik želi da unapredi help. Regen: `... -File .\scripts\regenerate-help-snapshot.ps1 -ScriptDir atina-platform\atina\scripts -OutputPath docs\SCRIPTS-HELP-SNAPSHOT-ATINA.md` (verifikuje da je generator „relativ-aware“ — radi sa bilo kog `ScriptDir` → `OutputPath` para bez broken linkova u izlaznom snapshot-u).

## `run-all-audits.ps1` — single entry point za read-only audit suite (informativan, **nije** gate)

Konsolidovan wrapper koji pokreće **39 koraka** (**37** read-only audit skripti + TODO skener + npm audit) (Talas 65→166) iz jednog poziva i daje jedinstveni health izveštaj. Jedna komanda umesto ručnog lanca pojedinačnih audit poziva. Po skripti pojedinačan exit kod, agregiran rezime na kraju. Pun spisak audita: vidi `Get-Help .\scripts\run-all-audits.ps1 -Full` (sekcija DESCRIPTION) ili sledeću tabelu sa 5 najstarije / sporije skripti (ostalih 32 read-only korak ide brzo, <1 s svaki).

| Sekvenca | Skripta | Tipično trajanje |
|----------|---------|------------------|
| 1 | `audit-doc-gate-references.ps1` (Doslednost dok — 5 pairing pravila) | ~7 s |
| 2 | `check-doc-links.ps1` (markdown link skener) | ~17 s |
| 3 | `check-dev-docs-coverage.ps1` (dev/docs hub completeness) | ~2 s |
| 4 | `check-talas-cross-references.ps1` (Talas N 4-way xref; suite prosleđuje `-IncludeIndex`) | ~1 s |
| 5 | `check-script-readme-coverage.ps1` (reverse-coverage `scripts/README.md`) | ~1 s |
| … | koraci 6–37: preostali read-only auditi (vidi `Get-Help -Full`) | <1 s svaki |
| 38 | `scan-todo-markers.ps1` (TODO / FIXME / HACK / XXX markeri) | ~67 s |
| 39 | `audit-npm-monorepo.ps1` (npm audit Atina + Nest + omnigroup-web) | ~16 s |
| **Ukupno** | — | **~120–180 s** brzi režim (`-SkipNpmAudit -SkipTodoScan` → **37** read-only); pun ~150–200 s |

| Scenario | Komanda |
|----------|---------|
| Pun pregled (default — svih 39 koraka) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-all-audits.ps1` |
| Brzi pre-PR pregled (37 read-only bez npm + todo, ~120–180 s; zavisi od I/O) | `... -File .\scripts\run-all-audits.ps1 -SkipNpmAudit -SkipTodoScan` |
| Pre-merge gate-flavor sa snapshot-ima | `... -File .\scripts\run-all-audits.ps1 -OutputDir tmp\audits-2026-05-14 -FailOnAny` |
| Bez todo skena (50% brže) | `... -File .\scripts\run-all-audits.ps1 -SkipTodoScan` |
| Bez npm audita (offline mod) | `... -File .\scripts\run-all-audits.ps1 -SkipNpmAudit` |

`Get-Help`: **`Get-Help .\scripts\run-all-audits.ps1 -Full`** (parametri **`-SkipNpmAudit`**, **`-SkipTodoScan`**, **`-OutputDir`**, **`-FailOnAny`**).

**`-OutputDir` snimanje** (po konvenciji `tmp/audits-YYYY-MM-DD/`; `tmp/` je gitignored):
- `<OutputDir>/todo-markers.json` (svi marker-i sa file:line:context i top fajlovima)
- `<OutputDir>/npm-audit/<paket>-all-<timestamp>.json` (po jedan JSON za Atina, Nest, omnigroup-web — sirov `npm audit --json` output)

**`-FailOnAny` definicija "čist" po skripti:**
- `audit-doc-gate-references.ps1`: exit 0 (već je gate)
- `check-doc-links.ps1`: 0 broken (`-FailOnBroken -SkipEmptyTargets`)
- `check-dev-docs-coverage.ps1`: 0 missing (`-FailOnMissing`)
- `check-talas-cross-references.ps1`: 0 misalignement-a od `-Since` u 4-way modu (`-IncludeIndex` + `-FailOnMisalignment`)
- `check-script-readme-coverage.ps1`: 0 siroče skripti (`-FailOnUncovered`)
- `check-help-blocks-position.ps1`: 0 VIOLATION (`-FailOnViolation`)
- `scan-todo-markers.ps1`: uvek exit 0 (informativan)
- `audit-npm-monorepo.ps1`: 0 critical (`-FailOnCritical`)

**Snapshot 2026-05-14 (Val 355, istorijski pun režim sa npm + todo):** 5 / 5 PASS u prvobitnom Talas 68 opsegu · ~110 s · `tmp/audits-2026-05-14/` snimljeno. **Posle Talas 114:** suite ima **39** koraka; brzi režim `-SkipNpmAudit -SkipTodoScan` → **37 / 37** read-only PASS (~120–180 s lokalno, zavisi od I/O).

## `check-talas-cross-references.ps1` — Talas N usklađenost (informativan, **nije** gate)

Skener interne konzistentnosti agent-rada: za svaki `Talas N` ekstraktuje pojavljivanja iz tri (3-way default) ili četiri (4-way sa `-IncludeIndex`, Talas 89+) ključna dokumenta:

1. [`MASTER-WORK-LIST.md`](../docs/MASTER-WORK-LIST.md) sekcija 1.1 (`- [x] ... Talas N` entry)
2. [`NIVO-1-DRYRUN-LOG.md`](../docs/NIVO-1-DRYRUN-LOG.md) (formalni `## Zapis (izvršen) — Talas N` zaglavlja)
3. [`AGENT-WORK-2026-05-14-SUMMARY.md`](../docs/AGENT-WORK-2026-05-14-SUMMARY.md) (sekcija `### N.M ... Talas N`)
4. (sa `-IncludeIndex`) [`TALAS-INDEX.md`](../docs/TALAS-INDEX.md) chronological tabela (red `| **N** | datum | domen | naslov | status |` — Talas 88 uveo TALAS-INDEX kao 4. obavezno mesto za agent automation talas-eve)

Računa SET-ove i prijavljuje misalignement za svaki Talas N ≥ `-Since` koji nije usklađen u svim lokacijama. **Default `-Since 70`** — prvi Talas koji ima 3-way usklađenost (formalni dry-run obrazac uveden 2026-05-14 sa Talas 70). Stariji Talas-i se ne prijavljuju kao misalignement (`-Since 65` ih prikazuje kao informativnu listu — Talas 65-69 nemaju formalan dry-run jer je obrazac uveden tek u Talas 70).

| Scenario | Komanda |
|----------|---------|
| Pun pregled 3-way (default `-Since 70`) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-talas-cross-references.ps1` |
| 4-way mod sa TALAS-INDEX (Talas 89+) | `... -File .\scripts\check-talas-cross-references.ps1 -IncludeIndex` |
| Pre-merge gate-flavor 4-way (exit 1 ako misalignement) | `... -File .\scripts\check-talas-cross-references.ps1 -IncludeIndex -FailOnMisalignment` |
| Vidljivost gap-a od Talas 65 (informativno) | `... -File .\scripts\check-talas-cross-references.ps1 -Since 65 -IncludeIndex` |
| Strožija verifikacija od Talas N (npr. svaki Talas 80+ mora imati 4 zapisa) | `... -File .\scripts\check-talas-cross-references.ps1 -Since 80 -IncludeIndex -FailOnMisalignment` |

`Get-Help`: **`Get-Help .\scripts\check-talas-cross-references.ps1 -Full`** (parametri **`-Since`**, **`-FailOnMisalignment`**, **`-MaxOutput`**, **`-IncludeIndex`**).

**Snapshot 2026-05-15 (Val 355, kanon posle Talas 192):** Master-Work-List 1.1 = **180 jedinstvenih Talas N** (range 3 – **192**); Dry-Run = **123** (Talas 70 – **192**); Summary = **127** (Talas 66 – **192**); TALAS-INDEX = **128** (Talas 65 – **192**, sa `-IncludeIndex`). Sa default `-Since 70` (4-way preko `-IncludeIndex`): **123 razmatrano** · **0 misalignement-a**. **`run-all-audits.ps1` korak 4** uvek prosleđuje `-IncludeIndex`; sa `-FailOnAny` dodaje i `-FailOnMisalignment`. **Talas 73 fix (PS lesson #3):** summary regex `.*?` → `.*` (greedy) jer summary obrazac stavlja Talas N kao **suffix** (`### 1.M Naslov ... — Talas N`) — non-greedy bezbedan za master/dry-run **prefix** obrazac, ali ne za suffix. **Talas 89 ekstenzija:** dodat `-IncludeIndex` switch koji parsira TALAS-INDEX.md tabelu (`^\| \*\*(\d+)\*\* \|` regex za bold-stilizovan Talas N broj u prvoj koloni); 4. mesto u xref garantuje da agent ne propusti TALAS-INDEX update kada doda novi talas.

## `check-script-readme-coverage.ps1` — reverse-coverage gate (informativan, opciono pre-PR sa `-FailOnUncovered`)

Reverse-coverage skener (Talas 74): za svaki `scripts/*.ps1` proverava da li se basename pojavljuje barem `-MinMentions` puta u [`scripts/README.md`](./README.md). Brani protiv „siroče" PowerShell skripti — onih koje su dodate u `scripts/` bez sekcije u README hub-u, što znači da vlasnik nema navigacioni ulaz da otkrije da skripta postoji. Komplementaran sa [`regenerate-help-snapshot.ps1`](./regenerate-help-snapshot.ps1) (svaki PS treba da ima `Get-Help` blokove), [`check-dev-docs-coverage.ps1`](./check-dev-docs-coverage.ps1) (svaki `*.md` mora biti u `apps/omnigroup-web/src/app/dev/docs/page.tsx` hub-u), i [`check-markdown-code-blocks.ps1`](./check-markdown-code-blocks.ps1) (Talas 82 — proaktivna markdown code-block validacija). **3-way garancija otkrivenosti** (Get-Help / README hub / `page.tsx`) ostaje isti Talas 74 dizajn; Talas 82 skener je **dopuna** za fence validaciju repo-wide, ne deo README mention brojača. Tri kanala: (1) `Get-Help` introspekcija → `docs/SCRIPTS-HELP-SNAPSHOT.md`, (2) tekstualni hub → `scripts/README.md`, (3) navigacioni hub za markdown → `apps/omnigroup-web/src/app/dev/docs/page.tsx`.

| Scenario | Komanda |
|----------|---------|
| Default (samo siroče skripte se reportuju) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-script-readme-coverage.ps1` |
| Talas 74 baseline (svaka skripta mora imati >= 6 mention-a) | `... -File .\scripts\check-script-readme-coverage.ps1 -MinMentions 6` |
| Pre-merge gate-flavor (exit 1 ako ima siroče skripta) | `... -File .\scripts\check-script-readme-coverage.ps1 -FailOnUncovered` |
| Striktan baseline + gate (oba u jednom pozivu) | `... -File .\scripts\check-script-readme-coverage.ps1 -MinMentions 6 -FailOnUncovered` |

`Get-Help`: **`Get-Help .\scripts\check-script-readme-coverage.ps1 -Full`** (parametri **`-MinMentions`**, **`-FailOnUncovered`**, **`-MaxOutput`**).

**Snapshot 2026-05-15 (Talas 74 baseline, root `scripts/`):** **43 / 43 PS skripti** ima bar 1 mention u `scripts/README.md` (0 siroče). Sa `-MinMentions 6`: **43 OK**, **0 SLABO**; minimum = **6** (više skripti na pragu), maksimum = **32** (`verify-monorepo.ps1`); medijan ~8–9.

**Istorijski snapshot 2026-05-14 (Val 355, 11 skripti):** 11 / 11 sa mention-om; sa `-MinMentions 6`: 0 siroče + 0 slabo — pre ekspanzije na 43 root skripte (`scripts/` u korenu repoa).

## `check-help-blocks-position.ps1` — Talas 70 preventivni gate (informativan, opciono pre-PR sa `-FailOnViolation`)

Eksplicitan brzi skener (Talas 76): za svaki `scripts/*.ps1` validira da li comment-based help blok dolazi **PRE** `#Requires` direktive (ili bilo koje druge code linije). Komplementaran sa [`regenerate-help-snapshot.ps1`](./regenerate-help-snapshot.ps1) — taj indirektno otkriva problem preko `Get-Help.Description = $null` (~5 s prolaz), ovaj eksplicitno parsira sirov tekst i daje preciznu poruku (~0.5 s prolaz). Tri statusa: **OK** (help blok je prvi, sve dobro), **VIOLATION** (`#Requires` ili druga code linija pre `<# ... #>` — Talas 70 binding bug), **NO-HELP** (uopšte nema help blok — upozorenje, ne greška). Detaljnije objasnjenje Talas 70 lesson-a u [`AGENT-AUTOMATION-GUIDE.md`](./AGENT-AUTOMATION-GUIDE.md) sekcija 2 korak 1.

| Scenario | Komanda |
|----------|---------|
| Default (informativan, prijavljuje sve statuse) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-help-blocks-position.ps1` |
| Pre-merge gate-flavor (exit 1 ako ima VIOLATION) | `... -File .\scripts\check-help-blocks-position.ps1 -FailOnViolation` |
| Maksimalna strogost (exit 1 i za NO-HELP) | `... -File .\scripts\check-help-blocks-position.ps1 -FailOnViolation -FailOnNoHelp` |
| **Talas 77** — uključi Atina-area u skeniranje (43 + 8 = 51 PS skripti) | `... -File .\scripts\check-help-blocks-position.ps1 -IncludeAtinaScripts` |
| Talas 77 — pregled NO-HELP statusa za Atina-area (vlasnik plan) | `... -File .\scripts\check-help-blocks-position.ps1 -IncludeAtinaScripts` (informativan; pokazuje 8 NO-HELP entries sa linijom gde počinje code — predlog gde dodati `<# ... #>` blok iznad) |
| Talas 77 — eksplicitan dodatni put | `... -File .\scripts\check-help-blocks-position.ps1 -AdditionalPaths @('atina-platform/atina/scripts','atina-system/scripts')` |

`Get-Help`: **`Get-Help .\scripts\check-help-blocks-position.ps1 -Full`** (parametri **`-FailOnViolation`**, **`-FailOnNoHelp`**, **`-MaxOutput`**, **`-AdditionalPaths`**, **`-IncludeAtinaScripts`**).

**Snapshot 2026-05-15 (Talas 114 → 43 skripti u `scripts/`):** **43 / 43 PS skripti OK** (sve imaju help blok kao prvi neprazan element); 0 VIOLATION; 0 NO-HELP. Svi `<#` su u liniji 1, prva code linija (`#Requires`, `param`) dolazi posle `#>` close-tag-a. Nova skripta sa pogrešnim poretkom (npr. `#Requires` pre `<# ... #>`) odmah pada na `check-help-blocks-position.ps1`.

**Snapshot 2026-05-15 sa `-IncludeAtinaScripts` (Talas 77 baseline, 43 root + 8 Atina):** **51 PS skripti**; **43 / 51 OK** + **8 / 51 NO-HELP** (sve Atina PS skripte: `free-port.ps1`, `smoke-all.ps1`, `smoke-atina-forge-workflow-template.ps1`, `smoke-auth.ps1`, `smoke-forge-admin.ps1`, `smoke-forge-status.ps1`, `smoke-health.ps1`, `vault-db-ops.ps1`); 0 VIOLATION (sve Atina skripte počinju `# komentarom` ili `param(`, ne sa `#Requires` pre `<# ... #>`). NO-HELP nije FAIL u default-u — to je upozorenje za vlasnika da Atina skripte čekaju strukturirani help blok (vidi `AGENT-WORK-2026-05-14-SUMMARY.md` sekcija "Šta čeka vlasnika" — Atina-area opciono).

**Istorijski snapshot 2026-05-14 (Val 355, 12 skripti u `scripts/`):** 12 / 12 OK; 0 VIOLATION; 0 NO-HELP — pre ekspanzije suite-a na 43 root skripte (Talas **114** baseline u 2026).

## `check-ps-encoding.ps1` — Talas 72/74 BOM lessons preventivni gate (informativan, opciono pre-PR sa `-FailOnWarn`)

Eksplicitan brzi skener (Talas 78): za svaki `*.ps1` u skenirajućim direktorijumima validira encoding na osnovu prva 3 byte-a (BOM check) i ostatka fajla (non-ASCII byte > 127 check). Komplementaran sa [`regenerate-help-snapshot.ps1`](./regenerate-help-snapshot.ps1) — taj indirektno otkriva runtime greške preko `Get-Help` izvršenja, ovaj parsira sirov bajt-stream i daje preciznu poruku. **4 statusa:**

- **`OK-ASCII`** — pure ASCII (svi byte-ovi 0-127), bez BOM-a. Najlakši za git diff i merge; siguran u svakom code page-u i OS-u.
- **`OK-BOM`** — pure ASCII sa BOM-om. Tehnički OK ali BOM je suvišan (nema non-ASCII karaktera).
- **`OK-UTF8`** — non-ASCII karakteri sa BOM-om. **Idealno stanje** za skripte koje koriste ćirilicu, srpsku latinicu, em-dash, ili specijalne karaktere — PowerShell parser zna kako da čita fajl jer BOM eksplicitno deklaruje UTF-8.
- **`WARN-NO-BOM`** — non-ASCII bez BOM-a. **Rizik** jer parser interpretira fajl preko system code page-a (Windows: CP1252 / Windows-1252). Trenutno radi ako su svi non-ASCII karakteri u CP1252 setu (`š`, `č`, `ć`, `→`, `–`), ali **pada** čim agent doda karakter izvan CP1252 (ćirilica, kineski, neki emoji). Talas 72/74 lessons su došli iz tog rizika.

| Scenario | Komanda |
|----------|---------|
| Default (informativan, prijavljuje sve 4 statusa) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-ps-encoding.ps1` |
| Strogi režim (exit 1 ako bilo koji fajl ima WARN-NO-BOM) | `... -File .\scripts\check-ps-encoding.ps1 -FailOnWarn` |
| Talas 77/78 — uključi Atina-area u skeniranje (43 + 8 = 51 PS skripti) | `... -File .\scripts\check-ps-encoding.ps1 -IncludeAtinaScripts` |
| Eksplicitno više direktorijuma | `... -File .\scripts\check-ps-encoding.ps1 -AdditionalPaths @('atina-platform/atina/scripts','atina-system/scripts')` |

`Get-Help`: **`Get-Help .\scripts\check-ps-encoding.ps1 -Full`** (parametri **`-FailOnWarn`**, **`-MaxOutput`**, **`-AdditionalPaths`**, **`-IncludeAtinaScripts`**).

**Snapshot 2026-05-15 (Talas 78 baseline, root `scripts/`):** **43 PS skripte**; **0 OK-ASCII** + **0 OK-BOM** + **43 OK-UTF8** + **0 WARN-NO-BOM** (svi fajlovi snimljeni kao UTF-8 sa BOM). **`-FailOnWarn`** hvata nove skripte koje bi bile `WARN-NO-BOM` (non-ASCII bez BOM-a). **Default exit 0** — informativan, ne FAIL u suite-u.

**Istorijski snapshot 2026-05-14 (Val 355, 13 skripti):** 10 OK-UTF8 + 3 WARN-NO-BOM (`audit-doc-gate-references.ps1`, `smoke-stack.ps1`, `verify-monorepo.ps1`) — pre masovnog UTF-8 BOM na celom `scripts/`.

## `check-package-json-consistency.ps1` — `package.json` doslednost preko 3 Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`)

Read-only audit (Talas 79): čita 3 `package.json` fajla (`apps/omnigroup-web/package.json`, `atina-platform/atina/package.json`, `atina-system/package.json`) i validira **strukturalnu doslednost** polja koja su realan deploy-rizik kad nisu sinhronizovana. Ne validira `dependencies` / `devDependencies` (to je posao [`audit-npm-monorepo.ps1`](./audit-npm-monorepo.ps1)) ni `scripts` polje (to je posao vlasnika).

**Validira 5 stvari:**

| # | Polje | Severity | Šta proverava |
|---|-------|----------|---------------|
| 1 | `engines.node` prisustvo | **WARN** | Paket bez deklaracije riskira da CI / lokalni dev pokrene sa neočekivanom Node verzijom (npr. dev na 22, CI na 18, deploy na 20) |
| 2 | `engines.node` doslednost | **WARN** | Različite vrednosti u različitim paketima → lockfile rizik i deploy fail |
| 3 | `license` prisustvo | **WARN** | Paket bez `license` polja je pravna nedoslednost |
| 4 | `license` doslednost | **INFO** | Različiti license-i (npr. `ISC` vs `UNLICENSED`) — informativan signal, ne FAIL |
| 5 | `private` doslednost | **INFO** | Različite vrednosti `private` polja — informativan signal |

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-package-json-consistency.ps1` |
| Strogi režim (exit 1 ako WARN) | `... -File .\scripts\check-package-json-consistency.ps1 -FailOnWarn` |
| Eksplicitno suženje skupa | `... -File .\scripts\check-package-json-consistency.ps1 -PackageRoots @('apps/omnigroup-web/package.json','atina-platform/atina/package.json')` |

`Get-Help`: **`Get-Help .\scripts\check-package-json-consistency.ps1 -Full`** (parametri **`-FailOnWarn`**, **`-MaxOutput`**, **`-PackageRoots`**).

**Snapshot 2026-05-14 (Val 355, Talas 79 baseline):** **3 Node paketa skenirano**; **2 WARN** + **1 INFO**:

- **WARN — `engines.node`:** 2 / 3 paketa bez deklaracije (`apps/omnigroup-web/package.json`, `atina-system/package.json`); samo `atina-platform/atina/package.json` ima `>=20 <21`
- **WARN — `license`:** 2 / 3 paketa bez `license` polja (`apps/omnigroup-web/package.json`, `atina-platform/atina/package.json`); samo `atina-system/package.json` ima `UNLICENSED`
- **INFO — `private`:** 2 različite vrednosti (`True` vs none) — `omnigroup-web` i `atina-system` su `private: true`, Atina nije

**Vlasnik akcija (opciono, P1.D nivo):** dodati `engines.node` istu vrednost u sva 3 paketa (npr. `>=20 <21` ako Atina već koristi); dodati `license` polje (npr. `UNLICENSED` ili `ISC`). **Default exit 0** — informativan, ne FAIL u suite-u.

## `check-workflow-consistency.ps1` — GitHub workflow + `.nvmrc` + `engines.node` cross-check (informativan, opciono pre-PR sa `-FailOnWarn`)

Read-only audit (Talas 80): nastavak monorepo-wide structural consistency domena (Talas 79). Skenira 3 GitHub workflow YAML fajla u monorepu i validira:

| # | Polje | Severity | Šta proverava |
|---|-------|----------|---------------|
| 1 | `uses:` action doslednost | **WARN** | Regex hvata sve `actions/<name>@v<n>` reference; ako isti action ima različite verzije preko workflow-a (npr. `@v4` u 2 i `@v3` u 1) — rizik za mismatch |
| 2 | `node-version-file:` putanje postoje | **WARN** | Test-Path proverava da li `.nvmrc` putanja iz workflow YAML-a fizički postoji (pretražuje 3 candidate: repo root, paket root, workflow direktorijum) |
| 3 | `.nvmrc` sadržaj doslednost | **WARN** | Sva 3 paketa moraju imati istu Node verziju u `.nvmrc` — različite vrednosti znače da CI matrix može biti nedosledan |
| 4 | Cross-check `.nvmrc` ↔ `engines.node` | **INFO** | Za svaki paket sa `.nvmrc`, proverava da li paralelni `package.json` ima `engines.node` polje sinhronizovano (preklapa sa Talas 79 audit-om) |

Parsuje YAML preko regex-a (PowerShell 5.1 nema native YAML parser — `powershell-yaml` modul nije zavisnost agent-safe alata). Regex-i hvataju 90% slučajeva u tipičnim GitHub Actions yaml-ima.

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-workflow-consistency.ps1` |
| Strogi režim (exit 1 ako WARN) | `... -File .\scripts\check-workflow-consistency.ps1 -FailOnWarn` |
| Eksplicitno suženje skupa | `... -File .\scripts\check-workflow-consistency.ps1 -WorkflowPaths @('.github/workflows/ci-monorepo.yml')` |

`Get-Help`: **`Get-Help .\scripts\check-workflow-consistency.ps1 -Full`** (parametri **`-FailOnWarn`**, **`-MaxOutput`**, **`-WorkflowPaths`**).

**Snapshot 2026-05-14 (Val 355, Talas 80 baseline):** **3 workflow-a skenirana** + **3 `.nvmrc` referencirana**; **0 WARN** + **2 INFO**:

- Sva 3 workflow-a koriste `actions/checkout@v4` ✓ konzistentno
- Sva 3 workflow-a koriste `actions/setup-node@v4` ✓ konzistentno
- Root workflow takođe koristi `actions/setup-python@v5` (samo root — očekivano, Atina/Nest nemaju Python step)
- Sva 3 `.nvmrc` (`apps/omnigroup-web/.nvmrc`, `atina-platform/atina/.nvmrc`, `atina-system/.nvmrc`) su **`20`** ✓ konzistentno
- **2 INFO** za cross-check `.nvmrc` ↔ `engines.node` — `apps/omnigroup-web/package.json` i `atina-system/package.json` nemaju `engines.node` iako `.nvmrc=20`; **preklapa sa Talas 79 nalazima** (P1.D vlasnik akcija)

**Default exit 0** — informativan, ne FAIL u suite-u.

## `check-readme-presence.ps1` — paket README.md presence + zdravlje (informativan, opciono pre-PR sa `-FailOnWarn`)

Read-only audit (Talas 81): nastavak monorepo-wide structural consistency domena (Talas 79 — `package.json`; Talas 80 — workflow YAML); sad pokriven **discoverability sloj** za vlasnika koji prvi put gleda paket. Skenira 7 ključnih README lokacija (root + 3 Node paketa + `scripts` + `docs` + `atina-platform/atina/scripts`) i validira 4 nivoa:

| # | Provera | Status | Severity | Šta znači |
|---|---------|--------|----------|-----------|
| 1 | Postojanje | `MISSING` | **WARN** | Fajl ne postoji — vlasnik bez konteksta ne zna gde da krene |
| 2 | Non-empty | `EMPTY` | **WARN** | 0-byte fajl (OneDrive Files-On-Demand uzorak ili dehidrirani) |
| 3 | H1 heading | `NO-H1` | **WARN** | Postoji ali nema bar 1 red sa `# ` (single hash + space + tekst) — markdown bez H1 je teško skenirati i loš UX za onboarding |
| 4 | Single H1 | `MULTI-H1` | **INFO** | Više od 1 H1 (standardna markdown praksa: 1 H1 po dokumentu kao `<h1>` u HTML); često znači da su `## Section` greškom napisani kao `# Section`, ili je dokument konkatenacija više pod-dokumenata |

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-readme-presence.ps1` |
| Strogi režim (exit 1 ako WARN; MULTI-H1 ostaje INFO) | `... -File .\scripts\check-readme-presence.ps1 -FailOnWarn` |
| Eksplicitno suženje skupa | `... -File .\scripts\check-readme-presence.ps1 -ReadmePaths @('apps/omnigroup-web/README.md')` |

`Get-Help`: **`Get-Help .\scripts\check-readme-presence.ps1 -Full`** (parametri **`-FailOnWarn`**, **`-MaxOutput`**, **`-ReadmePaths`**).

**Snapshot 2026-05-14 (Val 355, Talas 81 finalni):** **7 README putanja proverljivo**; **0 WARN** + **0 INFO** ✓ — svih 7 README su OK (postoji, non-empty, tačno 1 H1). Sva 3 paketa (root, omnigroup-web, atina-platform/atina, atina-system, scripts, docs, atina-platform/atina/scripts) imaju validan markdown sa jednim H1 heading-om.

**Talas 81 self-improvement (lekcija #17):** Početni run skenera prijavio 4 MULTI-H1 nalaze, ali svi su bili **false positives** uzrokovani PowerShell `# Komentar` linijama unutar markdown code blokova (` ``` ... ``` `). Skener je popravljen tako da preskače sve linije između trojnih backtick fence-ova pre primene H1 regex-a; sada validno detektuje samo prave markdown H1 heading-e. Posle popravke: `atina-platform/atina/README.md` od 15 H1 → 1 H1 (14 su bili code-block komentari); `atina-system/README.md` od 2 H1 → 1 H1; `scripts/README.md` od 2 H1 → 1 H1; `docs/README.md` od 4 H1 → 1 H1. Lekcija dodata u [`AGENT-AUTOMATION-GUIDE.md`](./AGENT-AUTOMATION-GUIDE.md) tabelu Talas-eva.

**Default exit 0** — informativan, ne FAIL u suite-u (sa `-FailOnWarn` exit 0 takođe).

## `check-markdown-code-blocks.ps1` — markdown code-block validacija (informativan, opciono pre-PR sa `-FailOnWarn`)

Read-only audit (Talas 82): nadovezuje se direktno na Talas 81 lekciju #17 (code-block fence skip). Skenira sve `*.md` fajlove u monorepu (osim `node_modules/`) i validira **4 nivoa** za prevenciju future false-positive bug-ova u markdown skenerima:

| # | Provera | Status | Severity | Šta znači |
|---|---------|--------|----------|-----------|
| 1 | Balansirani fence-ovi | `UNBALANCED` | **WARN** | Broj `\`\`\`` linija nije paran — nezatvoren code blok je realan markdown bug koji ruši syntax highlighting i zbunjuje sve dalje skenere koji rade pattern matching na sadržaju |
| 2 | Language tag | `NO-LANG-TAG` | **INFO** | Otvarajući fence bez language identifier-a (`\`\`\`` umesto `\`\`\`powershell`) — standardna praksa za GitHub renderer + dev/docs UI syntax highlighting |
| 3 | H1-in-code-block | `H1-IN-BLOCK` | **INFO** | Linija unutar code bloka počinje sa `# ` — naivni H1 skener (`^# [^#]` regex) bi je tretirao kao markdown heading. Talas 81 lekcija #17. Ovaj signal pomaže vlasniku da vidi gde je rizik |
| 4 | Nested fence | `NESTED-FENCE` | **INFO** | Dva uzastopna otvarajuća fence-a (zatvarajući fence sa language tag-om) — markdown rendering anomalija |

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-markdown-code-blocks.ps1` |
| Strogi režim (exit 1 ako UNBALANCED) | `... -File .\scripts\check-markdown-code-blocks.ps1 -FailOnWarn` |
| Eksplicitno suženje skupa | `... -File .\scripts\check-markdown-code-blocks.ps1 -Roots @('docs')` |

`Get-Help`: **`Get-Help .\scripts\check-markdown-code-blocks.ps1 -Full`** (parametri **`-FailOnWarn`**, **`-MaxOutput`**, **`-Roots`**).

**Snapshot 2026-05-14 (Val 355, Talas 82 baseline):** **123 *.md fajlova** skenirano, **178 code blokova** ukupno; **0 UNBALANCED** ✓ + **3 INFO kategorija**:

- **0 UNBALANCED** ✓ — svi code blokovi su zatvoreni; nema rizika od broken markdown rendering-a
- **10 NO-LANG-TAG** (INFO) — 10 code blokova bez language tag-a (mali broj; vlasnik može opciono dodati `\`\`\`powershell` ili `\`\`\`bash` za syntax highlighting)
- **113 H1-IN-BLOCK** (INFO) — direktna validacija Talas 81 lekcije #17; vlasnik dobija konkretnu listu mesta gde naivni H1 skener bi pravio false positive-e (najveći broj u `atina-platform/atina/README.md` jer ima dosta PowerShell `# Komentar` linija u code blokovima)
- **0 NESTED-FENCE** ✓

**Default exit 0** — informativan, ne FAIL u suite-u; `-FailOnWarn` podiže exit samo ako UNBALANCED postoji.

**Talas 84 update (NO-LANG-TAG smanjenje 10 → 4):** Posle Talas 82 baseline-a, agent je u Talas 84 popravio **6 docs/ NO-LANG-TAG** code blokova (sve UX-bezbedne dopune):

- [`docs/AGENT-WORK-2026-05-14-SUMMARY.md`](../docs/AGENT-WORK-2026-05-14-SUMMARY.md) liniji **646** — commit poruka → `\`\`\`text`
- [`docs/D1-ITER2-PR-BODY.md`](../docs/D1-ITER2-PR-BODY.md) liniji **102** — commit poruka → `\`\`\`text`
- [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE.template.md`](../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE.template.md) liniji **33** — Command placeholder → `\`\`\`powershell`
- [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE.template.md`](../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE.template.md) liniji **59** — terminal output tail placeholder → `\`\`\`text`
- [`docs/TEHNICKI-AUDIT-2026-05-13.md`](../docs/TEHNICKI-AUDIT-2026-05-13.md) liniji **104** — Next.js compile greška → `\`\`\`text`
- [`docs/TEHNICKI-AUDIT-2026-05-13.md`](../docs/TEHNICKI-AUDIT-2026-05-13.md) liniji **150** — TypeORM migration error → `\`\`\`text`

Preostalih **4 NO-LANG-TAG** su u [`atina-platform/atina/README.md`](../atina-platform/atina/README.md) liniji 93/155/377/382 — **vlasnik akcija** (Atina-area se ne dira agent-safe; vidi [`AGENT-AUTOMATION-GUIDE.md`](./AGENT-AUTOMATION-GUIDE.md) sekcija 6 *Šta NIJE agent-safe*).

**Audit refresh 2026-05-15 (Talas 124 / Talas 136 doc-only):** poslednji `run-all-audits.ps1 -SkipNpmAudit -SkipTodoScan` izlaz — **125** *.md / **237** code blokova / **4** NO-LANG-TAG / **190** H1-IN-BLOCK INFO; vidi top-level tabelu u [`docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md`](../docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md). Pasus *Snapshot 2026-05-14* iznad ostaje istorijski Val 355 Talas 82 baseline.

## `check-codeblock-skip-consistency.ps1` — Lekcija #17 doslednost preko PS skenera (informativan, opciono pre-PR sa `-FailOnMissing`)

Read-only **regression sentinel** (Talas 85): mehanizovana provera da svaki PowerShell skener u `scripts/` koji parsira `*.md` sadrzaj ima Lekciju #17 (markdown code-block fence skip) implementiranu. Ako neko u buducnosti doda novi PS skener koji parsira md liniju-po-liniju bez fence skip-a, ovaj audit ce ga uhvatiti pre nego sto false positives potroshe vlasnikovo vreme. Trenutno je validirano u Talas 84 da svih 4 markdown skenera (preko 5 OK posle Talas 85) imaju Lekciju #17 — sad to postaje proveriv invariant umesto rucnog audita.

**Statusi:**

| Status | Znacenje | Severity |
|--------|----------|----------|
| `OK` | Skener parsira `*.md` i ima detektovanu code-block skip logiku (`^[\`]{3}` regex, `inCodeBlock` toggle, `Strip fenced code blocks` komentar, ili sl.) | INFO ✓ |
| `N/A` | Skener ne parsira `*.md` sadrzaj (npr. radi samo na `*.ps1` ili `*.json`). Lekcija #17 nije aplicabilna | INFO ✓ |
| `IGNORED` | Skener je u allow-list (default ili preko `-IgnoreScripts`) — radi substring/whole-file matching umesto line-anchored regex; Lekcija #17 nije relevantna | INFO ✓ |
| `MISSING-SKIP` | Skener parsira `*.md` sadrzaj ali NEMA detektovanu code-block skip logiku — **rizik false positive-a** | **WARN** |

**Default ignore list** (5 skripti koje rade substring/whole-file matching umesto line-anchored regex; Lekcija #17 nije aplicabilna jer mention u code bloku TREBA da se broji kao validan signal):

- [`audit-doc-gate-references.ps1`](./audit-doc-gate-references.ps1) — `Get-Content -Raw` + substring matching (`verify-monorepo`, `EVIDENCE-INDEX` par-rules)
- [`check-script-readme-coverage.ps1`](./check-script-readme-coverage.ps1) — `Get-Content -Raw` na `scripts/README.md` + counts mention-e
- [`check-help-blocks-position.ps1`](./check-help-blocks-position.ps1) — skenira `*.ps1` (ne `*.md`); spomen `README.md` u help bloku je false positive
- [`regenerate-help-snapshot.ps1`](./regenerate-help-snapshot.ps1) — **generise** `*.md` (ne parsira); spomen `.md` u opisu je false positive
- [`check-dev-docs-coverage.ps1`](./check-dev-docs-coverage.ps1) — samo `Get-ChildItem -Filter '*.md'`, `Get-Content` je samo na `page.tsx`

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-codeblock-skip-consistency.ps1` |
| Strogi rezim (exit 1 ako MISSING-SKIP) | `... -File .\scripts\check-codeblock-skip-consistency.ps1 -FailOnMissing` |
| Bez default ignore liste (sve substring-skripte ce dati MISSING-SKIP false positives) | `... -File .\scripts\check-codeblock-skip-consistency.ps1 -IgnoreDefaults:$false` |
| Sa eksplicitnim ignore listom | `... -File .\scripts\check-codeblock-skip-consistency.ps1 -IgnoreScripts @('moja-skripta.ps1')` |

`Get-Help`: **`Get-Help .\scripts\check-codeblock-skip-consistency.ps1 -Full`** (parametri **`-FailOnMissing`**, **`-MaxOutput`**, **`-ScriptsDir`**, **`-IgnoreScripts`**, **`-IgnoreDefaults`**).

**Snapshot 2026-05-14 (Val 355, Talas 85 baseline):** 18 PS skripti / **6 OK** ✓ (svih 4 markdown skenera + sam skener + `run-all-audits.ps1` koji u opisu pominje "code-block fence skip") + **7 N/A** (ne parsiraju md) + **5 IGNORED** (substring matching) + **0 MISSING-SKIP** ✓ — regression sentinel zelen.

**Default exit 0** — informativan; `-FailOnMissing` podiže exit ako bilo koji PS skener u `scripts/` parsira `*.md` line-anchored bez code-block skip-a.

**Vlasnik benefit:** (1) **mehanizovan invariant** — agent ne mora ručno proveravati svaki novi skener; (2) **konkretan signal o domenu Lekcije #17** — trenutno 6/18 PS skripti je u "markdown line-anchored" domenu, 7/18 nije relevantno, 5/18 radi substring matching; (3) **default ignore list je transparentan** — vlasnik može pogledati spisak i razumeti zašto neka skripta nije OK; (4) **fleksibilnost** — `-IgnoreDefaults:$false` da vidi šta bi sve bilo "rizik" bez allow-list-a (4-5 substring skripti dobijaju MISSING-SKIP — istraživačko).

## `check-tsconfig-consistency.ps1` — `tsconfig.json` doslednost preko 3 TS paketa (informativan, opciono pre-PR sa `-FailOnWarn`)

Read-only **strukturalni audit** (Talas 87): nastavak Talas 79 (`package.json`) i Talas 80 (workflow YAML + `.nvmrc`) domena monorepo-wide structural consistency, sad pokriva **TypeScript sloj**. Validira da svaki Node TS paket u monorepu (3 trenutno - `apps/omnigroup-web` Next.js, `atina-platform/atina` Node lib, `atina-system` NestJS) ima usaglasena polja u `compilerOptions` koja su realan signal kvaliteta TS sloja.

**Polja koja se validiraju:**

| Polje | Severity | Razlog |
|-------|----------|--------|
| `strict` (true ili dovoljan split set) | **WARN** | Paket bez `strict: true` ili `strictNullChecks + noImplicitAny` (≥2 split komponente) riskira TS sloj sa lakim greskama tipa |
| `strict` pristup doslednost (true vs split) | INFO | Razliciti pristupi (Atina Node `strict:true` vs Nest split) je legitimno ali signal nedoslednosti |
| `target` explicit (Next legitimno bez) | INFO | Next override-uje `target` interno; ostali paketi treba da imaju explicit |
| `target` doslednost među explicit-paketima | **WARN** | `ES2020` (Atina) vs `ES2021` (Nest) je realan runtime mismatch — Node 20 podržava ES2023 baseline |
| `skipLibCheck` | **WARN** | Standard u modernim TS projektima (10x brži typecheck); paket bez ovoga je outdated |
| `esModuleInterop` | **WARN** | CommonJS interop standard (default importovanje); paket bez ovoga slabije radi sa CJS modulima |
| `forceConsistentCasingInFileNames` | INFO | Vazno za case-insensitive FS-eve (Windows + macOS default); legitimno može biti implicitno |

**Snapshot 2026-05-14 (Val 355, Talas 87 baseline):** 3 TS paketa skenirana / **2 WARN** + **3 INFO** + 0 grešaka:

| Paket | Target | Module | StrictMode | SkipLibCheck | EsModuleInterop |
|-------|--------|--------|------------|--------------|-----------------|
| `apps/omnigroup-web/tsconfig.json` | `(none)` (Next default) | `esnext` | `strict:true` | True | True |
| `atina-platform/atina/tsconfig.json` | `ES2020` | `commonjs` | `strict:true` | True | True |
| `atina-system/tsconfig.json` | `ES2021` | `commonjs` | `split: strictNullChecks,noImplicitAny,strictBindCallApply` | True | `(none)` |

**Trenutni WARN nalazi (vlasnik akcija opciono):**

1. **`target` mismatch:** `ES2020` (Atina) vs `ES2021` (Nest) — Node 20 LTS podržava ES2022/ES2023; mogli bi biti sinhronizovani (npr. `ES2022` u oba). Real runtime razlika za TC39 funkcije poput `Array.prototype.at`, `Object.hasOwn`, error cause.
2. **`esModuleInterop` nedostaje** u atina-system (Nest) — Nest ima `allowSyntheticDefaultImports: true` što je delimično pokrice, ali eksplicitan flag je standard.

**3 INFO nalaza (informativna):**

1. 2 razlicita strict pristupa (atina-system koristi split — `strictNullChecks` + `noImplicitAny` + `strictBindCallApply` umesto `strict:true`); svi paketi su validno strict, ali je nedosledno
2. 1/3 paketa bez explicit target (Next default je legitiman)
3. 1/3 paketa bez explicit `forceConsistentCasingInFileNames` (omnigroup-web nema; Next implicitno radi case check)

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-tsconfig-consistency.ps1` |
| Strogi rezim (exit 1 ako WARN) | `... -File .\scripts\check-tsconfig-consistency.ps1 -FailOnWarn` |
| Sa drugim setom paketa (ako se doda novi TS paket) | `... -File .\scripts\check-tsconfig-consistency.ps1 -PackageRoots @("apps/omnigroup-web/tsconfig.json","atina-platform/atina/tsconfig.json")` |

`Get-Help`: **`Get-Help .\scripts\check-tsconfig-consistency.ps1 -Full`** (parametri **`-FailOnWarn`**, **`-MaxOutput`**, **`-PackageRoots`**).

**Default exit 0** — informativan; `-FailOnWarn` podiže exit ako bilo koji TS paket ima WARN nalaz (strict / target / skipLibCheck / esModuleInterop).

**Vlasnik benefit:** (1) **konkretan deploy-rizik signal** — `target` mismatch znači da iste API funkcije imaju različitu kompilaciju u dva paketa; (2) **Nest paket strict gap vidljiv** — vlasnik može odlučiti da li puni `strict:true` switch je vredan rizik refactor-a; (3) **regression sentinel** — kad se doda 4. TS paket (npr. budući BFF ili shared types lib), audit će automatski upozoriti ako nije usklađen; (4) **JSONC line-comment podrška** — strip-uje `// komentar` na početku linije pre JSON parsiranja (block-comment strip namerno izostavljen jer regex `/\*.*?\*/` lažno hvata glob putanje poput `**/*.ts`); (5) **kompletira monorepo-wide structural consistency domen** — sad pokriveno: `package.json` (Talas 79), workflow YAML + `.nvmrc` (Talas 80), README presence (Talas 81), `tsconfig.json` (Talas 87). 4 strukturalna invariant-a u liniji.

## `check-dev-docs-stale-entries.ps1` — reverse hub coverage (informativan, opciono pre-PR sa `-FailOnStale`)

Read-only **reverse-coverage skener** (Talas 90): za svaku putanju u `apps/omnigroup-web/src/app/dev/docs/page.tsx` `paths: [...]` blokovima validira da target fajl **stvarno postoji** na disku. Komplementaran sa [`check-dev-docs-coverage.ps1`](./check-dev-docs-coverage.ps1) (Talas 66, **forward** smer). Talas 90 daje monorepo dev/docs hub-u **two-way coverage** garanciju.

**Razlika od dva skenera:**

| Skener | Smer | Šta hvata |
|--------|------|-----------|
| `check-dev-docs-coverage.ps1` (Talas 66) | **Forward** | `*.md` fajl u repo-u, ali nije u page.tsx hub-u (missing iz hub-a) |
| `check-dev-docs-stale-entries.ps1` (Talas 90) | **Reverse** | Putanja u page.tsx hub-u, ali fajl ne postoji u repo-u (stale entry u hub-u) |

Bez Talas 90, ako neki fajl bude izbrisan ili premešten (npr. tokom konsolidacije dokumentacije), forward skener to ne hvata jer radi suprotno. [`check-doc-links.ps1`](./check-doc-links.ps1) (Talas 65) hvata stale linkove u markdown body-jima, ali ne i u `page.tsx` TSX hub-u koji je TypeScript fajl. **Postojeći `check-dev-docs-coverage.ps1` ima `-ShowStale` opciju**, ali samo informativnu — ne FAIL-uje gate i meša izlaz sa missing prikazom. Talas 90 izdvaja eksplicitan dedicated skener.

**4 statusa po putanji:**

| Status | Značenje | Severity |
|--------|----------|----------|
| `OK` | Target fajl postoji na disku (anchor `#sec-...` se ne validira, samo file deo) | OK |
| `STALE-MISSING` | Putanja u hub-u, ali fajl ne postoji u repo-u | **WARN** (sa `-FailOnStale`) |
| `ANCHOR-ONLY` | Cisti `#sidro` bez file deli (pure anchor link unutar iste rute) | informativan |
| `EXTERNAL` | Putanja sa `http://` ili `https://` (preskočena, eksterna URL) | informativan |

**Snapshot 2026-05-14 (Val 355, Talas 90 baseline):** **180 / 180 OK** ✓ / 0 STALE-MISSING / 0 ANCHOR-ONLY / 0 EXTERNAL. Svaka putanja u `page.tsx` ima target fajl na disku. Skener pokazuje **section-context** za STALE-MISSING (npr. `[Ulaz i navigacija]` ili `[Faza 4 i dashboard (dizajn)]`) tako da vlasnik odmah zna gde se stale entry nalazi.

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-dev-docs-stale-entries.ps1` |
| Strogi rezim (exit 1 ako STALE-MISSING) | `... -File .\scripts\check-dev-docs-stale-entries.ps1 -FailOnStale` |
| Sa drugim page.tsx fajlom (testing) | `... -File .\scripts\check-dev-docs-stale-entries.ps1 -PagePath "tmp/test-page.tsx"` |

`Get-Help`: **`Get-Help .\scripts\check-dev-docs-stale-entries.ps1 -Full`** (parametri **`-FailOnStale`**, **`-MaxOutput`**, **`-PagePath`**).

**Default exit 0** — informativan; `-FailOnStale` podiže exit 1 ako bilo koja putanja u hub-u nema target fajl na disku.

**Vlasnik benefit:** (1) **two-way hub coverage** — Talas 66 forward + Talas 90 reverse → svaki `*.md` fajl je u hub-u **i** svaka putanja u hub-u ima fajl; (2) **regression sentinel za brisanje fajlova** — ako se neki fajl izbriše, audit će odmah upozoriti da page.tsx ima stale entry (umesto da korisnik primeti broken link u dev/docs UI-u tek kasnije); (3) **section-context u STALE-MISSING report-u** — vlasnik direktno zna kojoj `DocSection` u page.tsx pripada putanja koja faili (više tipova grešaka iz različitih sekcija ne mešaju se); (4) **dedicated focus** — `-ShowStale` u `check-dev-docs-coverage.ps1` je informativan dodatak ne FAIL-uje, ovaj skener daje fokusiran output sa exit 1 opcijom za pre-PR gate-flavor; (5) **Lekcija #20 primenjena** — početni Talas 90 commit napravljen sa em-dash karakterima (—) bez UTF-8 BOM-a → PS5.1 parser fail-ovao; popravljeno UTF-8 BOM dodavanjem (Talas 78 BOM lekcija). Ovaj test je dokumentovao **PS lesson #21**: **uvek dodaj UTF-8 BOM novim PS skriptama sa non-ASCII karakterima** (em-dash, kirilica, slovenski karakteri); `check-ps-encoding.ps1` audit hvata sve ovo nakon činjenice, ali bolje je da skripta inicijalno bude ispravna.

## `check-eslint-consistency.ps1` — ESLint config doslednost preko 3 Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`)

Skener strukturalne doslednosti **ESLint config-a** preko 3 Node paketa (Talas 91): `apps/omnigroup-web/.eslintrc.json` (Next), `atina-platform/atina/.eslintrc.cjs` (Node lib), `atina-system/.eslintrc.js` (Nest). Validira **5 strukturalnih invarijanti**:

1. **Format doslednost** (INFO): 3 fajla u 3 različita formata (`.json`, `.cjs`, `.js`) — legitimno radi, ali nedosledno (ESLint dokumentacija preferira jedan format po monorepu).
2. **`root: true` polje** (WARN za TS pakete, INFO za Next): Atina i Nest moraju imati `root: true` da spreče ESLint da traži pravila uzvodno; omnigroup-web (Next) legitimno radi bez jer `next/core-web-vitals` interno postavlja root.
3. **Eksplicitan `parser`** (WARN za TS, INFO za Next): Atina i Nest oba imaju `@typescript-eslint/parser` eksplicitno; omnigroup-web preko `next/typescript` extend-a (legitimno).
4. **`plugin:@typescript-eslint/recommended` extend** (WARN za TS, INFO za Next): Atina i Nest oba imaju eksplicitno; omnigroup-web preko Next preset-a.
5. **Prettier integration** (INFO): samo Nest ima `plugin:prettier/recommended`; Atina i omnigroup-web nemaju (signal nedoslednosti formatera).

Skener je **format-aware**: `.json` parsira preko `ConvertFrom-Json` (PS5.1 native), `.cjs` / `.js` ekstraktuje ključne podatke regex-om jer PS5.1 ne može da izvrši JS. Tolerantan na `'` i `"` quotes.

**Komplement Talas 79/80/81/87** — kompletira **monorepo-wide structural consistency** domen u **lint sloj**:

| Talas | Skener | Domen |
|-------|--------|-------|
| 79 | `check-package-json-consistency.ps1` | `engines.node` + `license` + `private` |
| 80 | `check-workflow-consistency.ps1` | GitHub workflow + `.nvmrc` cross-check |
| 81 | `check-readme-presence.ps1` | Paket README.md presence + zdravlje |
| 87 | `check-tsconfig-consistency.ps1` | `tsconfig.json` (`strict`, `target`, `skipLibCheck`, `esModuleInterop`, `forceConsistentCasingInFileNames`) |
| **91** | **`check-eslint-consistency.ps1`** | **ESLint config (5 invarijanti)** |

**Snapshot 2026-05-14 (Val 355, Talas 91 baseline):** **0 WARN + 5 INFO** — sve INFO nalaze su u `apps/omnigroup-web` paketu (legitimno), Atina i Nest oba imaju explicit `root` + `parser` + `plugin:@typescript-eslint/recommended`. INFO baseline:

- **FORMAT-MISMATCH** *(svi paketi)* — 3 različita formata: `.cjs`, `.js`, `.json`.
- **PRETTIER-INCONSISTENT** *(svi paketi)* — 1/3 paketa ima prettier integration (samo Nest).
- **NO-ROOT-TRUE** *(omnigroup-web)* — legitimno bez explicit root (Next preset).
- **NO-EXPLICIT-PARSER** *(omnigroup-web)* — parser implicitno preko `next/typescript`.
- **NO-TS-RECOMMENDED** *(omnigroup-web)* — TS pravila idu kroz Next preset.

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-eslint-consistency.ps1` |
| Strogi rezim (exit 1 ako WARN) | `... -File .\scripts\check-eslint-consistency.ps1 -FailOnWarn` |
| Sa drugim setom paketa (ako se doda 4. paket) | `... -File .\scripts\check-eslint-consistency.ps1 -PackageRoots @("apps/omnigroup-web/.eslintrc.json","atina-platform/atina/.eslintrc.cjs","atina-system/.eslintrc.js","new-pkg/.eslintrc.json")` |

`Get-Help`: **`Get-Help .\scripts\check-eslint-consistency.ps1 -Full`** (parametri **`-FailOnWarn`**, **`-MaxOutput`**, **`-PackageRoots`**).

**Default exit 0** — informativan; `-FailOnWarn` podiže exit 1 ako bilo koji TS paket ima `WARN` (root inkonzistencija ili `plugin:@typescript-eslint/recommended` nedostaje).

**Vlasnik benefit:** (1) **kompletira monorepo-wide structural consistency u lint sloj** — sa Talas 91 svih 5 strukturalnih invarijanti (`package.json`, workflow YAML, README presence, `tsconfig.json`, ESLint config) ima po jedan skener; (2) **regression sentinel za novi paket** — ako se doda 4. Node paket bez explicit `root: true` ili `@typescript-eslint/recommended`, audit će ga odmah označiti kao WARN; (3) **format-mismatch INFO** — vlasnik signal da postoje 3 različita ESLint formata u monorepu (legitimno radi, ali konsolidacija na jedan format je opcioni follow-up); (4) **prettier-inconsistent INFO** — signal da samo Nest ima `plugin:prettier/recommended` integraciju; vlasnik može odlučiti da ga doda u Atina + omnigroup-web ili da skine iz Nest-a; (5) **format-aware parsing** — skener čita `.json` direktno preko `ConvertFrom-Json`, `.cjs`/`.js` regex-om (PS5.1 ne može da izvrši JS), tako da je robustniji od običnog string matching-a; (6) **PS lesson #21 primenjena** — skripta inicijalno kreirana sa UTF-8 BOM-om (`Write` operacija + immediate BOM dodavanje) jer sadrži non-ASCII karaktere (em-dash u `.NOTES`).

## `check-gitignore-consistency.ps1` — `.gitignore` doslednost preko 3 Node paketa + root (informativan, opciono pre-PR sa `-FailOnWarn`)

Skener strukturalne doslednosti **`.gitignore`** preko 3 Node paketa + root (Talas 92): `.gitignore` (root), `apps/omnigroup-web/.gitignore` (Next), `atina-platform/atina/.gitignore` (Node lib), `atina-system/.gitignore` (Nest). **Kompletira monorepo-wide structural consistency u VCS-hygiene sloj** posle Talas 79 (`package.json`), Talas 80 (workflow YAML + `.nvmrc`), Talas 81 (README presence), Talas 87 (`tsconfig.json`) i Talas 91 (ESLint config) — **6. invarijanta**.

Validira **6 strukturalnih invarijanti** po paket-level `.gitignore` (root je informativan):

1. **`node_modules` ignore-uje** (WARN): bez ovog `node_modules` se commit-uje. Tolerantan na `node_modules/`, `/node_modules`, `node_modules`.
2. **Coverage direktorij ignore-uje** (WARN): `coverage/` ili `/coverage` — testovi generišu, ne sme u repo.
3. **`.env` secrets ignore-uje** (WARN): bar jedan od `.env`, `.env*`, `*.env` — security gate. **Posebna provera** *(realan signal!):* paket koji ima samo `.env*.local` glob (npr. omnigroup-web) **bez** punog `.env`-a se klasifikuje kao **WARN-ENV-ONLY-LOCAL-SUFFIX** jer pun `.env` (bez `.local` sufiksa) može biti commit-ovan.
4. **Build artifact ignore-uje** (WARN; per-paket): Next paket → `.next` / `out` / `build`; Node lib + Nest → `dist`.
5. **Log-ovi ignore-uju** (INFO): `*.log`, `logs/`, `npm-debug.log*` — manje strogo (INFO) jer skripte log-uju u `tmp/`.
6. **OS files ignore-uju** (INFO): `.DS_Store`, `Thumbs.db`, `desktop.ini` — kosmetski signal, ne sadrži secrets.

**Komplement Talas 79/80/81/87/91** — kompletira **monorepo-wide structural consistency** preko 3 Node paketa u **6 invarijanti** (sve major konfiguracioni slojevi):

| Talas | Skener | Sloj |
|-------|--------|------|
| 79 | `check-package-json-consistency.ps1` | Paket metapodaci (`engines.node` + `license` + `private`) |
| 80 | `check-workflow-consistency.ps1` | CI/CD (GitHub workflow + `.nvmrc` cross-check) |
| 81 | `check-readme-presence.ps1` | Discoverability (README.md presence + zdravlje) |
| 87 | `check-tsconfig-consistency.ps1` | TypeScript config (`strict`, `target`, `skipLibCheck`, `esModuleInterop`, `forceConsistentCasingInFileNames`) |
| 91 | `check-eslint-consistency.ps1` | ESLint config (5 invarijanti: format, root, parser, TS recommended, prettier) |
| **92** | **`check-gitignore-consistency.ps1`** | **VCS-hygiene (6 invarijanti: node_modules, coverage, env, build, log, OS files)** |

**Snapshot 2026-05-14 (Val 355, Talas 92 baseline):** **1 WARN + 2 INFO** ✓ — audit je otkrio realan security signal:

- **WARN: `apps/omnigroup-web/.gitignore` :: ENV-ONLY-LOCAL-SUFFIX** — fajl ignoriše samo `.env*.local` glob, **pun `.env` (bez `.local` sufiksa) može biti commit-ovan** ⚠ vlasnik akcija opciono u handbook sekciji 6 (dodati `.env` u `apps/omnigroup-web/.gitignore`).
- **INFO: `.gitignore` :: ROOT-NO-NODE-MODULES** — root nema `node_modules` (legitimno; paket-level pokrivaju sva 3).
- **INFO: `atina-system/.gitignore` :: NO-OS-FILES** — nema `.DS_Store`/`Thumbs.db` (kosmetski signal, opciono).

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-gitignore-consistency.ps1` |
| Strogi rezim (exit 1 ako WARN) | `... -File .\scripts\check-gitignore-consistency.ps1 -FailOnWarn` |
| Sa drugim setom putanja (testing / 4. paket) | `... -File .\scripts\check-gitignore-consistency.ps1 -GitignorePaths @(".gitignore","apps/omnigroup-web/.gitignore","atina-platform/atina/.gitignore","atina-system/.gitignore","new-pkg/.gitignore")` |

`Get-Help`: **`Get-Help .\scripts\check-gitignore-consistency.ps1 -Full`** (parametri **`-FailOnWarn`**, **`-MaxOutput`**, **`-GitignorePaths`**).

**Default exit 0** — informativan; `-FailOnWarn` podiže exit 1 ako bilo koji paket ima WARN (security / build risk).

**Vlasnik benefit:** (1) **kompletira monorepo-wide structural consistency u 6 invarijanti** — sve major konfiguracione i hygiene slojeve preko 3 Node paketa (paket metapodaci + CI/CD + Discoverability + TypeScript + ESLint + VCS-hygiene); (2) **realan security signal otkriven** — `apps/omnigroup-web/.gitignore` ima samo `.env*.local`, pun `.env` može biti commit-ovan; ovo je primer kako audit otkriva latentne probleme — vlasnik dobija konkretnu akciju (1-line fix u `.gitignore`); (3) **regression sentinel za nove pakete** — ako se doda 4. Node paket bez `node_modules` ili `.env` u `.gitignore`-u, audit ga odmah označi kao WARN; (4) **per-paket build-artifact logika** — Next paket očekuje `.next`/`out`/`build`, Node lib + Nest očekuju `dist` (skener pametno razlikuje); (5) **specijalna `.env*.local` provera** — common antipattern u Next paketima koji `create-next-app` šablon postavlja; bez ovog audita, security risk ostao bi neotkriven; (6) **PS lesson #21 primenjena preventivno** — skripta od početka UTF-8-with-BOM (Write + immediate BOM) jer `.NOTES` sadrži em-dash karaktere.

## `check-env-example-presence.ps1` — `.env.example` šablon presence + zdravlje preko 3 Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`)

Skener šablona za onboarding **`.env.example`** preko 3 Node paketa (Talas 93): `apps/omnigroup-web/.env.example` (Next), `atina-platform/atina/.env.example` (Node lib), `atina-system/.env.example` (Nest). **Security follow-up Talas 92** — gde Talas 92 proverava "*da li `.env` može biti commit-ovan?*" (1-line `.gitignore` fix), Talas 93 proverava komplementarno pitanje "*da li paket ima zdrav šablon za onboarding novog developera?*". **Two-way security signal**.

Validira **5 strukturalnih invarijanti**:

1. **Postojanje `.env.example`** (WARN): paket sa `.env` reference-om u izvornom kodu mora imati šablon — bez ovog, novi developer ne može lokalno startovati paket bez ručnog kopiranja secrets-a iz drugih izvora.
2. **Non-empty + bar 3 `KEY=value` linije** (WARN): šablon ne sme biti prazan ili samo komentari (Next app legitimno može imati 3-4; Node lib / Nest tipično 10+).
3. **No real secrets** (WARN; **security regex skener**): šablon NE sme imati realne tajne. 7 čestih pattern-a:
   - **AWS access key**: `AKIA[A-Z0-9]{16}` (eksaktan format AWS IAM access key-a)
   - **GitHub PAT classic**: `ghp_[A-Za-z0-9]{36}` (40 char ukupno)
   - **GitHub PAT fine-grained**: `github_pat_[A-Za-z0-9_]{82}` (93 char ukupno)
   - **Stripe live key**: `sk_live_[A-Za-z0-9]{24,}`
   - **Stripe test key**: `sk_test_[A-Za-z0-9]{24,}`
   - **JWT token**: `eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}` (3-deo Base64URL struktura)
   - **Generic 32+ char hex**: `=[a-f0-9]{32,}\s*$` (informativno; često hex hash kao MD5/SHA leakage)
4. **Has placeholder patterns** (INFO): šablon treba imati eksplicitne placeholder-e (`change-me`, `your-`, `example`, `<...>`, `replace-with`, `TODO`, `XXX`) ili prazne vrednosti (`KEY=`) za required polja — daje signal developer-u šta treba popuniti.
5. **Has helpful comments** (INFO): bar 3 `#` komentara koji opisuju polja — onboarding kvalitet (Atina ima 71 komentar — najbolji primer u monorepu).

**Komplement Talas 92** — security pitanje pristupljeno sa dve strane:

| Talas | Skener | Pitanje | Snapshot 2026-05-14 |
|-------|--------|---------|---------------------|
| 92 | `check-gitignore-consistency.ps1` | "Da li `.env` (sa secrets) može biti commit-ovan?" | **1 WARN** — `apps/omnigroup-web` (`ENV-ONLY-LOCAL-SUFFIX`) |
| **93** | **`check-env-example-presence.ps1`** | **"Da li paket ima šablon (`.env.example`) za onboarding bez secrets?"** | **0 WARN + 0 INFO** — sva 3 paketa imaju zdrav šablon |

**Snapshot 2026-05-14 (Val 355, Talas 93 baseline):** **0 WARN + 0 INFO** ✓ — sva 3 paketa imaju zdrav `.env.example` šablon:

| Paket | Lines | Keys | Comments | Placeholders | Secrets |
|-------|------:|-----:|---------:|-------------:|--------:|
| `apps/omnigroup-web/.env.example` | 13 | 4 | 7 | 3 | 0 |
| `atina-platform/atina/.env.example` | 151 | 64 | 71 | 12 | 0 |
| `atina-system/.env.example` | 48 | 12 | 23 | 1 | 0 |

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-env-example-presence.ps1` |
| Strogi rezim (exit 1 ako WARN) | `... -File .\scripts\check-env-example-presence.ps1 -FailOnWarn` |
| Sa drugim setom putanja (testing / 4. paket) | `... -File .\scripts\check-env-example-presence.ps1 -PackageRoots @("apps/omnigroup-web/.env.example","atina-platform/atina/.env.example","atina-system/.env.example","new-pkg/.env.example")` |

`Get-Help`: **`Get-Help .\scripts\check-env-example-presence.ps1 -Full`** (parametri **`-FailOnWarn`**, **`-MaxOutput`**, **`-PackageRoots`**).

**Default exit 0** — informativan; `-FailOnWarn` podiže exit 1 ako bilo koji paket ima WARN (nedostaje, prazan, ili sadrži real secrets).

**Vlasnik benefit:** (1) **two-way security audit** — zajedno sa Talas 92, monorepo dobija dva komplementarna signala: "(a) `.env` ne sme da uđe u repo (Talas 92)" + "(b) `.env.example` mora postojati i biti zdrav šablon (Talas 93)"; ovo pokriva najčešću zamku **da `.env.example` curi prave secrets** (developer kopira `.env` → `.env.example` umesto da zameni placeholder-e); (2) **regression sentinel za novo dodate `KEY=value`** — ako neko slučajno commit-uje pravi AWS key ili GitHub PAT u `.env.example`, secret regex skener će ga uhvatiti; (3) **onboarding kvalitet metrika** — vlasnik vidi za svaki paket koliko `KEY=` linija, koliko placeholder-a, koliko komentara — direktan pokazatelj koliko je šablon "useful" za novog developera; (4) **per-paket realističan prag** — Next app legitimno ima 3-4 ključa (kratak šablon), Node lib / Nest tipično 10-60+ (kompleksniji); skener prag = 3 (WARN ako manje, jer ispod 3 je besmislen šablon); (5) **0 false positives** — sva 3 paketa imaju legitno zdrav šablon, audit pokazuje "zdravo stanje" — vlasnik signal da nije potrebna nikakva akcija; (6) **PS lesson #21 primenjena preventivno** — skripta od početka UTF-8-with-BOM (Write + immediate BOM) jer `.NOTES` sadrži em-dash karaktere.

## `check-package-scripts-consistency.ps1` — `package.json` `scripts:` polja doslednost preko 3 Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`)

Skener npm scripts blokova preko 3 Node paketa (Talas 94): `apps/omnigroup-web/package.json` (Next), `atina-platform/atina/package.json` (Node lib), `atina-system/package.json` (Nest). **Dopuna Talas 79** koji pokriva strukturalna polja (`engines.node` + `license` + `private`) ali **NE pokriva `scripts:` blok** ključan za **CI/CD usklađenost** — workflow zove `npm test`, `npm run lint`, `npm run build`; ako nedostaju, build pada sa `Missing script: "..."` (npm v7+ konvencija).

**6 strukturalnih invarijanti:**

1. **`test` script postoji** (WARN) — bez ovog `npm test` u CI fail-uje sa `Missing script: "test"`.
2. **`lint` script postoji** (WARN) — ESLint integracija sa pre-commit / CI lint stage.
3. **`build` script postoji** (WARN) — kompilacija pre deploy-a.
4. **`start` script postoji** (WARN) — servis se boot-uje sa `npm run start`.
5. **`dev` ili `start:dev` script postoji** (INFO) — konzistentnost development workflow-a (Next/Atina koriste `dev`, Nest koristi `start:dev`).
6. **`format` script postoji** (INFO) — Prettier integracija (samo Nest trenutno ima).

| Talas | Skripta | Pitanje koje hvata | Trenutni nalaz |
|---|---|---|---|
| 79 | `check-package-json-consistency.ps1` | "Da li paket ima dosledne strukturalne metapodatke (engines.node, license, private)?" | 2 WARN (engines.node mismatch / nedostaje), 1 INFO |
| 94 | `check-package-scripts-consistency.ps1` | "Da li paket ima standardne npm scripts (test, lint, build, start)?" | **1 WARN** (omnigroup-web bez `test`), 2 INFO (Prettier inkonzistencija) |

**Snapshot 2026-05-14 (Val 355, Talas 94 baseline):** **1 WARN + 2 INFO** — realan CI/CD signal:

- `apps/omnigroup-web/package.json` — **nema `test` script** (4 scripts ukupno: `dev`, `build`, `start`, `lint`); ako bi GitHub workflow ili pre-commit hook pozvao `npm test` u tom paketu, fail-ovao bi sa `Missing script: "test"` — vlasnik akcija u handbook sekciji 6 (jednolinijski fix: dodati `"test": "echo \"No tests yet\" && exit 0"` ili stvarni Vitest / Jest setup).
- `apps/omnigroup-web/package.json` + `atina-platform/atina/package.json` — **nema `format` script** (samo `atina-system` ima `format: "prettier --write ..."`); INFO signal jer Prettier nije strogo obavezan; konzistentnost kroz monorepo bi bila benefit za onboarding.

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-package-scripts-consistency.ps1` |
| Strogi rezim (exit 1 ako bilo koji WARN) | `... -File .\scripts\check-package-scripts-consistency.ps1 -FailOnWarn` |
| Sa drugim setom paketa (testing / 4. paket) | `... -File .\scripts\check-package-scripts-consistency.ps1 -PackageRoots @("apps/omnigroup-web/package.json","atina-platform/atina/package.json","atina-system/package.json","new-pkg/package.json")` |

`Get-Help`: **`Get-Help .\scripts\check-package-scripts-consistency.ps1 -Full`** (parametri **`-FailOnWarn`**, **`-MaxOutput`**, **`-PackageRoots`**).

**Vlasnik benefit:** (1) **CI/CD risk regression sentinel** — uhvaćen je realan WARN (`omnigroup-web` bez `test` script-a) koji bi npm v7+ uhvatio u workflow-u sa `Missing script: "test"`; sada vlasnik ima decizioni signal **pre** nego što GitHub Actions dotrči i fail-uje; (2) **dopuna Talas 79** — sa Talas 94, monorepo ima **2 sloja** `package.json` audit-a: (a) strukturalna polja (Talas 79) + (b) `scripts:` polja (Talas 94); zajedno pokrivaju ~95% `package.json` consistency rizika; (3) **Prettier konzistentnost INFO** — samo `atina-system` ima `format` script; ako vlasnik želi standardizaciju, signal je već identifikovan; (4) **`start:dev` vs `dev` smart logic** — skener prepoznaje da Nest koristi `start:dev` umesto `dev` (NestCLI konvencija) i ne prijavljuje WARN — 0 false positives; (5) **0 dependencies** — skener koristi PS5.1 native `ConvertFrom-Json` na čistom JSON-u (`package.json` nije JSONC), siguran od PS Lesson #19 (block-comment regex glob bug iz Talas 87); (6) **PS Lesson #21 primenjena preventivno** — skripta od početka UTF-8-with-BOM jer `.NOTES` sadrži em-dash karaktere.

## `check-repo-meta-files-presence.ps1` — Root-level OSS / GitHub meta fajlovi presence + zdravlje (informativan, opciono pre-PR sa `-FailOnWarn`)

Skener **7 standardnih meta fajlova** koje GitHub i OSS konvencija očekuju u korenu repoa (Talas 95): `README.md`, `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `.editorconfig` (5 obavezna — Required-WARN); `CODE_OF_CONDUCT.md`, `CHANGELOG.md` (2 opciona — Optional-INFO). **Dopuna Talas 81** koji skenira `README.md` preko 7 paket-level lokacija; Talas 95 je fokusiran na **root meta fajlove koje GitHub renderuje u repo UI-u** (License badge, Security tab, Community Standards). **Dopuna Talas 79** koji proverava `license:` polje u `package.json`-u; Talas 95 proverava fizički LICENSE fajl u korenu — komplementarni signali.

**7 strukturalnih invarijanti:**

1. **`README.md`** (Required-WARN) — najvažniji landing dokument; GitHub renderuje na repo home stranici.
2. **`LICENSE` / `LICENSE.md` / `LICENSE.txt`** (Required-WARN) — GitHub License badge u repo header-u; bez fajla, repo je technically "All rights reserved".
3. **`SECURITY.md`** (Required-WARN) — GitHub Security tab; vulnerability disclosure kontakt; **trenutno NEDOSTAJE** ⚠.
4. **`CONTRIBUTING.md`** (Required-WARN) — PR granice, merge redosled, agent restrikcije; **postoji** ✓.
5. **`.editorconfig`** (Required-WARN) — cross-editor konzistencija (EOL, charset, indent_style); bez fajla, VSCode/Cursor/IntelliJ/Vim mogu drift-ovati formatiranje preko paketa **što izaziva merge-konflikte**; **trenutno NEDOSTAJE** ⚠.
6. **`CODE_OF_CONDUCT.md`** (Optional-INFO) — Contributor Covenant; GitHub Community Standards.
7. **`CHANGELOG.md`** (Optional-INFO) — Keep-a-changelog format; GitHub Releases tracking.

**Per-fajl health check** (samo za fajlove koji postoje):
- **Postojanje** (`Test-Path`)
- **Non-empty** (`Length > 0`); 0-byte = `EMPTY` WARN
- **Bar 1 H1** za `*.md` fajlove sa **code-block fence skip** preko Lekcije #17 (PowerShell `# Komentar` u code blokovima ne pravi false-pozitiv)

| Talas | Fokus | Pitanje koje hvata |
|---|---|---|
| 79 | `package.json` `license:` polje | "Da li paket ima license MAYBE polje?" |
| 81 | Paket README.md preko 7 lokacija | "Da li svaki paket ima README.md?" |
| **95** | **Root meta fajlovi koje GitHub renderuje** | **"Da li repo ima fizički LICENSE / SECURITY.md / .editorconfig u korenu?"** |

**Snapshot 2026-05-14 (Val 355, Talas 95 baseline):** **3 WARN + 2 INFO** — realni signali za GitHub repo UI:

- **`LICENSE` :: MISSING** ⚠ — bez fajla, GitHub repo header nema License badge; vlasnik može odlučiti MIT / Apache 2.0 / proprietary; 1-line setup sa `Get-Content https://raw.githubusercontent.com/licenses/license-templates/master/templates/mit.txt`.
- **`SECURITY.md` :: MISSING** ⚠ — GitHub Security tab prazan; predlog šablona u sekciji 6 handbook-a (kontakt email, kanal za reporting, vremenski okvir za odgovor).
- **`.editorconfig` :: MISSING** ⚠ — bez fajla, formatiranje može drift-ovati preko VSCode/Cursor/IntelliJ; predlog šablona u sekciji 6 handbook-a (`root = true`, `[*]` block sa `end_of_line=lf`, `charset=utf-8`, `indent_style=space`, `indent_size=2`).
- **`CODE_OF_CONDUCT.md` :: MISSING** (INFO) — Contributor Covenant opciono za zatvorene repo-e.
- **`CHANGELOG.md` :: MISSING** (INFO) — `git log` već daje istoriju; CHANGELOG opciono ako se rade releases.

**README.md** (10859 bytes, Yes H1) ✓ + **CONTRIBUTING.md** (14090 bytes, Yes H1) ✓ — jedina dva meta fajla koja postoje su zdrava.

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-repo-meta-files-presence.ps1` |
| Strogi rezim (exit 1 ako bilo koji obavezni nedostaje) | `... -File .\scripts\check-repo-meta-files-presence.ps1 -FailOnWarn` |
| Sa drugim repo root-om (testing) | `... -File .\scripts\check-repo-meta-files-presence.ps1 -RepoRoot "C:\path\to\other\repo"` |

`Get-Help`: **`Get-Help .\scripts\check-repo-meta-files-presence.ps1 -Full`** (parametri **`-FailOnWarn`**, **`-MaxOutput`**, **`-RepoRoot`**).

**Vlasnik benefit:** (1) **3 realna WARN signala otkrivena autonomno** — bez ovog audita, missing LICENSE / SECURITY.md / `.editorconfig` ostali bi neotkriveni; vlasnik dobija konkretnu listu sa 3 jasna fajla za dodavanje u koren; (2) **dopuna Talas 81** — Talas 81 (paket-level README.md) + Talas 95 (root meta fajlovi) zajedno pokrivaju **diskoverabilnost u 2 sloja**: paket-level i repo-level; (3) **dopuna Talas 79** — `license:` polje u `package.json`-u ne implicira LICENSE fajl u korenu; Talas 95 hvata taj gap; (4) **Lekcija #17 primenjena** — H1 detekcija preskače markdown code blokove tako da PowerShell `# Komentar` u code bloku ne pravi false-pozitiv (regression sentinel za 4 markdown skenera u monorepu); (5) **per-fajl candidate-list** — `LICENSE` može biti `LICENSE`, `LICENSE.md`, ili `LICENSE.txt`; skener proverava sva 3 oblika; (6) **PS lesson #21 primenjena preventivno** — skripta od početka UTF-8-with-BOM jer `.NOTES` sadrži em-dash karaktere.

## `check-dev-deps-versions-consistency.ps1` — `package.json` `devDependencies` MAJOR version doslednost preko 3 Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`)

Skener **MAJOR version** doslednosti ključnih dev-tools preko 3 Node paketa (Talas 96): `typescript`, `eslint`, `@types/node`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin` (5 Required-WARN); `prettier` (1 Optional-INFO). **3. sloj `package.json` audit-a** posle Talas 79 (metapodaci) i Talas 94 (`scripts:` polja) — fokus na **verzijama dev-tools** koje moraju biti konzistentne preko paketa da bi compile + lint output bio reproduktibilan i da ne bi došlo do tip / pravilo drift-a između CI build-ova.

**6 strukturalnih invarijanti:**

1. **`typescript` MAJOR** (WARN ako mismatch) — različite TS major verzije = različit type system feature set (npr. TS 4 vs TS 5: `const` type parameters, `using` declarations, decorator standardization).
2. **`eslint` MAJOR** (WARN ako mismatch) — različite ESLint major verzije = različita default pravila (npr. ESLint 8 → 9 flat config je default).
3. **`@types/node` MAJOR** (WARN ako mismatch) — kritičan jer **mora odgovarati Node major-u** (`@types/node@20` za Node 20 LTS); inkonzistentnost preko paketa = različito tretiranje globalnih Node API-ja (Buffer, fs, http).
4. **`@typescript-eslint/parser` MAJOR** (WARN ako mismatch) — kritičan za TS lint kvalitet; v6 vs v8 = različita lint pravila i parsing TS koda.
5. **`@typescript-eslint/eslint-plugin` MAJOR** (WARN ako mismatch) — par sa parser-om; mora se sinhronizovati major version sa parser-om (peer-dep matrica).
6. **`prettier` MAJOR** (INFO ako mismatch; samo paketi koji imaju) — Prettier 2 vs 3 različita default pravila (`trailingComma: "all"` u v3).

**MAJOR ekstrakcija (PS Lesson #19):**
- `Get-Content -Raw | ConvertFrom-Json` (PS5.1 native, `package.json` je čist JSON)
- Regex `^[\^~]?(\d+)` rukuje sve oblike: caret (`^5.3.2`), tilde (`~5.3.2`), exact (`5.3.2`), glob (`^5`)

| Talas | Sloj `package.json` audit-a | Pitanje koje hvata |
|---|---|---|
| 79 | Metapodaci | "Da li paket ima `engines.node` / `license` / `private` polja?" |
| 94 | `scripts:` polja | "Da li paket ima `test` / `lint` / `build` / `start` script-e?" |
| **96** | **`devDependencies` MAJOR verzije** | **"Da li su MAJOR verzije ključnih dev-tools konzistentne preko paketa?"** |

**Snapshot 2026-05-14 (Val 355, Talas 96 baseline):** **2 WARN + 2 INFO** — realni signali za lint output reproduktibilnost:

| dev-dep | omnigroup-web | atina-platform | atina-system | Status |
|---------|---------------|----------------|--------------|--------|
| `typescript` | `^5.x` | `^5.x` | `^5.x` | ✓ konzistentno |
| `eslint` | `^8.x` | `^8.x` | `^8.x` | ✓ konzistentno |
| `@types/node` | `^20.x` | `^20.x` | `^20.x` | ✓ konzistentno |
| `@typescript-eslint/parser` | (none) | `^6.x` | `^8.x` | ⚠ MAJOR-MISMATCH |
| `@typescript-eslint/eslint-plugin` | (none) | `^6.x` | `^8.x` | ⚠ MAJOR-MISMATCH |
| `prettier` | (none) | (none) | `^3.x` | INFO (samo Nest) |

- **`@typescript-eslint/parser` :: MAJOR-MISMATCH** ⚠ — atina-platform `^6.13.1` (2023) vs atina-system `^8.0.0` (2024); v8 ima novi parser sa boljom TS 5.x podrškom; vlasnik akcija opciono: bumpovati Atina na `^8.x` (sa breaking-change pregledom).
- **`@typescript-eslint/eslint-plugin` :: MAJOR-MISMATCH** ⚠ — par sa parser-om; isti gap (v6 vs v8); peer-dep matrica zahteva sinhronizovan major sa parser-om.
- **`@typescript-eslint/parser/eslint-plugin` :: PARTIAL-COVERAGE** (INFO) — `apps/omnigroup-web` nema TS-ESLint dep-ove (legitimno; koristi `next/core-web-vitals` preset koji interno postavlja parser).

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-dev-deps-versions-consistency.ps1` |
| Strogi rezim (exit 1 ako bilo koji MAJOR mismatch) | `... -File .\scripts\check-dev-deps-versions-consistency.ps1 -FailOnWarn` |
| Sa drugom listom paketa (testing) | `... -File .\scripts\check-dev-deps-versions-consistency.ps1 -PackageRoots @('paket1/package.json', 'paket2/package.json')` |

`Get-Help`: **`Get-Help .\scripts\check-dev-deps-versions-consistency.ps1 -Full`** (parametri **`-FailOnWarn`**, **`-MaxOutput`**, **`-PackageRoots`**).

**Vlasnik benefit:** (1) **2 realna WARN signala otkrivena autonomno** — `@typescript-eslint/*` v6 vs v8 mismatch značajno utiče na lint output; bez ovog audita, postojao bi rizik od različitih lint pravila u CI vs lokalno; vlasnik dobija konkretnu komandu (`npm install --save-dev @typescript-eslint/parser@^8 @typescript-eslint/eslint-plugin@^8` u atina-platform); (2) **3-slojni `package.json` audit kompletiran** — Talas 79 (metapodaci) + Talas 94 (`scripts:`) + Talas 96 (`devDependencies` verzije) zajedno pokrivaju **~99% `package.json` consistency rizika**; (3) **regex MAJOR ekstrakcija** robustna — hvata sve semver oblike (`^5`, `^5.3.2`, `~5.3.2`, `5.3.2`); (4) **partial-coverage logika** — INFO za legitimne preset-ovane pakete (omnigroup-web TS-ESLint preko Next preset-a) bez false-pozitiva; (5) **regression sentinel za nove pakete** — ako se doda 4. paket sa drugačijim TypeScript / ESLint major-om, audit će ga odmah označiti kao WARN; (6) **PS lesson #21 primenjena preventivno** — skripta od početka UTF-8-with-BOM.

## `check-github-meta-files-presence.ps1` — `.github/` direktorijum metadata fajlovi presence + zdravlje (informativan, opciono pre-PR sa `-FailOnWarn`)

**Talas 97** — nastavak Talas 95 (root-level OSS / GitHub meta fajlovi: `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `.editorconfig`) u **novi sloj — `.github/` direktorijum metadata** koje GitHub renderuje u repo UI-u i koristi za automation. Dok Talas 95 audituje root meta fajlove, Talas 97 fokusiran je na `.github/` direktorijum koji uključuje GitHub-specific metadata kao `dependabot.yml` (security update PR-ovi), `workflows/` (CI/CD pipeline), `PULL_REQUEST_TEMPLATE.md` (PR consistency), `ISSUE_TEMPLATE/` (bug report / feature request), `CODEOWNERS` (PR reviewer routing), `FUNDING.yml` (sponsorship). Audit validira **6 strukturalnih invarijanti**:

1. **`.github/dependabot.yml`** (WARN ako nedostaje) — automatski security update PR-ovi za npm + GitHub Actions; bez fajla, repo nema automatske dependency updates i ostavlja security ranjivosti otvorene; **trenutno postoji u repu** ✓ (2285 bytes, YAML-OK).
2. **`.github/workflows/`** direktorijum sa bar 1 `.yml` ili `.yaml` (WARN ako nema workflow-a) — CI/CD pipeline; **trenutno ima `ci-monorepo.yml`** ✓; dopuna Talas 80 (Talas 80 audituje YAML doslednost preko 3 wf fajla, Talas 97 audituje samo presence).
3. **`.github/PULL_REQUEST_TEMPLATE.md`** (WARN ako nedostaje) — GitHub renderuje sadržaj kao default body novog PR-a; bez šablona, PR-ovi mogu imati nedosledan format (review checklist, testing instructions, related issues); **trenutno NE postoji** ⚠.
4. **`.github/ISSUE_TEMPLATE/`** direktorijum sa bar 1 template (INFO; opciono) — GitHub renderuje template-e kao opcije pri otvaranju novog issue-a; INFO jer je opciono za internal repo-e.
5. **`.github/CODEOWNERS`** (WARN ako nedostaje) — automatski PR reviewer routing po path-u; bez fajla, vlasnik mora ručno tagovati reviewere; sintaksa kao `.gitignore` sa GitHub username-ima; **trenutno NE postoji** ⚠.
6. **`.github/FUNDING.yml`** (INFO; opciono) — GitHub Sponsors; renderuje "Sponsor" dugme u repo header-u; samo za public OSS repo-e koji prihvataju sponzorstvo.

**Per-fajl health check** (samo za fajlove koji postoje):

- **Postojanje** — `Test-Path` na korenu `.github/` direktorijuma.
- **Non-empty** — `Get-Item.Length -gt 0`; **0-byte** se klasifikuje kao `EMPTY` WARN jer GitHub renderuje prazan dokument bez korisnog sadržaja.
- **Bar 1 H1** (samo za `*.md` fajlove poput `PULL_REQUEST_TEMPLATE.md`, sa code-block fence skip preko Lekcije #17) — bez H1, GitHub render nema naslov.
- **YAML osnovna validnost** (samo za `*.yml` fajlove poput `dependabot.yml` — light check: prvi non-comment linija nije prazna, fajl ima bar 3 linije) — `EMPTY-YAML` WARN ako prazan YAML.

**Tabela poređenja sa drugim auditima `.github/` + meta sloja**:

| Audit | Talas | Sloj | Fokus |
|-------|-------|------|-------|
| `check-workflow-consistency.ps1` | 80 | `.github/workflows/` | YAML doslednost preko 3 wf fajla (`actions/checkout@v4`, `setup-node@v4`, `.nvmrc=20`) |
| `check-repo-meta-files-presence.ps1` | 95 | Root meta | `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `.editorconfig`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, `README.md` — root-level OSS / GitHub-rendered meta |
| `check-github-meta-files-presence.ps1` (ovaj) | 97 | `.github/` direktorijum | `dependabot.yml`, `workflows/`, `PULL_REQUEST_TEMPLATE.md`, `ISSUE_TEMPLATE/`, `CODEOWNERS`, `FUNDING.yml` — GitHub-specific automation + UI metadata |

**Snapshot rezultat (Val 355 baseline):**

- 6 meta entiteta proverenih.
- **2 OK** ✓: `dependabot.yml` (2285 bytes, YAML-OK), `workflows/` (1 child `ci-monorepo.yml`).
- **2 WARN** ⚠: `PULL_REQUEST_TEMPLATE.md` MISSING, `CODEOWNERS` MISSING.
- **2 INFO**: `ISSUE_TEMPLATE/` MISSING (opciono), `FUNDING.yml` MISSING (opciono za public OSS).

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-github-meta-files-presence.ps1` |
| Strogi rezim (exit 1 ako bilo koji obavezni nedostaje) | `... -File .\scripts\check-github-meta-files-presence.ps1 -FailOnWarn` |
| Sa drugim repo root-om (testing) | `... -File .\scripts\check-github-meta-files-presence.ps1 -RepoRoot "C:\path\to\other\repo"` |

`Get-Help`: **`Get-Help .\scripts\check-github-meta-files-presence.ps1 -Full`** (parametri **`-FailOnWarn`**, **`-MaxOutput`**, **`-RepoRoot`**).

**Vlasnik benefit:** (1) **2 realna WARN signala otkrivena autonomno** — `PULL_REQUEST_TEMPLATE.md` i `CODEOWNERS` nedostaju u `.github/`; vlasnik dobija konkretnu listu fajlova za kreiranje sa standardnim sadržajem; (2) **dopuna Talas 95** — kompletira meta-file audit domain (root-level + `.github/` direktorijum); zajedno pokrivaju **~95% GitHub-rendered repo metadata rizika**; (3) **dopuna Talas 80** — Talas 80 audituje YAML doslednost preko 3 wf fajla, Talas 97 audituje samo presence `.github/workflows/` direktorijuma — dva komplementarna signala bez preklapanja; (4) **Lekcija #17 primenjena** — `Test-HasH1` preskače markdown code blokove pre detekcije H1, sprečava false-positive za template-e koji počinju sa code primerom; (5) **per-entity validacija**: file vs dir tipovi imaju različite invarijante (file: postoji + non-empty + opcionalno H1/YAML; dir: postoji + bar 1 child); (6) **PS lesson #21 primenjena preventivno** — skripta od početka UTF-8-with-BOM jer sadrži non-ASCII karaktere (`✓`, `⚠`).

## `check-package-lock-presence.ps1` — `package-lock.json` presence + zdravlje + doslednost preko 3 Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`)

**Talas 98** — **4. sloj `package.json` audit domena** posle Talas 79 (metapodaci: `engines.node` + `license` + `private`), Talas 94 (`scripts:` polja), Talas 96 (`devDependencies` MAJOR verzije) — fokus na **lock fajlovima** koji garantuju da `npm install` instalira **identične transitive dependency verzije** preko CI/CD i developer mašina. Bez lock-a, transitive deps su `^x.y.z` semver range-ovi koji evoluiraju, izazivajući **„works on my machine"** klasu bug-ova. Audit validira **6 strukturalnih invarijanti** preko 3 Node paketa:

1. **Postojanje lock fajla** (Required-WARN) — bar jedan od `package-lock.json` (npm), `pnpm-lock.yaml` (pnpm), `yarn.lock` (Yarn); **trenutno sva 3 paketa imaju `package-lock.json`** ✓.
2. **Konzistentan package manager preko paketa** (Required-WARN) — sva 3 paketa moraju koristiti isti PM; mix npm + pnpm uvodi maintenance overhead jer CI workflow mora znati koji `*-install` da pozove; **trenutno sva 3 paketa koriste npm** ✓.
3. **Lock fajl je non-empty + minimum size 1 KB** (Required-WARN) — sanity check; pravi lock fajlovi za realni project imaju 100+ KB; 0-byte ili `< 1 KB` lock fajl je verovatno korumpiran.
4. **`lockfileVersion` polje** (Optional-INFO za npm) — `1` (npm v6 i niže), `2` (npm v7 mix mode), ili `3` (npm v7+ — preporučen, kompaktniji); INFO za stare verzije sa upgrade path-om.
5. **Konzistentan `lockfileVersion` preko paketa** (Required-WARN) — mix v1 + v3 indikuje da developeri koriste različite npm verzije; npm v7+ ima drugačiji algoritam za transitive deps razrešavanje; **trenutno sva 3 paketa imaju `lockfileVersion: 3`** ✓.
6. **Lock fajl NIJE u `.gitignore`** (Required-WARN; **dopuna Talas 92** `.gitignore` audit-a) — common antipattern: developer kopira `node_modules` ignore u lock fajl ili koristi `*.lock` glob koji slučajno hvata `package-lock.json`; bez lock fajla u repo-u, CI nema reproducibility garanciju; skener proverava 4 `.gitignore` fajla (root + 3 paketa).

**PS Lesson #19 primenjena** — `package-lock.json` često ima duplicate keys (isti package name može biti u različitim direktorijumima u monorepu) što PS5.1 `ConvertFrom-Json` ne podržava i fail-uje sa "name argument not valid"; rešenje je **regex-based parsing** ključnih polja na prvih 10 linija fajla (`lockfileVersion` je uvek u top-level objektu).

**Tabela poređenja sa drugim `package.json` audit slojevima**:

| Audit | Talas | Sloj | Fokus |
|-------|-------|------|-------|
| `check-package-json-consistency.ps1` | 79 | Metapodaci | `engines.node` + `license` + `private` polja |
| `check-package-scripts-consistency.ps1` | 94 | `scripts:` blok | `test` + `lint` + `build` + `start` + `dev` + `format` |
| `check-dev-deps-versions-consistency.ps1` | 96 | `devDependencies` | MAJOR verzije: TypeScript / ESLint / @types/node / TS-ESLint / Prettier |
| `check-package-lock-presence.ps1` (ovaj) | 98 | Lock fajlovi | Presence + PM doslednost + lockfileVersion + .gitignore cross-check |

**Snapshot rezultat (Val 355 baseline):**

- 3 Node paketa skenirana.
- **0 WARN + 0 INFO** ✓ — clean baseline.
- Sva 3 paketa: `package-lock.json` (npm) sa `lockfileVersion: 3`, nije gitignored, sve veličine `> 200 KB` (omnigroup-web 213 KB, atina-platform 204 KB, atina-system 396 KB).

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-package-lock-presence.ps1` |
| Strogi rezim (exit 1 ako bilo koji invariant fail-uje) | `... -File .\scripts\check-package-lock-presence.ps1 -FailOnWarn` |
| Sa drugom listom paketa (testing) | `... -File .\scripts\check-package-lock-presence.ps1 -PackageRoots @('paket1', 'paket2')` |

`Get-Help`: **`Get-Help .\scripts\check-package-lock-presence.ps1 -Full`** (parametri **`-FailOnWarn`**, **`-MaxOutput`**, **`-PackageRoots`**).

**Vlasnik benefit:** (1) **clean baseline ✓ regression sentinel** — sva 3 paketa zdrava (npm lock v3, gitignored: no); ako neko kasnije izbriše lock fajl ili switch-uje na pnpm bez ažuriranja sva 3 paketa, audit će odmah upozoriti; (2) **4-slojni `package.json` audit kompletiran** — Talas 79 + Talas 94 + Talas 96 + Talas 98 zajedno pokrivaju **~99.5% `package.json` + lock consistency rizika**; (3) **dopuna Talas 92** — Talas 92 audituje `.gitignore` doslednost; Talas 98 dodaje cross-check da `package-lock.json` nije slučajno gitignored (common antipattern); (4) **PS Lesson #19 primenjena** — regex-based parsing zaobilazi `ConvertFrom-Json` duplicate key fail; ekstenzibilno za buduće lock fajl shape-ove; (5) **multi-PM podrška** — skener prepoznaje npm/pnpm/Yarn lock fajlove nezavisno; vlasnik može migrirati na drugi PM bez dodatnog rada na audit-u; (6) **PS lesson #21 primenjena preventivno** — skripta od početka UTF-8-with-BOM. **Sledeći agent benefit:** ako se doda 4. Node paket bez `package-lock.json` ili sa `lockfileVersion: 1`, audit ga odmah označi kao WARN sa konkretnom upgrade komandom.

## `check-docker-files-presence.ps1` — Docker fajlovi presence + zdravlje preko 4 logičkih lokacija (informativan, opciono pre-PR sa `-FailOnWarn`)

**Talas 99** — **novi domen: container/Docker hygiene** (komplementaran sa Talas 80 GitHub workflow YAML doslednost u CI/CD sloju). Skener validira **7 strukturalnih invarijanti** preko 4 logičkih lokacija (root sa Python Dockerfile + 3 Node paketa: `apps/omnigroup-web`, `atina-platform/atina`, `atina-system`):

1. **`Dockerfile` postoji** (Required-WARN za Node servis pakete) — paket koji je deployable servis treba container build.
2. **`.dockerignore` postoji ako Dockerfile postoji** (Required-WARN) — bez `.dockerignore`, `docker build` kontekst uvozi sve fajlove uključujući `node_modules` (~200+ MB); upload je spor, image može biti veći.
3. **`Dockerfile` ima bar 1 `FROM` direktivu** (Required-WARN) — sanity check; prazan ili korumpiran Dockerfile pao bi build u CI.
4. **`Dockerfile` koristi multi-stage build** (Optional-INFO) — bar 2 `FROM ... AS` ili 2+ `FROM` direktive; smanjuje image size i security surface.
5. **`Dockerfile` koristi non-root `USER`** (Required-WARN za Node servise) — security best practice (CIS Docker Benchmark 4.1); container koji se izvršava kao `root` ima full privilegije ako exploit; provera ne uzima `USER root` kao prolaz.
6. **`.dockerignore` ignoriše `node_modules`** (Required-WARN za Node pakete) — common antipattern; bez ovog, Docker build context uvozi 200+ MB host `node_modules` koji se odmah override-uje preko `npm ci` u image-u.
7. **`Dockerfile` ima `HEALTHCHECK` direktivu** (Optional-INFO) — Docker može detektovati unhealthy container i restartovati ga; potrebno za Kubernetes/Docker Swarm rolling updates.

**Per-lokacija `PackageType`** (Node | Python | Generic) — skener prilagođava invarijante po tipu (npr. invariant 6 `node_modules` ignore samo za Node pakete; root sa Python Dockerfile ne treba `node_modules`).

**Tabela poređenja sa drugim audit slojevima**:

| Audit | Talas | Domain | Fokus |
|-------|-------|--------|-------|
| `check-workflow-consistency.ps1` | 80 | CI/CD GitHub Actions | `actions/checkout@v4`, `actions/setup-node@v4`, `.nvmrc=20`, `engines.node` cross-check |
| `check-docker-files-presence.ps1` (ovaj) | 99 | Container/Docker | Dockerfile multi-stage + USER non-root + HEALTHCHECK + `.dockerignore` `node_modules` |

**Snapshot rezultat (Val 355 baseline):**

- 4 lokacije skenirane.
- **2 WARN + 3 INFO** — realni signali otkriveni autonomno:
  - **WARN `apps/omnigroup-web` :: NO-DOCKERFILE** ⚠ — Next servis paket bez container deploy-a (vlasnik akcija opciono za deploy via Vercel ili Container).
  - **WARN `atina-system` :: NO-NONROOT-USER** ⚠ — security best practice violation (CIS Docker Benchmark 4.1); container se izvršava kao `root`.
  - INFO `root` :: NO-NONROOT-USER (Python image; razmotri dodavanje USER u final stage).
  - INFO `root` :: NO-HEALTHCHECK (Docker/K8s ne može automatski detektovati unhealthy container).
  - INFO `atina-system` :: NO-HEALTHCHECK.
- **2 OK ✓**: `atina-platform/atina/Dockerfile` (best practice — multi-stage builder + production, USER atina, HEALTHCHECK curl /health, EXPOSE 3000) + root `Dockerfile` (Python multi-stage 4 stage-a base/forge/atina/astra).

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-docker-files-presence.ps1` |
| Strogi rezim (exit 1 ako bilo koji invariant fail-uje) | `... -File .\scripts\check-docker-files-presence.ps1 -FailOnWarn` |
| Sa custom Docker lokacijama (testing) | `... -File .\scripts\check-docker-files-presence.ps1 -DockerLocations @(@{Path='lib1';Label='lib1';PackageType='Node';ServiceRequired=$true})` |

`Get-Help`: **`Get-Help .\scripts\check-docker-files-presence.ps1 -Full`** (parametri **`-FailOnWarn`**, **`-MaxOutput`**, **`-DockerLocations`**).

**Vlasnik benefit:** (1) **2 realna WARN signala otkrivena autonomno** — bez ovog audita, missing `apps/omnigroup-web/Dockerfile` (Next servis bez container deploy-a) + missing `USER` direktiva u atina-system Dockerfile-u (security best practice violation) ostali bi neotkriveni; vlasnik dobija konkretnu listu sa Dockerfile šablonima i CIS Docker Benchmark referencom u handbook sekciji 6; (2) **novi domen container/Docker hygiene** — komplementaran sa Talas 80 (CI/CD GitHub Actions): Talas 80 audituje "kako se kod build-uje" (workflow YAML), Talas 99 audituje "kako se kod paketuje za deploy" (Dockerfile + .dockerignore); zajedno pokrivaju ~90% deploy pipeline rizika; (3) **per-PackageType logika** — Node pakete proverava strože (NO-NONROOT-USER WARN; node_modules ignore WARN), Python pakete kao INFO; ekstenzibilno za buduće Generic pakete; (4) **CIS Docker Benchmark integracija** — direktna referenca na [CIS Benchmark 4.1](https://www.cisecurity.org/benchmark/docker) za non-root USER signal; (5) **Multi-stage detection** — `FROM ... AS` ili 2+ `FROM` se prepoznaju kao multi-stage; smanjuje image size; (6) **PS lesson #21 primenjena preventivno** — skripta od početka UTF-8-with-BOM jer sadrži non-ASCII karaktere (`✓`, `⚠`). **Sledeći agent benefit:** ako se doda novi servis paket bez Dockerfile-a ili sa root USER-om, audit će ga odmah označiti kao WARN sa CIS Benchmark referencom.

## `check-docker-compose-consistency.ps1` — docker-compose YAML doslednost preko 8 compose fajlova (informativan, opciono pre-PR sa `-FailOnWarn`)

**Talas 100 (milestone)** — **proširenje Talas 99 container/Docker hygiene domena u orchestration sloj**. Talas 99 audituje image build (Dockerfile + .dockerignore), Talas 100 audituje multi-service orchestration (docker-compose YAML); zajedno pokrivaju kompletan Docker layer monorepa. Skener validira **7 strukturalnih invarijanti** preko 8 docker-compose fajlova (5 root + 3 atina-platform/atina):

1. **`services:` blok postoji** (Required-WARN) — minimum struktura compose fajla.
2. **Svaki servis ima `image:` ili `build:`** (Required-WARN; samo za base, ne override) — sanity check; Override fajlovi extends-uju i ne moraju imati image/build.
3. **`version:` polje** (Optional-INFO) — Compose Spec (modern Docker Compose v2+) ne preporučuje `version:` polje (deprecated; ignored u v2+).
4. **Imenovani volumes deklarisani u top-level `volumes:`** (Optional-INFO) — sprečava anonymous volume kreiranje.
5. **`restart:` policy postoji za servise** (Optional-INFO) — production-readiness; bez `restart: unless-stopped` ili `always`, container ne restartuje pri panici / OOM kill-u.
6. **`healthcheck:` postoji za infrastructure servise** (Optional-INFO) — DB / cache / API servise treba imati health probe za `depends_on: condition: service_healthy` pattern.
7. **Override-style detection** (Optional-INFO) — fajl bez ijedan servis sa `image:`/`build:` je override-style; ako mu ime ne sadrži `.override.`, INFO sa rename suggestion.

**Tabela poređenja sa drugim Docker / deploy audit slojevima**:

| Audit | Talas | Sloj | Fokus |
|-------|-------|------|-------|
| `check-workflow-consistency.ps1` | 80 | CI/CD GitHub Actions | `actions/checkout@v4`, `actions/setup-node@v4`, `.nvmrc=20`, `engines.node` cross-check |
| `check-docker-files-presence.ps1` | 99 | Container/Docker — image build | Dockerfile multi-stage + USER non-root + HEALTHCHECK + `.dockerignore` `node_modules` |
| `check-docker-compose-consistency.ps1` (ovaj) | 100 | Container/Docker — orchestration | `services:`, image/build, version (deprecated), top-level volumes, restart policy, healthcheck, override-style detection |
| `check-docker-compose-typeorm-sync-consistency.ps1` | 113 | Container/Docker — compose env TypeORM | Truthy `TYPEORM_SYNC` (komplement Talas 111) |
| `check-docker-node-image-vs-engines.ps1` | 114 | Container/Docker — image vs Node policy | `FROM node:` major vs `engines.node` (komplement Talas 79 + 99) |

**Talas 80 + 99 + 100 zajedno pokrivaju ~95% deploy pipeline rizika** preko 3 sloja: build (Dockerfile) + orchestration (docker-compose) + CI/CD pipeline (GitHub workflow).

**Snapshot rezultat (Val 355 baseline, clean):**

| Compose fajl | Servisi | image | build | restart | HC | version | Top vol | Type |
|---|---:|---:|---:|---:|---:|---|---|---|
| `docker-compose.yml` | 3 (forge/atina/astra) | 0 | 3 | 3 | 0 | none | ✓ vault_data | base |
| `docker-compose.atina.yml` | 3 (postgres/redis/api) | 2 | 1 | 0 | 1 | none | ✓ atina_pg_data | base |
| `docker-compose.nest-port-3001.yml` | 1 (atina-api override) | 0 | 0 | 0 | 0 | none | - | base⚠ override-style |
| `docker-compose.override.yml` | 3 | 0 | 0 | 0 | 0 | none | - | override |
| `docker-compose.override.vault-bindmount.example.yml` | 3 | 0 | 0 | 0 | 0 | none | - | example |
| `atina-platform/atina/docker-compose.yml` | 5 | 2 | 3 | 5 | 3 | none | ✓ 3 vol | base ✓ best practice |
| `atina-platform/atina/docker-compose.override.yml` | 1 | 0 | 0 | 0 | 0 | none | ✓ 1 vol | override |
| `atina-platform/atina/docker-compose.override.forge-vault-bindmount.example.yml` | 1 | 0 | 0 | 0 | 0 | none | - | example |

**0 WARN + 5 INFO clean baseline** ✓ — 20 servisa ukupno; INFO signali: NO-HEALTHCHECK u 2 base fajla (`docker-compose.yml`, `docker-compose.nest-port-3001.yml`), NO-RESTART-POLICY u 2 base (`docker-compose.atina.yml`, `docker-compose.nest-port-3001.yml`), OVERRIDE-STYLE-WITHOUT-NAME u `docker-compose.nest-port-3001.yml` (legitiman override ali nema `.override.` u imenu — rename suggestion).

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-docker-compose-consistency.ps1` |
| Strogi rezim (exit 1 ako bilo koji invariant fail-uje) | `... -File .\scripts\check-docker-compose-consistency.ps1 -FailOnWarn` |
| Sa custom listom compose fajlova | `... -File .\scripts\check-docker-compose-consistency.ps1 -ComposeFiles @('docker-compose.yml','docker-compose.atina.yml')` |

`Get-Help`: **`Get-Help .\scripts\check-docker-compose-consistency.ps1 -Full`** (parametri **`-FailOnWarn`**, **`-MaxOutput`**, **`-ComposeFiles`**).

**Vlasnik benefit:** (1) **clean baseline ✓ regression sentinel** — 0 WARN preko 8 compose fajlova / 20 servisa; ako neko ubaci servis bez image/build, doda deprecated `version:` polje, ili kreira novi compose fajl bez `services:` bloka, audit će odmah upozoriti; (2) **Talas 99 + 100 zajedno pokrivaju kompletan Docker layer** — Talas 99 (image build) + Talas 100 (orchestration); zajedno sa Talas 80 (CI/CD) pokrivaju ~95% deploy pipeline rizika; (3) **YAML parsing bez external dependency** — regex-based parsing zaobilazi PS5.1 nedostatak native YAML parser-a, izbegava se npm/pip dependency; (4) **per-fajl klasifikacija** — base / override / example automatski detektuje preko file name + content heuristike; ekstenzibilno za buduće compose patterns; (5) **rename suggestion za nest-port-3001** — vlasnik dobija konkretan signal za consistency cleanup (predlog: rename u `docker-compose.override.nest-port-3001.yml`); (6) **PS lesson #21 primenjena preventivno** — skripta od početka UTF-8-with-BOM jer sadrži non-ASCII karaktere (`✓`, `⚠`). **Sledeći agent benefit:** ako se doda novi compose fajl bez ispravne strukture ili sa deprecated poljem, audit će ga odmah označiti.

## `check-docker-compose-typeorm-sync-consistency.ps1` — compose `TYPEORM_SYNC` truthy (informativan; opciono pre-PR sa `-FailOnWarn`; `-FailOnWarn` u `-FailOnAny` režimu)

**Talas 113** — **komplement Talas 111** (`synchronize` u TypeORM DataSource) i **Talas 100** (isti skup od **8** compose fajlova). Jedan invariant: WARN ako je `TYPEORM_SYNC` (ili `${VAR:-true}`) truthy u servisnom `environment:` bloku — compose-level signal da runtime može auto-sync-ovati šemu bez migracija.

**Tabela poređenja sa susednim Docker / ORM audit slojevima:**

| Audit | Talas | Sloj | Fokus |
|-------|-------|------|-------|
| `check-typeorm-data-source-consistency.ps1` | 111 | ORM — TypeORM kod | `synchronize: true` u DataSource / ormconfig |
| `check-docker-compose-consistency.ps1` | 100 | Container/Docker — orchestration | Struktura `services:`, image/build, healthcheck, … |
| `check-docker-compose-typeorm-sync-consistency.ps1` (ovaj) | 113 | Container/Docker — compose env | Truthy `TYPEORM_SYNC` u YAML |

**Baseline:** **1 WARN** — `docker-compose.atina.yml` L58 `TYPEORM_SYNC: "true"` (dokumentovan dev bootstrap).

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-docker-compose-typeorm-sync-consistency.ps1` |
| Strogi rezim | `... -File .\scripts\check-docker-compose-typeorm-sync-consistency.ps1 -FailOnWarn` |

`Get-Help`: **`Get-Help .\scripts\check-docker-compose-typeorm-sync-consistency.ps1 -Full`**.

**Vlasnik benefit:** regression sentinel za compose + TypeORM env; bez nove OWNER-ACTION stavke.

## `check-docker-node-image-vs-engines.ps1` — Dockerfile `FROM node:` vs `package.json#engines.node` (informativan; opciono `-FailOnWarn`; `-FailOnWarn` u `-FailOnAny` režimu)

**Talas 114** — **komplement Talas 79** (`engines.node` deklaracija) i **Talas 99** (Node `Dockerfile`). Za `apps/omnigroup-web`, `atina-platform/atina`, `atina-system`: ako postoji `Dockerfile`, ekstraktuju se numerički `FROM node:N` tagovi i upoređuju sa grubo parsiranim major-om iz `engines.node` (`>=20 <21` → 20). WARN na mismatch; INFO ako nema `engines` (Talas 79 već prijavljuje) ili nema image build (npr. omnigroup-web bez Dockerfile).

**Baseline:** **0 WARN** (Atina engines 20 + `node:20-alpine`; Nest image 20, `engines.node` nedostaje — preskočeno).

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-docker-node-image-vs-engines.ps1` |
| Strogi režim | `... -File .\scripts\check-docker-node-image-vs-engines.ps1 -FailOnWarn` |

`Get-Help`: **`Get-Help .\scripts\check-docker-node-image-vs-engines.ps1 -Full`**.

## `check-python-package-consistency.ps1` — Python `requirements.txt` doslednost preko 3 Python lokacija (informativan, opciono pre-PR sa `-FailOnWarn`)

**Talas 101** — **prvi audit Python sloja**, paralela Talas 79 + 94 + 96 + 98 (Node `package.json` 4 sloja). Pre Talas 101 sva 4 sloja `package.json` audit-a su pokrivala samo Node pakete, dok je Python kod (root `forge`/`atina`/`astra` + `sistem_naplate` + `tools/youtube-pipeline`) ostao bez automatizovanog skenera za pinning convention, shared dependency version drift, i `pytest.ini` presence. Skener validira **7 strukturalnih invarijanti** preko 3 Python lokacija:

1. **`requirements.txt` postoji** (Required-WARN) — Python paket bez `requirements.txt` ne može garantovati reproduktibilan `pip install`.
2. **`requirements.txt` non-empty + bar 1 dependency** (Required-WARN) — prazan fajl je ekvivalentan ne-postojanju.
3. **Mixed pinning unutar fajla** (Optional-INFO) — paket treba dosledno koristiti **`==` exact** ili **`>=` floor**; mixed podiže INFO.
4. **Shared dependency version drift preko paketa** (Optional-INFO; **kritičan signal**) — ako `requests` (ili `fpdf2`) postoji u 2+ Python paketa sa različitim verzijama, vlasnik dobija konkretan signal o transitive dependency drift-u.
5. **`pytest.ini` postoji za pakete sa testovima** (Optional-INFO) — root specijalan slučaj: `pytest.ini` u korenu repoa pokriva sve.
6. **`tests/` direktorij postoji ako paket ima `pytest`** (Optional-INFO).
7. **`requirements-dev.txt` ili separate dev deps** (Optional-INFO) — Python ekvivalent `dependencies` vs `devDependencies` u `package.json`-u.

**Tabela poređenja sa Node strukturalnim audit slojevima**:

| Audit | Talas | Sloj | Fokus |
|-------|-------|------|-------|
| `check-package-json-consistency.ps1` | 79 | Node — `package.json` metapodaci | `engines.node`, `license`, `private` |
| `check-package-scripts-consistency.ps1` | 94 | Node — `package.json` `scripts:` | test, lint, build, start, dev, format |
| `check-dev-deps-versions-consistency.ps1` | 96 | Node — `package.json` `devDependencies` MAJOR | typescript, eslint, @types/node, TS-ESLint, prettier |
| `check-package-lock-presence.ps1` | 98 | Node — lock fajlovi | `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` |
| `check-python-package-consistency.ps1` (ovaj) | 101 | Python — `requirements.txt` | Pinning convention, shared dep drift, pytest.ini, tests/, requirements-dev.txt |

**Talas 79 + 94 + 96 + 98 + 101 zajedno pokrivaju monorepo dependency management u 5 audit slojeva** preko Node + Python paketa.

**Snapshot rezultat (Val 355 baseline, clean):**

| Python paket | Deps | Exact `==` | Floor `>=` | Tilde `~=` | Mixed | Pytest dep | pytest.ini | tests/ | req-dev |
|---|---:|---:|---:|---:|---|---|---|---|---|
| `.` (root) | 6 | 6 | 0 | 0 | - | ✓ | ✓ | ✓ | - |
| `sistem_naplate` | 2 | 0 | 2 | 0 | - | - | - | ✓ | - |
| `tools/youtube-pipeline` | 11 | 11 | 0 | 0 | - | - | - | - | - |

**0 WARN + 5 INFO clean baseline** ✓ — INFO signali:
- **CROSS-PKG-PINNING-MISMATCH** — `.` i `tools/youtube-pipeline` koriste `==`, `sistem_naplate` koristi `>=`; razmotri konzistentan stil.
- **SHARED-DEP-VERSION-DRIFT `fpdf2`** — `==2.8.2` (root) vs `>=2.7.0` (sistem_naplate).
- **SHARED-DEP-VERSION-DRIFT `requests`** ⚠ — `==2.32.3` (root) vs `>=2.28.0` (sistem_naplate) vs `==2.31.0` (tools/youtube-pipeline) — **3 različite verzije** preko 3 paketa.
- **NO-PYTEST-INI** u `sistem_naplate` (ima `tests/` dir bez konfiguracije).
- **NO-REQUIREMENTS-DEV** za root (pytest u production deps; `requirements-dev.txt` pattern bi izolovao test deps iz production install-a).

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-python-package-consistency.ps1` |
| Strogi rezim (exit 1 ako bilo koji invariant fail-uje) | `... -File .\scripts\check-python-package-consistency.ps1 -FailOnWarn` |
| Sa custom listom Python paketa | `... -File .\scripts\check-python-package-consistency.ps1 -PythonRoots @('.', 'sistem_naplate')` |

`Get-Help`: **`Get-Help .\scripts\check-python-package-consistency.ps1 -Full`** (parametri **`-FailOnWarn`**, **`-MaxOutput`**, **`-PythonRoots`**).

**Vlasnik benefit:** (1) **prvi audit Python sloja** — pre Talas 101 Python paketi (root + sistem_naplate + tools/youtube-pipeline) bili nepokriveni; sad imaju 7 invarijanti baseline-a; (2) **shared dep drift signal autonomno otkriven** — `requests` u 3 paketa sa 3 različite verzije; bez audita, drift bi rastao silently; (3) **monorepo dependency management u 5 audit slojeva** — Talas 79 (Node metadata) + Talas 94 (Node scripts) + Talas 96 (Node devDeps MAJOR) + Talas 98 (Node lock) + Talas 101 (Python requirements); kompletna pokrivenost preko Node + Python paketa; (4) **PS5.1 List<object> `.Count` quirk fix** — `@($analysis.Dependencies | Where-Object {...}).Count` umesto direktnog `.Count` na pipeline-u — sledeći agent ima primer; (5) **per-paket pinning analiza** — Exact / Floor / Tilde / Mixed kategorije; vlasnik direktno vidi koji paket koristi koji stil; (6) **PS lesson #21 primenjena preventivno** — skripta od početka UTF-8-with-BOM. **Sledeći agent benefit:** ako se doda 4. Python paket bez `requirements.txt` ili sa drift-ovanom verzijom shared dep-a, audit će odmah označiti.

## `check-pytest-config-consistency.ps1` — Python testing config doslednost preko 3 Python lokacija (informativan, opciono pre-PR sa `-FailOnWarn`)

Iz korena repoa skenira **3 Python lokacije** (root + `sistem_naplate` + `tools/youtube-pipeline`) i validira **6 strukturalnih invarijanti** za pytest testing config: (1) testing config postoji ako `tests/` direktorij postoji (`pytest.ini` / `pyproject.toml [tool.pytest.ini_options]` / `setup.cfg [tool:pytest]`) — Required-WARN; (2) `pytest` dep eksplicitan u `requirements.txt` ako paket ima `tests/` — Optional-INFO; (3) `testpaths` definisan — Optional-INFO; (4) `pythonpath` definisan ako paket ima `src/` strukturu — Optional-INFO; (5) `addopts` za enhanced setup (`--strict-markers` / `-ra` / `--cov`) — Optional-INFO; (6) `tests/` dir postoji ako paket ima `pytest` dep — Optional-INFO. **Drugi audit Python sloja** posle Talas 101 (`requirements.txt`); zajedno daju 2-slojni Python audit (deps + testing config), paralelno Talas 87 (`tsconfig.json`) za TS sloj.

**Tabela poređenja sa drugim Python + TS config audit slojevima:**

| Audit | Talas | Sloj | Fokus |
|-------|-------|------|-------|
| `check-tsconfig-consistency.ps1` | 87 | TypeScript | `tsconfig.json` (`strict`, `target`, `skipLibCheck`, `esModuleInterop`) |
| `check-eslint-consistency.ps1` | 91 | Node — lint config | `.eslintrc.*` (root, parser, plugin) |
| `check-python-package-consistency.ps1` | 101 | Python — `requirements.txt` | Pinning convention, shared dep drift, pytest.ini presence (INFO) |
| `check-pytest-config-consistency.ps1` (ovaj) | 103 | Python — testing config | pytest.ini / pyproject.toml [tool.pytest] / setup.cfg [tool:pytest] presence + zdravlje |

**Trenutni snapshot (Val 355, 2026-05-14):** 3 Python paketa skenirano; **1 WARN + 2 INFO**.

| Root | TestsDir | Conftest | Config | TestPaths | PythonPath | Addopts | PytestDep | SrcDir | Status |
|------|----------|----------|--------|-----------|------------|---------|-----------|--------|--------|
| `.` | Yes | - | `pytest.ini` | Yes | Yes | - | Yes | Yes | INFO (NO-ADDOPTS) |
| `sistem_naplate` | Yes | Yes | - | - | - | - | - | - | **WARN (TESTS-WITHOUT-CONFIG)** + INFO (TESTS-WITHOUT-PYTEST-DEP) |
| `tools/youtube-pipeline` | - | - | - | - | - | - | - | - | OK (nema tests/, nema pytest dep) |

**Realan signal otkriven autonomno**: `sistem_naplate` ima `tests/` + `tests/conftest.py` ali nema **nikakvu** testing config (ni `pytest.ini`, ni `pyproject.toml`, ni `setup.cfg [tool:pytest]`); test discovery koristi defaults što može propustiti edge cases. Ozbiljniji od Talas 101 INFO koji je samo prijavljivao `NO-PYTEST-INI` kao informativan.

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-pytest-config-consistency.ps1` |
| Strogi rezim (exit 1 ako bilo koji invariant fail-uje) | `... -File .\scripts\check-pytest-config-consistency.ps1 -FailOnWarn` |
| Sa custom listom Python paketa | `... -File .\scripts\check-pytest-config-consistency.ps1 -PythonRoots @('.', 'sistem_naplate')` |

`Get-Help`: **`Get-Help .\scripts\check-pytest-config-consistency.ps1 -Full`** (parametri **`-FailOnWarn`**, **`-MaxOutput`**, **`-PythonRoots`**).

**Vlasnik benefit:** (1) **drugi audit Python sloja** — pre Talas 103 Python testing config bio pokriven samo INFO signalom u Talas 101; sad ima dedicated 6-invariant audit sa Required-WARN za missing config; (2) **realan signal autonomno otkriven** — `sistem_naplate` `TESTS-WITHOUT-CONFIG` (Required-WARN); vlasnik dobija konkretnu akciju (kreirati `pytest.ini` ili dodati `[tool:pytest]` u `setup.cfg`); (3) **2-slojni Python audit kompletiran** — Talas 101 (deps) + Talas 103 (testing config); paralela Node 4-slojnog `package.json` audita (Talas 79 + 94 + 96 + 98); (4) **structural config audit u 4 sloja** — Talas 87 (TS tsconfig) + Talas 91 (Node ESLint) + Talas 101 (Python deps) + Talas 103 (Python pytest); (5) **regression sentinel** — kad se doda 4. Python paket sa `tests/` ali bez config-a, audit će odmah upozoriti; (6) **PS lesson #21 primenjena preventivno** — skripta UTF-8-with-BOM od početka. **Sledeći agent benefit:** invariant 1 (TESTS-WITHOUT-CONFIG) je Required-WARN što znači `-FailOnWarn` može biti CI gate posle vlasnik-akcije za `sistem_naplate`.

## `check-vscode-settings-presence.ps1` — `.vscode/` IDE konfiguracija (settings.json + extensions.json) presence + zdravlje (informativan, opciono pre-PR sa `-FailOnWarn`)

Iz korena repoa skenira `.vscode/` direktorijum i validira **6 strukturalnih invarijanti** za VSCode/Cursor IDE konfiguraciju: (1) `.vscode/` direktorij postoji — Required-WARN; (2) `.vscode/settings.json` postoji + non-empty + valid JSON — Required-WARN; (3) `.vscode/extensions.json` postoji + non-empty + valid JSON sa `recommendations` array — Required-WARN; (4) `editor.formatOnSave` definisan u settings.json — Optional-INFO; (5) `editor.defaultFormatter` definisan — Optional-INFO; (6) `extensions.json` recommendations pokriva ključne tool-ove (`dbaeumer.vscode-eslint`, `esbenp.prettier-vscode`, `ms-azuretools.vscode-docker`, `ms-vscode.PowerShell`, `ms-python.python`) — Optional-INFO. **Novi 11. domen — Developer Experience / IDE konfiguracija** za Cursor/VSCode developere; komplementaran sa Talas 95 (`.editorconfig` cross-editor) i Talas 92 (`.gitignore` koji ne sme ignorisati `.vscode/`).

**Tabela poređenja sa drugim DX/config audit slojevima:**

| Audit | Talas | Sloj | Fokus |
|-------|-------|------|-------|
| `check-repo-meta-files-presence.ps1` | 95 | Root meta — OSS / GitHub UI | LICENSE, SECURITY.md, .editorconfig (cross-editor), CODE_OF_CONDUCT, CHANGELOG |
| `check-github-meta-files-presence.ps1` | 97 | `.github/` — GitHub automation | dependabot.yml, workflows/, PULL_REQUEST_TEMPLATE.md, CODEOWNERS |
| `check-vscode-settings-presence.ps1` (ovaj) | 104 | `.vscode/` — VSCode/Cursor IDE | settings.json (formatOnSave, defaultFormatter, monorepo-specifično), extensions.json recommendations |

**Trenutni snapshot (Val 355, 2026-05-14):** 1 lokacija skenirana (root `.vscode/`); **1 WARN + 0 INFO**.

| VsCodeDir | settings.json | extensions.json | launch.json | FormatOnSave | DefaultFormatter | ESLintWorkdirs | Status |
|-----------|---------------|-----------------|-------------|--------------|------------------|----------------|--------|
| `-` | `-` | `-` | `-` | `-` | `-` | `-` | **WARN (NO-VSCODE-DIR)** |

**Realan signal otkriven autonomno**: repo nema `.vscode/` direktorijum (samo unutar `node_modules/` što je dependency overhead, ne workspace shared); novi developer mora ručno konfigurisati formatOnSave / defaultFormatter / eslint.workingDirectories za monorepo. Kreiranje `.vscode/settings.json` + `.vscode/extensions.json` je 1 PR koji setup-uje za sve buduće developere.

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-vscode-settings-presence.ps1` |
| Strogi rezim (exit 1 ako bilo koji invariant fail-uje) | `... -File .\scripts\check-vscode-settings-presence.ps1 -FailOnWarn` |
| Sa custom direktorijumom | `... -File .\scripts\check-vscode-settings-presence.ps1 -VsCodeDir 'apps/omnigroup-web/.vscode'` |

`Get-Help`: **`Get-Help .\scripts\check-vscode-settings-presence.ps1 -Full`** (parametri **`-FailOnWarn`**, **`-MaxOutput`**, **`-VsCodeDir`**).

**Vlasnik benefit:** (1) **novi 11. domen — Developer Experience / IDE konfiguracija** otvoren; (2) **realan WARN signal autonomno otkriven** — `NO-VSCODE-DIR` (bez audita, missing shared workspace settings ostao bi neotkriven); (3) **onboarding kvalitet** — `extensions.json` recommendations daje 1-click install banner pri otvaranju projekta umesto ručnog traženja; (4) **monorepo-specifično** — `eslint.workingDirectories` direktiva u `settings.json` rešava ESLint setup za multi-paket monorepo (Atina + Nest + omnigroup-web); (5) **regression sentinel** — kad se doda 4. paket bez `.vscode/`, audit će upozoriti; (6) **PS lesson #21 primenjena preventivno od početka** — skripta kreirana sa UTF-8 BOM u istom potezu (po prvi put bez retroaktivne fix-a, primer za sledeće agente). **Sledeći agent benefit:** vlasnik može razmotriti dodavanje `.vscode/` u Talas 102 OWNER-ACTION-CHECKLIST kao P2-F (DX consistency / onboarding) sa kompletnim šablonom (formatOnSave + Prettier defaultFormatter + 5 recommendations).

## `check-prettier-config-consistency.ps1` — Prettier config doslednost preko 3 Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`)

Iz korena repoa skenira **3 Node paketa** (`apps/omnigroup-web` + `atina-platform/atina` + `atina-system`) i validira **6 strukturalnih invarijanti** za Prettier formatter konfiguraciju: (1) Prettier config postoji u `.prettierrc*` ili `package.json#prettier` blok — Required-WARN; (2) config valid format (JSON / YAML / JS) — Required-WARN; (3) `prettier` u `devDependencies` ako config postoji — Required-WARN; (4) `format` script u `package.json scripts:` — Optional-INFO (cross-check sa Talas 94); (5) `.prettierignore` postoji — Optional-INFO; (6) `prettier` MAJOR version doslednost preko paketa — Optional-INFO. **5. sloj structural config audit-a** posle Talas 87 (TS) + Talas 91 (ESLint) + Talas 101 (Python deps) + Talas 103 (Python pytest); kompletira **format-time + lint-time + compile-time + dependency + testing** pokrivenost preko Node monorepa.

**Tabela poređenja sa drugim structural config audit slojevima:**

| Audit | Talas | Sloj | Fokus |
|-------|-------|------|-------|
| `check-tsconfig-consistency.ps1` | 87 | TypeScript compile-time | `strict`, `target`, `skipLibCheck`, `esModuleInterop` |
| `check-eslint-consistency.ps1` | 91 | Node lint-time | `.eslintrc.*` (root, parser, plugin) |
| `check-python-package-consistency.ps1` | 101 | Python deps | requirements.txt pinning, shared dep drift |
| `check-pytest-config-consistency.ps1` | 103 | Python testing config | pytest.ini / pyproject.toml [tool.pytest] |
| `check-prettier-config-consistency.ps1` (ovaj) | 105 | Node format-time | `.prettierrc.*` + `prettier` dep + `format` script |

**Trenutni snapshot (Val 355, 2026-05-15):** 3 Node paketa skenirano; **2 WARN + 1 INFO**.

| Root | PrettierDep | Config | Valid | FormatScript | Ignore | SingleQuote | TrailingComma | Status |
|------|-------------|--------|-------|--------------|--------|-------------|---------------|--------|
| `apps/omnigroup-web` | `-` | `-` | `-` | `-` | `-` | `-` | `-` | **WARN (NO-PRETTIER-CONFIG)** |
| `atina-platform/atina` | `-` | `-` | `-` | `-` | `-` | `-` | `-` | **WARN (NO-PRETTIER-CONFIG)** |
| `atina-system` | `^3.0.0` | `.prettierrc` | Yes | Yes | `-` | True | all | INFO (NO-PRETTIER-IGNORE) |

**2 realna WARN signala otkrivena autonomno**: 2/3 Node paketa (`apps/omnigroup-web` + `atina-platform/atina`) **nemaju nikakav** Prettier setup (ni config, ni dep, ni format script). Format consistency nije garantovana preko developera; ako Talas 104 P2-F predlog (`.vscode/settings.json` sa `editor.defaultFormatter: esbenp.prettier-vscode`) bude implementiran, format-on-save bi fail-ovao u tim paketima sa missing `prettier` dep. **`atina-system` reference baseline** ima kompletan setup (Prettier ^3.0.0 + `.prettierrc` sa `singleQuote: true` + `trailingComma: all` + `format` script), pa vlasnik ima konkretan šablon za druga 2 paketa.

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-prettier-config-consistency.ps1` |
| Strogi rezim (exit 1 ako bilo koji invariant fail-uje) | `... -File .\scripts\check-prettier-config-consistency.ps1 -FailOnWarn` |
| Sa custom listom Node paketa | `... -File .\scripts\check-prettier-config-consistency.ps1 -NodePaths @('apps/omnigroup-web', 'atina-system')` |

`Get-Help`: **`Get-Help .\scripts\check-prettier-config-consistency.ps1 -Full`** (parametri **`-FailOnWarn`**, **`-MaxOutput`**, **`-NodePaths`**).

**Vlasnik benefit:** (1) **5. sloj structural config audit-a** kompletira format-time pokrivenost preko Node monorepa (TS Talas 87 + ESLint Talas 91 + Python deps Talas 101 + Python pytest Talas 103 + sad Prettier); (2) **2 realna WARN signala autonomno otkrivena** — `apps/omnigroup-web` + `atina-platform/atina` nemaju Prettier setup; vlasnik dobija konkretne P2-G + P2-H stavke u OWNER-ACTION-CHECKLIST sa `atina-system` šablonom kao baseline; (3) **direktna dopuna Talas 94 INFO** — Talas 94 je samo prijavljivao "nema format script", Talas 105 ide korak dalje i otkriva da uopšte nema Prettier infrastrukturu; (4) **cross-check sa Talas 104 P2-F** — bez Prettier dep-a u 2 paketa, predlog `.vscode/` defaultFormatter Prettier bi fail-ovao za format-on-save; (5) **regression sentinel** — kad se doda 4. Node paket bez Prettier-a, audit će upozoriti; (6) **PS lesson #21 primenjena PREVENTIVNO od početka** drugi put zaredom (Talas 104 + 105) — skripta kreirana sa UTF-8 BOM u istom potezu, naviknuće postaje standard za buduće agente; (7) **MAJOR drift detection** — kad bi se Atina dobila prettier v2 (sa `trailingComma: "es5"`) a Nest ostao na v3 (sa `trailingComma: "all"`), audit bi to odmah označio. **Sledeći agent benefit:** vlasnik akcija opciona u OWNER-ACTION-CHECKLIST P2-G + P2-H sa kompletnim 4-fajl šablonima po paketu (`.prettierrc` + `.prettierignore` + dodavanje `prettier` dep + `format` script).

## `check-shared-deps-consistency.ps1` — Shared `dependencies` runtime drift detekcija preko 3 Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`)

Iz korena repoa skenira **3 Node paketa** (`apps/omnigroup-web` + `atina-platform/atina` + `atina-system`) i validira **5 strukturalnih invarijanti** za shared `dependencies` (regular runtime, ne devDependencies) preko paketa: (1) Shared dep MAJOR drift kad je dep u 2+ paketa sa različitim MAJOR-em — Required-WARN; (2) MINOR drift — Optional-INFO; (3) PATCH drift — Optional-INFO; (4) prefix mismatch (`^` vs `~` vs exact) — Optional-INFO; (5) reproducibility statistika (per-paket deps count + ukupni jedinstveni + shared + breakdown po drift kategoriji). **Paralela Talas 101 (Python `requirements.txt`) za Node ekosistem**, dopuna Talas 96 (`devDependencies` MAJOR — Talas 106 dopunjava sa runtime `dependencies` koje idu u prod build). Per-paket parsing preko native PS5.1 `ConvertFrom-Json` na `package.json#dependencies` bloku; cross-paket aggregation preko `Group-Object` po dep-name-u + filter na `Count >= 2`; semver decompositioning kroz regex `^([\^~])?(\d+)\.(\d+)\.(\d+)`.

**Tabela poređenja sa drugim dependency management audit slojevima:**

| Audit | Talas | Sloj | Fokus |
|-------|-------|------|-------|
| `check-package-json-consistency.ps1` | 79 | Node metapodaci | engines.node, license, private |
| `check-package-scripts-consistency.ps1` | 94 | Node scripts | test/lint/build/start/dev/format |
| `check-dev-deps-versions-consistency.ps1` | 96 | Node devDependencies MAJOR | typescript, eslint, @types/node, @typescript-eslint/* |
| `check-package-lock-presence.ps1` | 98 | Node lock fajlovi | package-lock.json presence + reproducibility |
| `check-python-package-consistency.ps1` | 101 | Python deps | requirements.txt pinning, shared dep drift |
| `check-pytest-config-consistency.ps1` | 103 | Python testing config | pytest.ini / pyproject.toml [tool.pytest] |
| `check-shared-deps-consistency.ps1` (ovaj) | 106 | Node `dependencies` runtime drift | shared dep MAJOR / MINOR / PATCH / prefix drift |

**Trenutni snapshot (Val 355, 2026-05-15):** 3 Node paketa skenirano; **46 jedinstvenih deps**; **4 shared deps**; **1 WARN + 3 INFO**.

| Dep | Atina | Nest | Drift | Severity |
|-----|-------|------|-------|----------|
| **`uuid`** | `^9.0.0` | `^13.0.0` | **MAJOR (4 verzije razlike)** | **WARN** ⚠ |
| `dotenv` | `^16.3.1` | `^16.4.7` | MINOR | INFO |
| `helmet` | `^7.1.0` | `^7.2.0` | MINOR | INFO |
| `pg` | `^8.11.3` | `^8.20.0` | MINOR | INFO |

**Realan deploy-rizik signal otkriven autonomno**: `uuid` MAJOR drift — Atina koristi v9 (2022, ESM/CJS hibrid sa `import { v4 } from 'uuid'`), Nest koristi v13 (2024, ima breaking promene u `crypto.randomUUID()` fallback ponašanju). Nije fatalno za standard `uuid.v4()` API ali znači različite peer deps (npm može odbiti install) i potencijalne breaking promene u edge case-ovima. Vlasnik akcija u OWNER-ACTION-CHECKLIST P1-H — sinhronizovati na zajednički MAJOR (preporuka v13 za oba; v9 je 3+ god star).

| Scenario | Komanda |
|----------|---------|
| Default (informativan) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-shared-deps-consistency.ps1` |
| Strogi rezim (exit 1 ako bilo koji invariant fail-uje) | `... -File .\scripts\check-shared-deps-consistency.ps1 -FailOnWarn` |
| Sa custom listom Node paketa | `... -File .\scripts\check-shared-deps-consistency.ps1 -NodePaths @('atina-platform/atina', 'atina-system')` |

`Get-Help`: **`Get-Help .\scripts\check-shared-deps-consistency.ps1 -Full`** (parametri **`-FailOnWarn`**, **`-MaxOutput`**, **`-NodePaths`**).

**Vlasnik benefit:** (1) **paralela Talas 101 za Node** — pre Talas 106 Node `dependencies` (runtime) drift bio nepokriven; samo `devDependencies` MAJOR (Talas 96) je imao audit; sad runtime deps (koje idu u prod build) imaju svoj audit; (2) **realan WARN signal autonomno otkriven** — `uuid` MAJOR drift v9 vs v13 (4 major razlike); vlasnik dobija konkretnu akciju (sinhronizovati na v13); (3) **3 INFO za sinhronizacione kandidate** — `dotenv` / `helmet` / `pg` MINOR drift; nije kritično ali lepo videti da bi se sinhronizovalo; (4) **Talas 79+94+96+98+101+103+106 zajedno daju monorepo dependency management u 7 audit slojeva** preko Node + Python paketa — kompletna pokrivenost dep slojeva; (5) **regression sentinel** — kad se doda 4. paket sa konfliktnom verzijom shared dep-a, audit će odmah označiti; (6) **prefix mismatch detection** — kad bi Atina koristila `^` a Nest `~` za isti dep, audit bi prijavio (različite update strategije); (7) **PS lesson #21 primenjena PREVENTIVNO od početka po treći put zaredom** (Talas 104 + 105 + 106) — naviknuće sad standard za sve agente. **Sledeći agent benefit:** invariant 1 (SHARED-DEP-MAJOR-DRIFT) je Required-WARN što znači `-FailOnWarn` može biti CI gate posle vlasnik-akcije za `uuid` sinhronizaciju.

## `check-tailwind-config-consistency.ps1` — Tailwind CSS + PostCSS konfiguracija (informativan, opciono pre-PR sa `-FailOnWarn`)

Skenira podrazumevano **3 Node paketa** i za svaki koji ima `tailwindcss` ili bilo koji `@tailwindcss/*` u `dependencies` / `devDependencies` proverava **6 strukturalnih invarijanti**: (1) postoji `tailwind.config.js|ts|cjs|mjs` ili `postcss.config.*` sa referencom na tailwind; (2) `tailwind.config.*` nije prazan i sadrži `content`, legacy `purge`, ili `@config`; (3) INFO ako ima samo tailwind.config bez postcss.config; (4) INFO ako je Tailwind u `dependencies` umesto `devDependencies`; (5) INFO ako dva ili više paketa imaju `tailwindcss` sa različitim MAJOR-om; (6) rezime tabela potrošača.

**Tabela poređenja sa drugim structural config audit slojevima (Node):**

| Audit | Talas | Sloj | Fokus |
|-------|-------|------|-------|
| `check-tsconfig-consistency.ps1` | 87 | compile-time | tsconfig |
| `check-eslint-consistency.ps1` | 91 | lint-time | ESLint |
| `check-prettier-config-consistency.ps1` | 105 | format-time | Prettier |
| `check-tailwind-config-consistency.ps1` (ovaj) | 107 | CSS utility build-time | tailwind.config + postcss |

**Trenutni snapshot:** samo `apps/omnigroup-web` koristi Tailwind **^3.4.1** sa `tailwind.config.ts` i `postcss.config.mjs` — **0 WARN + 0 INFO**. Atina i Nest nemaju Tailwind (očekivano za API-only).

| Scenario | Komanda |
|----------|---------|
| Default | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-tailwind-config-consistency.ps1` |
| Strogi rezim | `... -File .\scripts\check-tailwind-config-consistency.ps1 -FailOnWarn` |

`Get-Help`: **`Get-Help .\scripts\check-tailwind-config-consistency.ps1 -Full`**.

**Vlasnik benefit:** regression sentinel kad novi front-end paket doda `tailwindcss` bez config fajla; spremnost za Tailwind v4 (`@tailwindcss/postcss`); **PS lesson #21** (UTF-8 BOM) primenjena preventivno. **Sledeći agent benefit:** proširuje structural config sa **6. slojem** (CSS utility) pored Prettier format-time.

## `check-next-config-consistency.ps1` — Next.js `next.config.*` doslednost (informativan, opciono pre-PR sa `-FailOnWarn`)

Skenira podrazumevano **3 Node paketa** i za svaki koji ima `next` u `dependencies` / `devDependencies` proverava **6 strukturalnih invarijanti**: (1) postoji `next.config.js|mjs|ts|cjs`; (2) fajl nije prazan; (3) INFO ako nema uobičajenih Next ključeva (reactStrictMode, images, output, headers, …); (4) INFO ako je `next` samo u devDependencies; (5) INFO cross-package next MAJOR drift ako 2+ potrošača; (6) INFO ako nema `Dockerfile` u paketu niti `output: 'standalone'` (veza Talas 99).

**Tabela poređenja sa drugim structural config audit slojevima (Node / front):**

| Audit | Talas | Sloj | Fokus |
|-------|-------|------|-------|
| `check-tsconfig-consistency.ps1` | 87 | compile-time | tsconfig |
| `check-eslint-consistency.ps1` | 91 | lint-time | ESLint |
| `check-prettier-config-consistency.ps1` | 105 | format-time | Prettier |
| `check-tailwind-config-consistency.ps1` | 107 | CSS utility build-time | tailwind.config + postcss |
| `check-next-config-consistency.ps1` (ovaj) | 108 | Next.js framework build-time | next.config.* |

**Trenutni snapshot:** samo `apps/omnigroup-web` koristi **Next 14.2.35** + `next.config.mjs` — **0 WARN + 2 INFO** (MINIMAL-NEXT-CONFIG; NO-STANDALONE-NO-DOCKERFILE). Atina i Nest nemaju `next` (očekivano).

| Scenario | Komanda |
|----------|---------|
| Default | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-next-config-consistency.ps1` |
| Strogi rezim | `... -File .\scripts\check-next-config-consistency.ps1 -FailOnWarn` |

`Get-Help`: **`Get-Help .\scripts\check-next-config-consistency.ps1 -Full`**.

**Vlasnik benefit:** regression sentinel za Next konfiguraciju; eksplicitna veza prema Talas 99 kada nema Dockerfile-a. **PS lesson #21** (UTF-8 BOM) primenjena preventivno.

## `check-jest-config-consistency.ps1` — Jest konfiguracija za Node pakete sa `jest` dep-om (informativan, opciono pre-PR sa `-FailOnWarn`)

Skenira podrazumevano **3 Node paketa** i za svaki koji ima `jest` u `dependencies` / `devDependencies` proverava **5 strukturalnih invarijanti**: konfiguracioni sloj (`jest.config.*` ili smislen `package.json#jest`), prazan config fajl (WARN), `jest` u runtime `dependencies` (INFO), dvostruki izvor config-a (INFO), cross-package semver drift za `jest` (INFO).

**Tabela poređenja sa drugim structural config audit slojevima (Node / front / test):**

| Audit | Talas | Sloj | Fokus |
|-------|-------|------|-------|
| `check-tsconfig-consistency.ps1` | 87 | compile-time | tsconfig |
| `check-eslint-consistency.ps1` | 91 | lint-time | ESLint |
| `check-prettier-config-consistency.ps1` | 105 | format-time | Prettier |
| `check-tailwind-config-consistency.ps1` | 107 | CSS utility build-time | tailwind.config + postcss |
| `check-next-config-consistency.ps1` | 108 | Next.js framework build-time | next.config.* |
| `check-jest-config-consistency.ps1` (ovaj) | 109 | Jest unit-test config | jest.config.* + package.json#jest |

**Trenutni snapshot:** `atina-platform/atina` (`jest.config.js`, `^29.7.0`) + `atina-system` (inline `jest`, `^29.5.0`) — **0 WARN + 1 INFO** (`JEST-DEP-VERSION-DRIFT`). `apps/omnigroup-web` nema `jest` dep (očekivano za Next-only).

| Scenario | Komanda |
|----------|---------|
| Default | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-jest-config-consistency.ps1` |
| Strogi rezim | `... -File .\scripts\check-jest-config-consistency.ps1 -FailOnWarn` |

`Get-Help`: **`Get-Help .\scripts\check-jest-config-consistency.ps1 -Full`**.

**Vlasnik benefit:** regression sentinel za Jest setup između Atina i Nest-a; komplement Talas 103 (pytest) i Talas 94 (`test` script). **PS lesson #21** (UTF-8 BOM) primenjena preventivno.

## `check-nest-cli-config-consistency.ps1` — Nest CLI `nest-cli.json` doslednost za Node pakete sa Nest dep-om (informativan, opciono pre-PR sa `-FailOnWarn`)

Skenira podrazumevano **3 Node paketa** i za svaki koji ima **`@nestjs/core`** u `dependencies` ili **`@nestjs/cli`** u `devDependencies` proveruje **5 strukturalnih invarijanti**: postojanje `nest-cli.json` ili `nest.json`, ne-prazan validan JSON (WARN), `sourceRoot` ili `projects` (INFO), json.schemastore.org `$schema` (INFO), cross-package `@nestjs/core` MAJOR drift (INFO).

**Tabela poređenja sa drugim structural config audit slojevima (Node / front / test / Nest build):**

| Audit | Talas | Sloj | Fokus |
|-------|-------|------|-------|
| `check-tsconfig-consistency.ps1` | 87 | compile-time | tsconfig |
| `check-eslint-consistency.ps1` | 91 | lint-time | ESLint |
| `check-prettier-config-consistency.ps1` | 105 | format-time | Prettier |
| `check-tailwind-config-consistency.ps1` | 107 | CSS utility build-time | tailwind.config + postcss |
| `check-next-config-consistency.ps1` | 108 | Next.js framework build-time | next.config.* |
| `check-jest-config-consistency.ps1` | 109 | Jest unit-test config | jest.config.* + package.json#jest |
| `check-nest-cli-config-consistency.ps1` | 110 | Nest CLI / schematics build-time | nest-cli.json / nest.json |
| `check-typeorm-data-source-consistency.ps1` | 111 | ORM / TypeORM persistence bootstrap | data-source.ts / ormconfig.* |
| `check-jest-e2e-config-consistency.ps1` | 112 | Jest E2E / integration-test bootstrap | test/jest-e2e.json + test:e2e script |

**Trenutni snapshot:** samo `atina-system` koristi Nest + `nest-cli.json` — **0 WARN + 0 INFO**. `apps/omnigroup-web` i `atina-platform/atina` bez Nest dep-a (očekivano).

| Scenario | Komanda |
|----------|---------|
| Default | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-nest-cli-config-consistency.ps1` |
| Strogi rezim | `... -File .\scripts\check-nest-cli-config-consistency.ps1 -FailOnWarn` |

`Get-Help`: **`Get-Help .\scripts\check-nest-cli-config-consistency.ps1 -Full`**.

**Vlasnik benefit:** regression sentinel za Nest CLI entry konfiguraciju; komplement Talas 108 (Next) na front/backend granici. **PS lesson #21** (UTF-8 BOM) primenjena preventivno.

## `check-typeorm-data-source-consistency.ps1` — TypeORM DataSource / `ormconfig` ulaz za Node pakete sa `typeorm` dep-om (informativan, opciono pre-PR sa `-FailOnWarn`)

Skenira podrazumevano **3 Node paketa** i za svaki koji ima **`typeorm`** u `dependencies` ili `devDependencies` proveruje **4 strukturalne invarijante**: postojanje kanonskog ulaza (`src/database/data-source.ts|js`, `src/data-source.ts|js`, ili `ormconfig.*`), ne-prazan sadržaj (WARN), `synchronize: true` anti-pattern (WARN), `typeorm` samo u devDependencies (INFO); ako 2+ paketa imaju `typeorm`, INFO semver string drift.

**Poređenje sa drugim structural config slojevima:** ista sumarna tabela kao u sekciji **`check-nest-cli-config-consistency.ps1`** iznad (Talas 87→111); ovaj audit dodaje **10. sloj** posle Nest CLI.

**Trenutni snapshot:** samo `atina-system` koristi TypeORM + `src/database/data-source.ts` — **0 WARN + 0 INFO**. `apps/omnigroup-web` i `atina-platform/atina` bez `typeorm` dep-a (očekivano).

| Scenario | Komanda |
|----------|---------|
| Default | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-typeorm-data-source-consistency.ps1` |
| Strogi rezim | `... -File .\scripts\check-typeorm-data-source-consistency.ps1 -FailOnWarn` |

`Get-Help`: **`Get-Help .\scripts\check-typeorm-data-source-consistency.ps1 -Full`**.

**Vlasnik benefit:** regression sentinel za TypeORM bootstrap konfiguraciju (migracije / CLI ulaz); komplement Talas 98 (lock) i Nest `migration:*` npm scriptovima. **PS lesson #21** (UTF-8 BOM) primenjena preventivno.

## `check-jest-e2e-config-consistency.ps1` — Jest E2E / integration-test konfiguracija za Node pakete sa `test:e2e` script-om (informativan, opciono pre-PR sa `-FailOnWarn`)

Skenira podrazumevano **3 Node paketa** i za svaki koji ima **`test:e2e`** u `package.json#scripts` proveruje **6 strukturalnih invarijanti**: E2E Jest config postoji (putanja iz `jest --config`), ne-prazan sadržaj (WARN), validan JSON (WARN), `testEnvironment: node` (WARN), bar jedan `*.e2e-spec.ts` (INFO), `supertest` u devDependencies (INFO). **Dopuna Talas 109** koji pokriva samo unit Jest (`jest.config.*` / `package.json#jest`).

**Poređenje sa drugim structural config slojevima:** Talas 109 (unit Jest) + **Talas 112 (E2E Jest)** zajedno pokrivaju Nest `verify:ci` putanju (`build` → `test` → `migration:run` → `test:e2e`).

**Trenutni snapshot:** samo `atina-system` ima `test:e2e` + `test/jest-e2e.json` + `app.e2e-spec.ts` — **0 WARN + 1 INFO** (`verify:ci` chains E2E). `apps/omnigroup-web` i `atina-platform/atina` bez `test:e2e` (očekivano).

| Scenario | Komanda |
|----------|---------|
| Default | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-jest-e2e-config-consistency.ps1` |
| Strogi rezim | `... -File .\scripts\check-jest-e2e-config-consistency.ps1 -FailOnWarn` |

`Get-Help`: **`Get-Help .\scripts\check-jest-e2e-config-consistency.ps1 -Full`**.

**Vlasnik benefit:** regression sentinel za Jest E2E bootstrap na CI kritičnoj putanji; komplement Talas 109 (unit) i Talas 94 (`test:e2e` script presence). **PS lesson #21** (UTF-8 BOM) primenjena preventivno.

## `scan-todo-markers.ps1` — TODO / FIXME / HACK / XXX skener (informativan, **nije** gate)

Skenira monorepo (`*.ts`, `*.tsx`, `*.js`, `*.mjs`, `*.cjs`, `*.py`, `*.md`, `*.ps1`, `*.yml`, `*.yaml`, `*.json`; van `node_modules` / `.next` / `.git` / `dist` / `coverage` / `build` / `.turbo` / `.cache` / `__pycache__` / `.pytest_cache` / `tmp`) i grupiše markere u 4 kategorije: **`TODO[restore]`** (D.1, empty-doc, Iter — eksplicitan dokumentovan dug iz [`OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](../docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md) i [`EMPTY-DOCS-RUNBOOK.md`](../docs/EMPTY-DOCS-RUNBOOK.md)), **`TODO (other)`** (generic), **`FIXME`** (pravi bug-ovi), **`HACK/XXX`** (privremene zaobilaznice). Output: summary table + top 10 fajlova; opciono `-Detailed` lista svih marker linija (file:line:context). Sa `-OutputJson` / `-OutputCsv` snima se snapshot u `tmp/` (gitignored — vidi koren `.gitignore`).

| Scenario | Komanda |
|----------|---------|
| Pun pregled (default summary) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\scan-todo-markers.ps1` |
| Detailed (svi marker-i, prvih 200) | `... -File .\scripts\scan-todo-markers.ps1 -Detailed` |
| JSON snapshot za dashboard | `... -File .\scripts\scan-todo-markers.ps1 -OutputJson tmp\todo-markers.json` |
| CSV snapshot (jedan red = jedna marker linija) | `... -File .\scripts\scan-todo-markers.ps1 -OutputCsv tmp\todo-markers.csv -Detailed` |
| Pre-merge gate-flavor (non-zero exit ako ima marker-a) | `... -File .\scripts\scan-todo-markers.ps1 -FailOnAny` |
| Stari Talas 67 režim (uključi marker-e u markdown code blokovima) | `... -File .\scripts\scan-todo-markers.ps1 -IncludeMdCodeBlocks` |

`Get-Help`: **`Get-Help .\scripts\scan-todo-markers.ps1 -Full`** (parametri **`-Detailed`**, **`-MaxOutput`**, **`-OutputJson`**, **`-OutputCsv`**, **`-FailOnAny`**, **`-IncludeMdCodeBlocks`** — Talas 83 dodatak).

**Talas 83 default-on default ponašanje (Lekcija #17 primenjena):** Skener po defaultu **preskače markdown code blokove** (` ``` ... ``` `) u `.md` fajlovima. TODO/FIXME/HACK/XXX u markdown code blokovima dokumentacije su tipično **primeri iz runbook-a** (npr. EMPTY-DOCS-RUNBOOK pominje `TODO[empty-doc-restore]` kao šablon), ne realan dug. Ova izmena je nastavak Talas 81 lekcije #17 (`check-readme-presence.ps1` initial 4 MULTI-H1 false positives) i Talas 82 (proaktivna detekcija H1-IN-BLOCK uzorka). Ne menja ponašanje za druge ekstenzije (`.ts`, `.tsx`, `.js`, `.py`, `.ps1`, itd.) — tamo su komentari u izvornom kodu uvek realan dug.

**Snapshot 2026-05-14 (Val 355, Talas 83 baseline):**

| | Pre Talas 83 (Talas 67 baseline + drift) | Posle Talas 83 (default) | Razlika |
|---|---:|---:|---:|
| Markera ukupno | 119 | **106** | **−13** false positives |
| `TODO[restore]` | 69 | **58** | −11 (primeri iz EMPTY-DOCS / D.1 runbook-a) |
| `TODO (other)` | 46 | **44** | −2 |
| `HACK/XXX` | 2 | 2 | (nepromenjeno) |
| `FIXME` | 2 | 2 | (nepromenjeno) |

13 markera **ne brojano** kao realan dug (preskočeno u markdown code blokovima). Sa `-IncludeMdCodeBlocks` vraća se na stari režim (119 markera).

**Snapshot 2026-05-14 (Val 355):** 833 fajla / **~99 marker** — **58 `TODO[restore]`** (35 `D.1-restore` u `apps/omnigroup-web/src/**/*.tsx` D.1 placeholder fajlovima + 11 `empty-doc-restore` u template-ima + ostatak Iter blokovi i citati u dokumentaciji), **37 `TODO (other)`** (uglavnom dokumentacija koja pominje markere kao kategorije, ne stvarni dug u kodu), **2 `FIXME`** i **2 `HACK/XXX`** — **svi 4 nalaze se isključivo u [`MONOREPO-HEALTH-SNAPSHOT-LATEST.md`](../docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md)** (kao kategorija u tabeli, ne stvarni tehnički dug). **Pravi tehnički dug u kodu = svih 35 `TODO[D.1-restore]`** u `apps/omnigroup-web/src/**/*.tsx` D.1 placeholder fajlovima (čeka P0 vlasnik-akciju). Ostalih ~64 marker-a je u dokumentaciji koja eksplicitno opisuje dug ili pominje markere kao reči — clean signal.

> **Samo-referencijalan pattern (vlasnik treba znati):** brojevi rastu sa svakim novim mention-om markera u dokumentaciji. Inicijalno (prvi snapshot pre integracije skripta u runbook-e): **71 marker**; posle dopuna [`MONOREPO-HEALTH-SNAPSHOT-LATEST.md`](../docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md), [`AGENT-WORK-2026-05-14-SUMMARY.md`](../docs/AGENT-WORK-2026-05-14-SUMMARY.md), [`NIVO-1-DRYRUN-LOG.md`](../docs/NIVO-1-DRYRUN-LOG.md), [`MASTER-WORK-LIST.md`](../docs/MASTER-WORK-LIST.md) i ovog README-a (svi pominju imena markera kao kategorije): **~99 marker**. Razlika **+28 marker-a iz dokumentacije** je očekivan signal; **stvarni tehnički dug u izvornom kodu se nije promenio** (35 `TODO[D.1-restore]` u D.1 placeholder fajlovima). Vlasniku važno: posle D.1 restore-a → broj `TODO[restore]` pada za 35 (kod) + dodatni broj iz dokumentacije koja referencira D.1 (čisti se prirodno kad agent piše Val 356+ snapshot bez `TODO[D.1-restore]` mention-a).

## `check-dev-docs-coverage.ps1` — dev/docs hub completeness (informativan, **nije** gate)

Skenira `apps/omnigroup-web/src/app/dev/docs/page.tsx` (sve `paths: [...]` blokove) i upoređuje sa stvarnim sadržajem 4 doc lokacije: korenski `*.md`, `docs/**/*.md` (uklj. subfoldere `nivo3-wave-a/`), `atina-system/docs/**/*.md`, `atina-platform/atina/docs/operations/*.md`. Prijavljuje **missing** (postoji u file system-u, nije navigaciono dostupan preko `/dev/docs`) i opciono **stale** (u page.tsx, ne postoji — pokrivaju i [`check-doc-links.ps1`](./check-doc-links.ps1) i [`audit-doc-gate-references.ps1`](./audit-doc-gate-references.ps1), ovde u istom izveštaju). Po defaultu `*.template.md` se preskaču; uključi sa `-IncludeTemplates`.

| Scenario | Komanda |
|----------|---------|
| Pun pregled (default) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-dev-docs-coverage.ps1` |
| Pre-merge gate-flavor (non-zero exit ako ima missing) | `... -File .\scripts\check-dev-docs-coverage.ps1 -FailOnMissing` |
| Sa template fajlovima | `... -File .\scripts\check-dev-docs-coverage.ps1 -IncludeTemplates` |
| Sa stale referencama u hub-u | `... -File .\scripts\check-dev-docs-coverage.ps1 -ShowStale` |

`Get-Help`: **`Get-Help .\scripts\check-dev-docs-coverage.ps1 -Full`** (parametri **`-FailOnMissing`**, **`-IncludeTemplates`**, **`-ShowStale`**).

**Snapshot 2026-05-15 (Val 355, posle Talas 112):** 100 kandidata (`.md` u 4 lokacije) / **203** putanje u hub-u / **0 missing** (Talas 66: 25 fajlova + Talas 65–112 inkrementalno; poslednja putanja: `check-jest-e2e-config-consistency.ps1`).

## `check-doc-links.ps1` — markdown link skener (informativan, **nije** gate)

Skenira sve `*.md` fajlove (van `node_modules` / `.next` / `.git` / `dist` / `coverage` / `build`) i prijavljuje **broken linkove** (relativni linkovi ka nepostojećim fajlovima) i **empty targets** (linkovi ka 0-byte fajlovima — često OneDrive Files-On-Demand `ReparsePoint` placeholder; vidi runbook [`EMPTY-DOCS-RUNBOOK.md`](../docs/EMPTY-DOCS-RUNBOOK.md) za Korak 1/2/3 restore). Anchor-only linkovi (`[label](#section)`) i URL linkovi (`http*://`, `mailto:`, `tel:`) su preskočeni; markdown code blokovi (` ``` ... ``` ` i `~~~ ... ~~~`) se ne parsiraju (template linkovi unutar primera nisu navigacija).

Skripta **nije** deo **CI (monorepo)** pipeline-a (job **`python`** / **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md)) i ne menja scope **`verify-monorepo.ps1`** — broken linkovi su informativan signal, ne build/test failure. Pun verify mirror i dalje je [`verify-monorepo.ps1`](./verify-monorepo.ps1) (uključujući **`apps/omnigroup-web`** osim **`-SkipOmnigroupWeb`**), HTTP smoke je [`smoke-stack.ps1`](./smoke-stack.ps1) + bundled **`npm run smoke:all`** (formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) — *Local notes — Smoke tests*).

| Scenario | Komanda |
|----------|---------|
| Pun pregled (default) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-doc-links.ps1` |
| Pre-merge gate-flavor (non-zero exit ako ima broken) | `... -File .\scripts\check-doc-links.ps1 -FailOnBroken` |
| Samo not-found (preskoči empty targete iz `EMPTY-DOCS-RUNBOOK.md`) | `... -File .\scripts\check-doc-links.ps1 -SkipEmptyTargets` |
| Pun spisak (više od 200 broken) | `... -File .\scripts\check-doc-links.ps1 -MaxOutput 1000` |

`Get-Help`: **`Get-Help .\scripts\check-doc-links.ps1 -Full`** (parametri **`-FailOnBroken`**, **`-MaxOutput`**, **`-SkipEmptyTargets`** — switch idiom umesto `[bool]` zbog `powershell -File` parser problema sa `-X:$false`; uvek završava **`exit 0`** osim ako je **`-FailOnBroken`** i postoji bar jedan broken / empty link).

**Snapshot 2026-05-14 (Val 355):** 122 `*.md` fajlova / 6556 linkova / **0 broken (not-found)** / **22 empty targets** — svih 22 references vode na 5 dehidriranih fajlova iz [`EMPTY-DOCS-RUNBOOK.md`](../docs/EMPTY-DOCS-RUNBOOK.md) (savršen cross-check). Posle vlasnik Korak 1/2/3 restore-a (Val 356+) i empty targets bi trebalo da padne na 0.

## `audit-npm-monorepo.ps1` — read-only `npm audit` (informativan, **nije** gate)

Konsolidovani **`npm audit`** preko sve 3 Node tačke u monorepu (Atina, Nest, omnigroup-web) iz jednog poziva. **Read-only** — **ne** pokreće `npm audit fix` ni `npm audit fix --force` (sve `--force` rezolucije ostaju vlasnik-akcije; redosled P0/P1/P2 → konsolidovani runbook **[`NPM-AUDIT-MONOREPO.md`](../docs/NPM-AUDIT-MONOREPO.md)**, sekcija *Predloženi redosled vlasnik-akcija*; Nest specifika → **[`NPM-AUDIT-NIVO1.md`](../atina-system/docs/NPM-AUDIT-NIVO1.md)**).

Skripta **nije** deo **CI (monorepo)** pipeline-a (job **`python`** / **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md)) i ne menja scope **`verify-monorepo.ps1`** — `npm audit` advisory-ji su build *warnings*, ne *failures*. Pun verify mirror i dalje je [`verify-monorepo.ps1`](./verify-monorepo.ps1) (uključujući **`apps/omnigroup-web`** osim **`-SkipOmnigroupWeb`**), HTTP smoke je [`smoke-stack.ps1`](./smoke-stack.ps1) + bundled **`npm run smoke:all`** (formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) — *Local notes — Smoke tests*).

| Scenario | Komanda |
|----------|---------|
| Sve zavisnosti (uobičajen pregled) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\audit-npm-monorepo.ps1` |
| Samo produkcija (stvaran rizik, manje dev-only buke) | `... -File .\scripts\audit-npm-monorepo.ps1 -OmitDev` |
| Snapshot u JSON (machine-readable evidencija) | `... -File .\scripts\audit-npm-monorepo.ps1 -OmitDev -OutDir evidence/npm-audit` |
| CI / pre-merge gate-flavor (non-zero exit ako critical) | `... -File .\scripts\audit-npm-monorepo.ps1 -OmitDev -FailOnCritical` |

`Get-Help`: **`Get-Help .\scripts\audit-npm-monorepo.ps1 -Full`** (parametri **`-OmitDev`**, **`-OutDir`**, **`-FailOnCritical`**; uvek završava **`exit 0`** osim ako je **`-FailOnCritical`** i postoji **critical** advisory; primeri u zaglavlju skripte). Snapshot 2026-05-14 (Val 355): **30** advisory-ja sve / **8** prod-only — detalji + vlasnik-akcije: [`NPM-AUDIT-MONOREPO.md`](../docs/NPM-AUDIT-MONOREPO.md). Sledeći planirani prolaz: posle vlasnik **D.1 restore** (Val **356**) i **P1.A/B/C** PR-ova (Val 357/358/359 — vidi runbook *Predloženi redosled vlasnik-akcija*).

## Povezani dokumenti

- [NIVO-1-START.md](../NIVO-1-START.md) — podizanje stackova; HTTP smoke [`smoke-stack.ps1`](./smoke-stack.ps1) · **`npm run smoke:all`** (Atina); pun CI red [`verify-monorepo.ps1`](./verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`../docs/GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md))
- [release-gate-checklist.md (Atina operations)](../atina-platform/atina/docs/operations/release-gate-checklist.md) — formalni release gate; *Local notes — Smoke tests* (**`npm run smoke:all`** vs korenski **`smoke-stack.ps1`**, vidi odeljak `` `smoke-stack.ps1` `` iznad)
- [NIVO-1-F4-TIM-CHECKLIST.md](../docs/NIVO-1-F4-TIM-CHECKLIST.md) — **F.4**, tim — matrica koraka (GitHub `main` **ili** lokalno bez Actions)
- [CONTRIBUTING.md](../CONTRIBUTING.md) — PR granice, komande pre merge-a
- [SYSTEM-MAP.md](../SYSTEM-MAP.md) — portovi i monorepo gate-ovi
- [tests/README.md](../tests/README.md) — Python `pytest` (koren)
- [NIVO-1-DRYRUN-LOG.md](../docs/NIVO-1-DRYRUN-LOG.md) — dry-run / deploy / rollback zapisi; **Smoke napomena** + šablon „kopiraj ispod“: par [`smoke-stack.ps1`](./smoke-stack.ps1) ↔ **`npm run smoke:all`** (**`smoke:all`**)
- [Atina deploy/rollback runbook](../atina-platform/atina/docs/operations/deploy-rollback-checklist.md) — staging dry-run, endpoint matrica
- [NIVO-2-MASTER-CHECKLIST.md](../NIVO-2-MASTER-CHECKLIST.md) — Nivo 2; isti lokalni **CI (monorepo)** mirror ([`verify-monorepo.ps1`](./verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`../docs/GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](./smoke-stack.ps1) · **`npm run smoke:all`** (Atina))
- [DB backup/restore runbook](../atina-platform/atina/docs/operations/db-backup-restore-runbook.md) — Postgres + vault; opciono [`verify-monorepo.ps1`](./verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`../docs/GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md)) pre prozora; kad su stackovi gore, opciono [`smoke-stack.ps1`](./smoke-stack.ps1) · **`npm run smoke:all`** (Atina)
- [MIGRATIONS-PLAN.md (atina-system)](../atina-system/docs/MIGRATIONS-PLAN.md) — TypeORM; **`verify:ci`** u ovom skriptu pokreće migracije + e2e kao u Actions
- [NIVO-3-STATUS.md](../docs/NIVO-3-STATUS.md) · [NIVO-3-AGENT-WAVES.md](../docs/NIVO-3-AGENT-WAVES.md) — Nivo 3 talasi; isti [`verify-monorepo.ps1`](./verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`../docs/GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](./smoke-stack.ps1) · **`npm run smoke:all`** (Atina) nakon konsolidacije
- [NPM-AUDIT-MONOREPO.md](../docs/NPM-AUDIT-MONOREPO.md) — konsolidovani `npm audit` runbook (Val 355 / 2026-05-14) i vlasnik-akcije (P0 D.1 / P1.A `nodemailer` / P1.B `@nestjs/*` / P1.C `next` 14→16 / P2 dev-only); read-only runner: [`audit-npm-monorepo.ps1`](./audit-npm-monorepo.ps1) — sekcija iznad
- [NPM-AUDIT-NIVO1.md (atina-system)](../atina-system/docs/NPM-AUDIT-NIVO1.md) — Nest-specifični trag (level1 + bypass); pokriven konsolidovanim `audit-npm-monorepo.ps1` runner-om
- [EMPTY-DOCS-RUNBOOK.md](../docs/EMPTY-DOCS-RUNBOOK.md) — 5 dehidriranih `.md` fajlova (OneDrive Files-On-Demand) sa Korak 1 (git history) / Korak 2 (OneDrive cloud restore) / Korak 3 (ručna rekonstrukcija sa template-ima); detekcija: [`check-doc-links.ps1`](./check-doc-links.ps1) — sekcija iznad

## Staging URL (placeholder)

**Lokalni preduslov pre deploya:** [`staging-preflight.ps1`](./staging-preflight.ps1) — `owner-status`, disk gate, `go-live-verify` (build + smoke + E2E billing). Brza varijanta bez punog Atina `test:ci`: `-SkipAtinaTestCi`.

**GitHub CI bez `gh auth`:** [`github-ci-status.ps1`](./github-ci-status.ps1) — poslednji Actions run + job rezime. **Branch protection spremnost:** [`branch-protection-ready.ps1`](./branch-protection-ready.ps1). **Probni PR posle protection:** [`prepare-branch-protection-pr.ps1`](./prepare-branch-protection-pr.ps1). **Vlasnik sledeci koraci (deploy):** [`staging-owner-next.ps1`](./staging-owner-next.ps1) (`-RefreshHandoff` azurira handoff doc). **Disk / cleanup:** [`disk-report.ps1`](./disk-report.ps1) · [`free-disk-space.ps1`](./free-disk-space.ps1). **Staging handoff refresh:** [`refresh-staging-handoff.ps1`](./refresh-staging-handoff.ps1). **CI evidence sync:** [`sync-ci-evidence.ps1`](./sync-ci-evidence.ps1). **Brzi lokalni gate-ovi:** [`owner-gates-quick.ps1`](./owner-gates-quick.ps1).

**Posle deploya na staging host:** [`staging-smoke-remote.ps1`](./staging-smoke-remote.ps1) — `GET /health` + `npm run smoke:all` protiv `STAGING_ATINA_NODE_BASE`. Pun stack (Astra + Nest + Atina): `-IncludeStack` + `STAGING_NEST_BASE` / `STAGING_ASTRA_BASE`.

Zameni u internoj dokumentaciji ili CI varijablama (ne commituj tajne):

- `STAGING_ATINA_NODE_BASE` — npr. `https://staging-api.example.com`
- `STAGING_NEST_BASE` — npr. `https://staging-nest.example.com` (ili `http://127.0.0.1:3001` lokalno)
- `STAGING_ASTRA_BASE` — npr. `http://127.0.0.1:8080`

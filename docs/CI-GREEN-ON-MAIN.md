# CI zelen na `main` — repo checklist (ljudi)

**Cilj:** posle svakog merge-a na **`main`** monorepo **GitHub Actions** prolaz treba da bude **zelen** — svi relevantni job-ovi workflow-a **CI (monorepo)** su **uspešni**. Ovaj dokument je **runbook za ljude** (otvori Actions, proveri koji job, šta dalje ako je crveno). Ne zamenjuje branch protection; vidi [GIT-BRANCH-PROTECTION.md](./GIT-BRANCH-PROTECTION.md) ako želiš da merge bude blokiran dok check-ovi ne prođu.

**Workflow (izvor istine):** [`.github/workflows/ci-monorepo.yml`](../.github/workflows/ci-monorepo.yml) · **`name:`** u YAML-u = **`CI (monorepo)`** (tako se workflow vidi u GitHub UI).

**Next — interni dok hub:** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** — [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md).

**Poslednji zeleni run (2026-06-04):** [#197](https://github.com/Marko200322/omni-group/actions/runs/26949010798) - `df1e890` - 5/5 jobova. Lokalna provera: [github-ci-status.ps1](../scripts/github-ci-status.ps1). Probni PR: [prepare-branch-protection-pr.ps1](../scripts/prepare-branch-protection-pr.ps1).

---

## 1. Kako otvoriti Actions

1. Otvori repozitorijum na GitHub-u.
2. Klikni tab **Actions**.
3. U levoj koloni (ili filteru) izaberi workflow **`CI (monorepo)`**.
4. Klikni poslednji run vezan za granu **`main`** (ili **`master`** ako je to default) posle merge-a — ili otvori konkretan run sa PR-a pre merge-a.

**Brza provera:** na stranici repoa, **Actions** → **CI (monorepo)** → sortiraj po **`main`** / poslednji push — svi job-ovi treba da budu zeleni.

---

## 2. Pet job-ova (šta znači svaki)

U Actions-u se job-ovi prikazuju po polju **`name:`** u workflow fajlu. U YAML-u **job id** je kraći (leva kolona u tabeli).

| Job id (YAML) | Ime u Actions / check | Šta radi (kratko) |
|---------------|------------------------|-------------------|
| `python` | **Python (Doslednost dok + pytest)** | Prvo **Doslednost dok** (`scripts/audit-doc-gate-references.ps1` — doc gate md/txt + yaml/ps1/ini, uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`** u [`scripts/README.md`](../scripts/README.md)), zatim **`python -m pytest`** u korenu repoa. |
| `atina-saas` | **Atina SaaS (test:ci)** | Jedan job (bez shard-a): `npm ci`, build, `npx eslint`, Jest `--runInBand --forceExit` (bez coverage na GHA); gate preko [`jest-ci-gate.mjs`](../atina-platform/atina/scripts/jest-ci-gate.mjs). Coverage lokalno: **`npm run test:ci`**. Timeout **45 min**. |
| `omnigroup-web` | **Omnigroup web (Next.js build)** | U `apps/omnigroup-web`: **`npm ci`**, **`npm run build`**. |
| `atina-system` | **Atina System (verify:ci)** | U `atina-system`: **`npm ci`**, **`npm run verify:ci`** (Postgres servis na runneru; migracije + e2e u skladu sa workflow-om). |
| `compose` | **Compose (docker compose config)** | Tri **`docker compose … config --quiet`**: Nest merge (`docker-compose.atina.yml` + `docker-compose.nest-port-3001.yml`), korenski `docker-compose.yml`, `atina-platform/atina/docker-compose.yml`. |

Lokalni **pun mirror** istog reda kao job **`python`** (plus ostatak skripte): [`scripts/verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) — detalji i switch-evi u [`scripts/README.md`](../scripts/README.md). **Posle podignutih servisa** (nije isti korak kao CI na GitHub-u): dublji Atina bundled gate — **`npm run smoke:all`** u `atina-platform/atina` — formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Smoke tests*); multi-stack HTTP stub iz korena: [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) (Atina Node = **GET** `/health`).

---

## 3. Branch protection i obavezni check-ovi (opciono)

Ako vlasnik repoa uključi **Require status checks**, imena u UI-u često izgledaju kao **`CI (monorepo) / <Job name>`**. Pun spisak job id → **`name:`** i napomene o starijim oznakama: [GIT-BRANCH-PROTECTION.md](./GIT-BRANCH-PROTECTION.md) (odeljak **3. (Optional) Require status checks to pass**).

**Opciona tabela (required checks)** — izaberi **svih pet** ako želiš pun gate pre merge-a:

| Job id | Tipična oznaka required check-a |
|--------|----------------------------------|
| `python` | **Python (Doslednost dok + pytest)** |
| `atina-saas` | **Atina SaaS (test:ci)** |
| `omnigroup-web` | **Omnigroup web (Next.js build)** |
| `atina-system` | **Atina System (verify:ci)** |
| `compose` | **Compose (docker compose config)** |

---

## 4. Checklist za čoveka (posle merge-a ili kad sumnjaš)

*(Ovo su stavke koje **ti** potvrđuješ u UI-u ili lokalno — nisu automatski „evidencija“ u drugim dokovima.)*

- [ ] U **Actions** postoji svež run **CI (monorepo)** za **`main`** posle poslednjeg merge-a.
- [ ] Sva pet job-ova iz tabele iznad su **zelena** (nema crvenog / cancelled osim ako je očekivano).
- [ ] Ako koristiš branch protection: PR na **`main`** pokazuje iste check-ove kao zelene pre merge-a.

---

## 5. Kad novi push na `main` ostaje **Pending** (queue)

Workflow [`ci-monorepo.yml`](../.github/workflows/ci-monorepo.yml) koristi **`cancel-in-progress: true`** na svim granama (2026-05-21) — novi push na `main` otkazuje zaglavljeni run. Job **`atina-saas`** ima **`timeout-minutes: 45`** da `test:ci` ne drži queue beskonačno.

**Tipičan uzrok (2026-05-21):** run [26195848715](https://github.com/Marko200322/omni-group/actions/runs/26195848715) (`a628906`) — job **Atina SaaS (test:ci)** ostao **`in_progress`** satima; run [26196348887](https://github.com/Marko200322/omni-group/actions/runs/26196348887) (`5f6461b`) stoji **pending**.

**Šta uraditi (vlasnik, ~1 min):**

1. **Actions → CI (monorepo)** → otvori **zaglavljeni** run na `main`.
2. **Cancel workflow** (gornji desni ugao).
3. Sačekaj da se pokrene ili ručno **Re-run** poslednji commit (`5f6461b` ili noviji).

Posle fix-a doc gate-a (`e6a80ec`+) očekuj **zelen** job **Python (Doslednost dok + pytest)**; lokalno: `.\scripts\audit-doc-gate-references.ps1` + `python -m pytest -q`.

---

## 6. Kad je crveno

1. **Otvori padajući job** u tom run-u i pročitaj poslednje log linije (koji korak je pao — pytest, `npm run build`, `verify:ci`, `docker compose config`, itd.).
2. **Lokalna reprodukcija:** [`scripts/README.md`](../scripts/README.md) → **`verify-monorepo.ps1`** (isti red kao CI job **`python`** i ostatak mirror-a; switch-evi **`-SkipOmnigroupWeb`**, **`-SkipCompose`**, **`-SkipNestVerifyCi`**, **`-SkipDocAudit`** za užu dijagnostiku). Kad su Astra/Nest/Node gore, za Atina Node dodatno **`npm run smoke:all`** (`smoke:all`) u `atina-platform/atina` — isti release gate link kao u odeljku 2 iznad.
3. **Port mismatch** (Nest / Postgres na hostu, `POSTGRES_PORT` vs stvarni port): odeljak **Port mismatch** u [`scripts/README.md`](../scripts/README.md) (i srodni pasus u [GIT-BRANCH-PROTECTION.md](./GIT-BRANCH-PROTECTION.md) za lokalni paritet).
4. **Doc gate** (`python` / **Doslednost dok**): proveri poruku iz `audit-doc-gate-references.ps1` u logu; uskladi reference u dokovima prema [`scripts/README.md`](../scripts/README.md).

---

## Povezano

- [GIT-BRANCH-PROTECTION.md](./GIT-BRANCH-PROTECTION.md) — pravila na `main`, opcioni required checks.
- [`scripts/README.md`](../scripts/README.md) — `verify-monorepo.ps1`, **Port mismatch**, **Doslednost dok**.
- [EVIDENCE-INDEX.md](./EVIDENCE-INDEX.md) — gde upisati **LATEST verify** / monorepo gate evidenciju kad tim to radi posebno.

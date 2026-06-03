# Evidencija — N2 red 0.3 (CI green na svakom merge-u na `main`)

**Poslednji pregled repoa (2026-06-03):** **zelen** `CI (monorepo)` — Run [#83](https://github.com/Marko200322/omni-group/actions/runs/26915159893) na `main` (`65d7633`), **5/5** jobova PASS. Niz zelenih run-ova: #77–#83.

**Poslednji push na `main` (agent, 2026-06-03):** Run [#77](https://github.com/Marko200322/omni-group/actions/runs/26912274234) — fix mock `sqlite3`/`bull` u `setup-env.ts`, `jest-ci-gate.mjs`. Runovi #78–#83 (docs/evidence) takođe **PASS**.

**Status:** **Pass** na `main` (push, ne PR ritual) — vlasnik sign-off ispod za branch protection + PR politiku.

**Cilj:** zatvoriti red **0.3** u [`NIVO-2-MASTER-CHECKLIST.md`](../NIVO-2-MASTER-CHECKLIST.md):

> *0.3 | CI monorepo (job python: Python (Doslednost dok + pytest) na GitHubu) i dalje zelen na svakom merge-u na main*

**Runbook (ljudi):** [`CI-GREEN-ON-MAIN.md`](./CI-GREEN-ON-MAIN.md)  
**Branch protection:** [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)  
**Lokalni mirror (paralela):** [`scripts/verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job python / required check **Python (Doslednost dok + pytest)**; uključuje `apps/omnigroup-web` osim **`-SkipOmnigroupWeb`**); HTTP smoke: [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) (Atina Node stub = `GET /health`) · bundled Atina **`npm run smoke:all`** — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*).

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

---

## Šta vlasnik radi (10–30 min, **posle** Koraka 1 iz [`VLASNIK-PAKET.md`](./VLASNIK-PAKET.md))

> **Preduslov:** Korak 1 iz [`VLASNIK-PAKET.md`](./VLASNIK-PAKET.md) zatvoren — branch protection na `main` postoji, repo gurnut na GitHub. Ako Actions tab kaže "No workflow runs yet", prvo guraj jedan commit na neku feature granu da se prikažu jobovi.

### Korak 1 — Probni PR sa trivijalnom izmenom

```powershell
# Iz korena repoa
git checkout -b chore/n2-0-3-first-green-run
"<!-- ci-trigger: $(Get-Date -Format yyyy-MM-dd) -->" | Out-File -Append README.md -Encoding utf8
git add README.md
git commit -m "chore: trigger first CI green run for N2 0.3"
git push -u origin chore/n2-0-3-first-green-run
```

Otvori PR ka `main` na GitHub-u.

### Korak 2 — Sačekaj svih 5 jobova zeleno

U **Actions → CI (monorepo)** workflow-u (`name:` u `.github/workflows/ci-monorepo.yml`), svih 5 jobova mora biti zeleno:

| Job id | Required check display name |
|--------|----------------------------|
| `python` | **`Python (Doslednost dok + pytest)`** |
| `atina-saas` | **`Atina SaaS (test:ci)`** |
| `omnigroup-web` | **`Omnigroup web (Next.js build)`** |
| `atina-system` | **`Atina System (verify:ci)`** |
| `compose` | **`Compose (docker compose config)`** |

Trajanje: ~2 min (Python, web, Nest, compose) + **~20–60 min** za **Atina SaaS** (build + lint + jest, `--maxWorkers=2` na CI). Ukupno često **25–65 min**. Ako padne crveno, vidi [`CI-GREEN-ON-MAIN.md`](./CI-GREEN-ON-MAIN.md) odeljak **6. Kad je crveno**.

### Korak 3 — Merge na `main`

Posle zelene check liste, klikni **Merge pull request** (squash / rebase / merge — po politici tima).

### Korak 4 — Potvrdi da posle-merge run na `main` ostaje zelen

1. Idi na **Actions** → **CI (monorepo)** → filtriraj po grani **`main`**.
2. Najnoviji run *(triggered by merge)* mora biti zelen na svih 5 jobova.
3. Kopiraj URL tog run-a (`https://github.com/<org>/<repo>/actions/runs/<run-id>`).

### Korak 5 — Upiši evidenciju

Popuni sign-off blok ispod, otvori [`NIVO-2-MASTER-CHECKLIST.md`](../NIVO-2-MASTER-CHECKLIST.md), red **0.3** → `- [ ]` postaje `- [x]` sa kratkom napomenom:

```markdown
| 0.3 | CI monorepo (job `python`: `Python (Doslednost dok + pytest)`) zelen na svakom merge-u na `main` | [x] — 2026-MM-DD: prvi zelen run <URL>; ritual u docs/N2-0-3-EVIDENCE-LATEST.md |
```

---

## Sign-off blok (popuni)

**Datum prvog zelenog run-a na `main`:** 2026-06-03  
**Vlasnik:** Marko Kosic (agent push; vlasnik potvrđuje branch protection)  
**Repo / branch:** `Marko200322/omni-group` / `main`  
**PR koji je triggerovao prvi run:** N/A — direktan push `7eabd71` (fix Atina CI unit tests)  
**Run URL na `main` (posle merge-a):** https://github.com/Marko200322/omni-group/actions/runs/26912274234

| Provera | Status (Pass / Fail / N/A) |
|---------|----------------------------|
| Branch protection na `main` aktivan (Korak 1 iz VLASNIK-PAKET) | N/A — vlasnik |
| `Python (Doslednost dok + pytest)` zelen na PR-u | N/A — push na main |
| `Atina SaaS (test:ci)` zelen na PR-u | N/A — push na main |
| `Omnigroup web (Next.js build)` zelen na PR-u | N/A — push na main |
| `Atina System (verify:ci)` zelen na PR-u | N/A — push na main |
| `Compose (docker compose config)` zelen na PR-u | N/A — push na main |
| Posle merge-a: isti workflow zelen i na grani `main` | **Pass** — Run #77 |

**Ukupno:** **Pass** — CI zelen na `main`; preostaje vlasnik: `gh auth login`, branch protection, PR ritual za buduće merge-ove.

**Kad je Pass:** stavi **`[x]`** na red **0.3** u [`NIVO-2-MASTER-CHECKLIST.md`](../NIVO-2-MASTER-CHECKLIST.md). Time je i poslednji preostali `- [ ]` u N2 master listi zatvoren — Nivo 2 je 100% inženjerski.

---

## Šta posle ovoga još može da padne (i šta nije problem)

**Realnost:** "kontinuirani zelen CI" nije jednom-i-zauvek. Kasnije će neki PR pasti — ali ako:
- Branch protection blokira merge dok check-ovi nisu zeleni (Korak 3 u [`GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md)),
- I ti popraviš pad pre nego što merge-uješ,

red 0.3 ostaje `[x]` u principu — to je proces, ne single-shot dokaz. Ako tim odluči da treba periodična re-evidencija, kreiraj kvartalni audit u istom šablonu.

---

*Verzija: N2 0.3 evidence v1 (2026-05-13). Ažuriraj samo polja unutar šablona.*

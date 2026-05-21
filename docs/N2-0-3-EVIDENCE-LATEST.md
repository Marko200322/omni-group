# Evidencija — N2 red 0.3 (CI green na svakom merge-u na `main`)

**Poslednji pregled repoa (2026-05-21):** nije zatvoreno — čeka **zelen** `CI (monorepo)` run na `main` (vlasnik sign-off ispod).

**Poslednji push na `main` (agent, 2026-05-21):** `295b3d5` — [Actions run 26196798750](https://github.com/Marko200322/omni-group/actions/runs/26196798750). **4/5 zeleno** (Python, omnigroup-web, atina-system, compose); **Atina SaaS (test:ci)** u toku. Workflow: `cancel-in-progress` + `timeout-minutes` (commit `295b3d5`).

**Status:** _čeka zelen run + ritual (branch protection opciono pre merge politike)_

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

Trajanje: ~7–12 min (paralelno u GitHub runneru). Ako padne crveno, vidi [`CI-GREEN-ON-MAIN.md`](./CI-GREEN-ON-MAIN.md) odeljak **5. Kad je crveno**.

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

**Datum prvog zelenog run-a na `main`:** _(YYYY-MM-DD)_  
**Vlasnik:** _(ime)_  
**Repo / branch:** `<org>/<repo>` / `main`  
**PR koji je triggerovao prvi run:** _(broj + URL PR-a)_  
**Run URL na `main` (posle merge-a):** _(https://github.com/<org>/<repo>/actions/runs/<id>)_

| Provera | Status (Pass / Fail / N/A) |
|---------|----------------------------|
| Branch protection na `main` aktivan (Korak 1 iz VLASNIK-PAKET) | |
| `Python (Doslednost dok + pytest)` zelen na PR-u | |
| `Atina SaaS (test:ci)` zelen na PR-u | |
| `Omnigroup web (Next.js build)` zelen na PR-u | |
| `Atina System (verify:ci)` zelen na PR-u | |
| `Compose (docker compose config)` zelen na PR-u | |
| Posle merge-a: isti workflow zelen i na grani `main` | |

**Ukupno:** Pass / Fail — _(jedna rečenica)_

**Kad je Pass:** stavi **`[x]`** na red **0.3** u [`NIVO-2-MASTER-CHECKLIST.md`](../NIVO-2-MASTER-CHECKLIST.md). Time je i poslednji preostali `- [ ]` u N2 master listi zatvoren — Nivo 2 je 100% inženjerski.

---

## Šta posle ovoga još može da padne (i šta nije problem)

**Realnost:** "kontinuirani zelen CI" nije jednom-i-zauvek. Kasnije će neki PR pasti — ali ako:
- Branch protection blokira merge dok check-ovi nisu zeleni (Korak 3 u [`GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md)),
- I ti popraviš pad pre nego što merge-uješ,

red 0.3 ostaje `[x]` u principu — to je proces, ne single-shot dokaz. Ako tim odluči da treba periodična re-evidencija, kreiraj kvartalni audit u istom šablonu.

---

*Verzija: N2 0.3 evidence v1 (2026-05-13). Ažuriraj samo polja unutar šablona.*

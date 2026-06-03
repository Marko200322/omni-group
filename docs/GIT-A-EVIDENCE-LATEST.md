# Evidencija — CEO sekcija A (Git: `main` zaštićen, PR obavezni)

**Poslednji pregled repoa (2026-06-04):** CI na `main` **zelen** (Run [#96](https://github.com/Marko200322/omni-group/actions/runs/26919533469), `80040d5`) - spremno za Korak 3 (required checks). Branch protection **jos nije** podeÅ¡en.

**Status:** _čeka vlasnika — GitHub Settings → Branches (5 required checks)_

**Uputstvo (korak po korak):** [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)  
**Šablon (kopija po release-u):** [`GIT-A-EVIDENCE.template.md`](./GIT-A-EVIDENCE.template.md)  
**Doslednost dok** — obuhvat doc gate-a (md/txt + yaml/ps1/ini), koji job **Python** pokreće pre `pytest`-a: [`scripts/README.md`](../scripts/README.md)

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

---

## Šta vlasnik radi (5–10 minuta na GitHub-u)

> **Preduslov:** Imaš admin pristup na repo (Settings dugme vidljivo). Ako repo još uvek nije na GitHub-u nego je samo lokalna kopija, prvo ga `git init` + `git remote add origin …` + `git push -u origin main` (ili `master`); CEO sekcija A se ne može zatvoriti bez Git host-a.

### Korak 1 — Otvori Branch protection rule

1. Idi na **`https://github.com/<tvoj-org-ili-user>/<repo>/settings/branches`**.
2. **Branch protection rules** → **Add branch protection rule**.
3. **Branch name pattern:** `main` *(ili `master` ako ti je default)*.

### Korak 2 — Uključi obavezan PR

- ✅ **Require a pull request before merging**
- *(Opciono, preporučeno za tim)* **Require approvals** = 1
- *(Opciono)* **Dismiss stale pull request approvals when new commits are pushed**

> **Posledica:** direktan `git push origin main` će biti **odbačen** (pomoć: feature grana → PR → merge).

### Korak 3 — *(Opciono ali preporučeno)* Required status checks iz `CI (monorepo)`

1. ✅ **Require status checks to pass before merging**
2. ✅ **Require branches to be up to date before merging**
3. U pretrazi check-ova izaberi **svih 5** (svi su definisani u [`ci-monorepo.yml`](../.github/workflows/ci-monorepo.yml)):

| GitHub job id | Required check display name |
|--------------|----------------------------|
| `python` | **`Python (Doslednost dok + pytest)`** |
| `atina-saas` | **`Atina SaaS (test:ci)`** |
| `omnigroup-web` | **`Omnigroup web (Next.js build)`** |
| `atina-system` | **`Atina System (verify:ci)`** |
| `compose` | **`Compose (docker compose config)`** |

> **Napomena:** GitHub prikazuje check-ove tek pošto su jednom uspeli na repu. Ako još nisi `git push`-ovao na `main`, prvo guraj jedan commit, pa se vrati u Settings.

### Korak 4 — Sačuvaj pravilo (`Create` / `Save changes`)

### Korak 5 — Pokreni jedan **test PR** da potvrdiš da merge bez PR-a ne radi

```powershell
# u Git Bash / WSL ili PowerShell sa git-om
git checkout -b test/branch-protection
"# probni komit" | Out-File -Append README.md
git add README.md
git commit -m "test: branch protection ping"
git push -u origin test/branch-protection
# Otvori PR na GitHub-u → potvrdi da 'Merge' dugme ne radi bez PR-a/check-ova
```

### Korak 6 — Snimi screenshot (opciono, za audit)

- Settings → Branches → screenshot pravila gde se vide kvačice na **Require a pull request** + (ako si uključio) lista 5 required check-ova.
- Sačuvaj kao `docs/GIT-A-screenshot-2026-MM-DD.png` (nije potrebno commit-ovati — može i u privatni team folder).

### Korak 7 — Popuni tabelu ispod

Otvori ovaj fajl, popuni tabelu, postavi **`[x]`** na prvu stavku u **CEO sekciji A** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md), commit + PR ka `main`.

---

## Sign-off blok (popuni)

**Datum:** _(YYYY-MM-DD — popuni posle provere)_  
**Vlasnik:** _(ime)_  
**Repo URL:** _(https://github.com/<org>/<repo>)_  
**Default grana:** _(main / master)_

**Settings → Branches → Branch protection rule:**

| Provera | Status (da / ne / N/A) |
|---------|------------------------|
| Pravilo za **`main`** (ili **`master`**) postoji | |
| **Require a pull request before merging** uključeno | |
| **Require approvals** ≥ 1 (opciono) | |
| **Require status checks to pass before merging** uključeno | |
| **`Python (Doslednost dok + pytest)`** u listi required check-ova | |
| **`Atina SaaS (test:ci)`** u listi required check-ova | |
| **`Omnigroup web (Next.js build)`** u listi required check-ova | |
| **`Atina System (verify:ci)`** u listi required check-ova | |
| **`Compose (docker compose config)`** u listi required check-ova | |
| Test PR potvrdio da direktan merge bez PR-a ne radi | |

**Pass / Fail:** _(Pass / Fail)_

**Screenshot / Actions URL (opciono):** _(file path ili link)_

**Napomena:** Ako default grana nije `main` nego `master`, koristi isti obrazac za tu granu. Ako repo nije na GitHub-u nego na drugom hostu (GitLab, Gitea, …), zameni "Settings → Branches" odgovarajućom putanjom u tom hostu — pravilo "PR obavezan pre merge-a" je isto.

**Kad je Pass:** stavi **`[x]`** na prvu stavku u **CEO sekciji A** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) (red 69 — *„Git repozitorijum: koren = `omni group`, `main` zaštićen…“*) i ažuriraj [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) ako želiš eksplicitan link „zatvoreno“.

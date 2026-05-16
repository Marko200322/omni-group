# Evidencija — CEO sekcija A (Git: `main` zaštićen, PR obavezni)

*(Kopiraj blok; ne lepi tajne. Stavka **u CEO sekciji A** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) stavlja **vlasnik repoa** posle provere na GitHub-u.)*

**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md) — pre `pytest` u job-u **Python**.

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

---

**Datum:** _(YYYY-MM-DD)_  
**Vlasnik:** _(ime)_  
**Repo:** `omni group` (GitHub URL po izboru)

**Provera u Settings → Branches:**

- Pravilo za **`main`** (ili **`master`**) postoji: da / ne  
- **Require a pull request before merging:** uključeno: da / ne  
- (Opciono) **Require status checks** — jobovi iz **CI (monorepo)** (`Python (Doslednost dok + pytest)`, `Atina SaaS`, `Omnigroup web`, `Atina System`, `Compose`): da / ne / N/A — vidi [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)  

**Pass / Fail:** _(Pass / Fail)_  

**Uputstvo:** [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)

# Hub — pet master lista (redom do osposobljavanja)

**Ceo put do „finalnog kraja“ (P0–P15, ceo projekat):** [`MASTER-FINAL-ROADMAP.md`](./MASTER-FINAL-ROADMAP.md) — jedan roadmap od bezbednosti do CEO 100% i opcionog širenja.

**Svrha ovog hub-a:** ulaz za **sekvencu 01 → 05** (izvršni koraci). Svaka lista je kraća od [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md); ceo spoj i matrica **CEO sekcija A–H** ostaju tamo i u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

**Monorepo gate (lokalni CI mirror):** [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) uklj. **`apps/omnigroup-web`** osim **`-SkipOmnigroupWeb`**; **`npm run smoke:all`** u `atina-platform/atina` (bundled Atina gate) — [`scripts/README.md`](../scripts/README.md). **Smoke:** [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) ↔ **`npm run smoke:all`** — isti README; formalni Atina gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*).

| Red | Lista | Šta zatvaraš |
|-----|--------|----------------|
| **01** | [`MASTER-SEQUENCE-01-BASELINE.md`](./MASTER-SEQUENCE-01-BASELINE.md) | Mašina, klon, zavisnosti, čist Nest Postgres, osnovni `verify` / `pytest` |
| **02** | [`MASTER-SEQUENCE-02-GATE-GREEN.md`](./MASTER-SEQUENCE-02-GATE-GREEN.md) | Pun `verify-monorepo.ps1`, doc gate, evidencija verify/smoke |
| **03** | [`MASTER-SEQUENCE-03-STAGING-LIVE.md`](./MASTER-SEQUENCE-03-STAGING-LIVE.md) | Staging stack, `smoke-stack`, `smoke:all`, mirror prod |
| **04** | [`MASTER-SEQUENCE-04-PROD-CUTOVER.md`](./MASTER-SEQUENCE-04-PROD-CUTOVER.md) | CEO **A**/**C**/**G**, live plaćanja, evidencije Pass |
| **05** | [`MASTER-SEQUENCE-05-SUSTAIN-AND-DEPTH.md`](./MASTER-SEQUENCE-05-SUSTAIN-AND-DEPTH.md) | CI na `main`, observability, N2/N3 backlog po potrebi |

**Vlasnik (nalozi, novac):** [`VLASNIK-ZAVRSAVA.md`](./VLASNIK-ZAVRSAVA.md) · [`CEO-OPEN-BULLETS-RUNBOOK.md`](./CEO-OPEN-BULLETS-RUNBOOK.md).

**Indeks dokaza:** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

---

*Poslednja izmena: dodato za sekvencijalni rad.*

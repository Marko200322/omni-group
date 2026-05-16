# Master sekvenca **05** — održavanje + dubina (posle go-live)

**Prethodno:** [`MASTER-SEQUENCE-04-PROD-CUTOVER.md`](./MASTER-SEQUENCE-04-PROD-CUTOVER.md) · **Sledeće:** (ciklus: vrati se na **02** pre svakog većeg release-a)  
**Hub:** [`MASTER-SEQUENCE-HUB.md`](./MASTER-SEQUENCE-HUB.md)

## Cilj

Nakon što je produkcija živa: **ne regresuj** gate-ove; paralelno radi šta product bira iz N2/N3/Faze 4/6.

## Checklist — održavanje

- [ ] **CI zelen na `main`** posle merge-a (ako GitHub) — [`CI-GREEN-ON-MAIN.md`](./CI-GREEN-ON-MAIN.md) · [`NIVO-2-MASTER-CHECKLIST.md`](../NIVO-2-MASTER-CHECKLIST.md) red **0.3** · [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md) red #2.
- [ ] **Pre svakog većeg PR-a:** [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) uklj. **`apps/omnigroup-web`** osim **`-SkipOmnigroupWeb`**; posle podignutih servisa **`npm run smoke:all`** u `atina-platform/atina` — [`scripts/README.md`](../scripts/README.md); ili bar delovi po istom README-u.
- [ ] **Observability** ritual — [`OBSERVABILITY-RUNBOOK.md`](./OBSERVABILITY-RUNBOOK.md) · [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md) red #18.
- [ ] **Rotacija tajni / incident** — isti runbook + [`deploy-rollback-checklist.md`](../atina-platform/atina/docs/operations/deploy-rollback-checklist.md).

## Checklist — dubina (opciono, product)

- [ ] **Staging ≈ prod** održavanje — [`STAGING-MIRROR-PROD.md`](./STAGING-MIRROR-PROD.md) · red #17 u [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md).
- [ ] **Faza 4 nastavak** (Next ↔ API, Celery) — [`FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md) · [`FAZA-4-SAAS-DECISION.md`](./FAZA-4-SAAS-DECISION.md).
- [ ] **Faza 6 / K8s / AI** samo ako product uđe u scope — [`FAZA-6-BACKLOG.md`](./FAZA-6-BACKLOG.md) · [`NIVO-3-VISION-K8S-AI.md`](./NIVO-3-VISION-K8S-AI.md) · red #19 u [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md).
- [ ] **Nivo 3 PDF** po potrebi — [`NIVO-3-MASTER-CHECKLIST.md`](../NIVO-3-MASTER-CHECKLIST.md) · [`NIVO-3-PDF-TRACE.md`](./NIVO-3-PDF-TRACE.md).

## Napomena

Inženjerski redovi **#13–#16** u [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md) su već zatvoreni u repou (**2026-05-11**); ovde se **ne ponavljaju** osim ako radiš refaktor koji zahteva novu rundu integracionih testova ([`NIVO-2-E2E.md`](../atina-platform/atina/docs/operations/NIVO-2-E2E.md)).

---

*Lista 05 — sustain + dubina.*

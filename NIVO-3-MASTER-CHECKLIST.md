# Nivo 3 — N3 master lista (CEO sekcija F — PDF + vizionarski opseg)

**Cilj:** zatvoriti **Nivo 3** = **Nivo 2** (Master Spec inženjerski) + **CEO sekcija F** u [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md) (svi navedeni PDF-ovi: usklađenost sa kodom ili dokumentovan **N/A**) + po odluci proizvoda **dodatni** vizionarski opseg iz blueprint PDF-ova (K8s, širi AI, itd.).

**Status (repou, 2026-05):** Talas A+B+C; **CEO sekcija F** — zatvorena u [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md) (solo, uz trag). **P.N2.2 `[x]` (N3 preduslov zatvoren):** F.4 dokazan **lokalno** punim monorepo mirrorom — [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**LATEST verify Val 355** / **2026-05-14** sa D.1 placeholder Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md) i [`docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md); ranije **Val 354** / **2026-05-13** sa D.1 placeholder rekonstrukcijom; **Val 349** / **2026-05-08**) · [`NIVO-1-MASTER-CHECKLIST.md`](./NIVO-1-MASTER-CHECKLIST.md) red **F.4**. **NIVO-2** red **0.3** (kontinuirani zelen CI na `main`) ostaje **`[ ]`** dok tim ne uvede ritual — [`NIVO-2-MASTER-CHECKLIST.md`](./NIVO-2-MASTER-CHECKLIST.md); opciono URL jednokratnog zelenog **CI (monorepo)** na `main` (job **`python`**: **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)). **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, i **Port mismatch** Nest/pg — [`scripts/README.md`](./scripts/README.md). Inženjerski trag **F** minimum iz N2: [`NIVO-2-CEO-PDF-RULES-CLOSURE.md`](./docs/NIVO-2-CEO-PDF-RULES-CLOSURE.md).

**LATEST verify:** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 sa D.1 placeholder Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13 sa D.1 placeholder rekonstrukcijom — [`docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md)).

**LATEST smoke** (**sekcija H**): [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

**Evidencija / šabloni (indeks + dry-run):** [`docs/EVIDENCE-INDEX.md`](./docs/EVIDENCE-INDEX.md) · [`docs/NIVO-1-DRYRUN-LOG.md`](./docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](./scripts/README.md) — **Kad podigneš novi broj**.

**Next — interni dok hub:** **`/dev/docs`** (uz `npm run dev` u `apps/omnigroup-web`) — [`apps/omnigroup-web/README.md`](./apps/omnigroup-web/README.md).

**Pravila:** max **3–4** paralelna agenta; **Agent 9** (`sve/*.pdf` + **CEO sekcija F**) i **Agent 10** (Sec/Ops, **CEO sekcija G**) — vidi [`AGENT-RADNI-PLAN.md`](./AGENT-RADNI-PLAN.md). Ne širiti PR van granice agenta.

**Ulaz:** [`NIVO-3-START.md`](./NIVO-3-START.md)

---

## Preduslovi (Nivo 2)

| # | Zadatak | Gate |
|---|---------|------|
| P.N2.1 | **Nivo 2** master inženjerski (T3.1, E2E, X.*) — [`NIVO-2-MASTER-CHECKLIST.md`](./NIVO-2-MASTER-CHECKLIST.md) | [x] |
| P.N2.2 | **F.4** — pet jobova **CI (monorepo)** na `main` (job **`python`**: **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) **ili** lokalni [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md); uključuje **`apps/omnigroup-web`** osim **`-SkipOmnigroupWeb`**; **`-SkipDocAudit`** samo lokalno; **Port mismatch** — [`scripts/README.md`](./scripts/README.md)) · [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) (HTTP, opciono; Atina Node stub = GET `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*); **NIVO-2** **0.3** = kontinuirani CI na `main` (odvojeno od P.N2.2) — [`NIVO-2-MASTER-CHECKLIST.md`](./NIVO-2-MASTER-CHECKLIST.md) · [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify:** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 — D.1 Iter 2; ranije **Val 354** / 2026-05-13) · **LATEST smoke** (**sekcija H**): [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14) | [x] — **2026-05-13:** lokalni pun mirror (**Val 354**) sa D.1 placeholder rekonstrukcijom za `apps/omnigroup-web` ([`docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md)); **2026-05-08:** lokalni pun mirror (**Val 349**); **P.N2.2 zatvoren** |

*PDF inventar i biznis opseg (zatvoreno **2026-05**):* [`NIVO-3-SVE-INVENTORY.md`](./docs/NIVO-3-SVE-INVENTORY.md), [`NIVO-3-PDF-TRACE.md`](./docs/NIVO-3-PDF-TRACE.md), [`nivo3-wave-a/`](./docs/nivo3-wave-a/), [`NIVO-3-VISION-K8S-AI.md`](./docs/NIVO-3-VISION-K8S-AI.md). **CEO sekcija F `[x]`:** solo vlasnik repoa uz **partial** trag — [`NIVO-3-CEO-F-PR-BODY.md`](./docs/NIVO-3-CEO-F-PR-BODY.md).

---

## Faza 1 — Agent 9 (PDF / CEO sekcija F)

| # | Zadatak | Gate |
|---|---------|------|
| F.1 | Za svaki red u **CEO sekciji F** [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md): `[x]` uz dokaz u `docs/NIVO-3-PDF-TRACE.md` **ili** eksplicitni **N/A** + razlog | [x] |
| F.2 | Veliki / delimično van repoa (npr. `apex_predator_text.pdf`) — scope vs kod dokumentovan, bez lažnog potpisa | [x] |

---

## Faza 2 — Agent 10 (Sec/Ops + preostala **CEO sekcija G** gde relevantno)

| # | Zadatak | Gate |
|---|---------|------|
| G.N3.1 | Usklađenost `docs/operations/` i produkcionih operativnih stavki iz **CEO sekcije G** sa stanjem posle N2 (rollback, secrets matrica, smoke) — šta je tim, šta je repo | [x] |
| G.N3.2 | Plan `npm audit` / dependency refresh po modulu (bez obavezno jednog PR-a za sve) | [x] |

---

## Faza 3 — Vizionarski opseg (opciono)

| # | Zadatak | Gate |
|---|---------|------|
| V.1 | Kubernetes / multi-cluster — **PR ili dokument „ne uvodimo“** | [x] |
| V.2 | Prošireni AI sloj (per blueprint) — **PR ili dokument „faza 2 proizvoda“** | [x] |

*Dokaz V.1/V.2:* [`NIVO-3-VISION-K8S-AI.md`](./docs/NIVO-3-VISION-K8S-AI.md) + [`nivo3-wave-a/06-g-ops-audit-vision.md`](./docs/nivo3-wave-a/06-g-ops-audit-vision.md) (N/A u trenutnom N3 ciklusu bez product sign-off).

*(Ako tim odluči da N3 = samo **CEO sekcija F**, označi V.1/V.2 kao **N/A** u [`NIVO-3-VISION-K8S-AI.md`](./docs/NIVO-3-VISION-K8S-AI.md) i zatvori fazom 1–2.)*

---

## Izlaz Nivoa 3 (Definition of Done)

| # | Zadatak | Gate |
|---|---------|------|
| X.N3.1 | **CEO sekcija F:** svaki red — **[x]** uz trag **ili** **N/A** u `docs/NIVO-3-PDF-TRACE.md` | [x] |
| X.N3.2 | **G.N3.1** zatvoren ili dokumentovan kao isključivo tim/staging | [x] |
| X.N3.3 | Opseg vizionarskog dela jasan ([`NIVO-3-VISION-K8S-AI.md`](./docs/NIVO-3-VISION-K8S-AI.md)) | [x] |

---

*Verzija: Nivo 3 master v0.1. Ažuriraj `[ ]` po PR-u; ne širi PR van granice agenta.*

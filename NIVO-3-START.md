# Nivo 3 — brzi start (CEO sekcija F — PDF + vizionarski opseg)

**Definicija** (iz [`AGENT-RADNI-PLAN.md`](./AGENT-RADNI-PLAN.md)): **Nivo 2** + **CEO sekcija F** u [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md) (svi PDF-ovi u `sve/` usklađeni sa kodom ili **eksplicitno N/A**) + po **proizvodnoj odluci** ambiciozni deo blueprint-a (npr. K8s, širi AI sloj) ako uopšte ulazi u opseg.

## Ulaz (preporuka)

- **Nivo 2** inženjerski: **N2 master lista** [`NIVO-2-MASTER-CHECKLIST.md`](./NIVO-2-MASTER-CHECKLIST.md) (T3.1, E2E, X.*) + tragovi u [`NIVO-2-CEO-D-TRACE.md`](./docs/NIVO-2-CEO-D-TRACE.md).
- **Spoljni potpis N2:** **P.1** (F.4: pet jobova **CI (monorepo)** na `main` (job **`python`**: **`Python (Doslednost dok + pytest)`** na GitHubu — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) **ili** lokalni [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md); uključuje **`apps/omnigroup-web`** osim **`-SkipOmnigroupWeb`**; **`-SkipDocAudit`** samo lokalno; **Port mismatch** Nest/pg — [`scripts/README.md`](./scripts/README.md)) · [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) (HTTP, opciono; Atina Node = **GET** `/health`) · **`npm run smoke:all`** — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) — [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md)) i **0.3** (merge na `main` u GitHubu ako ga koristiš) — vidi [`NIVO-2-MASTER-CHECKLIST.md`](./NIVO-2-MASTER-CHECKLIST.md); bez toga i dalje može **priprema N3** (PDF inventar, matrica), ali release sign-off tretiraj konservativno.
- **LATEST verify (pun monorepo red, lokalno):** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 sa D.1 placeholder Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13 sa D.1 placeholder rekonstrukcijom za `apps/omnigroup-web` — [`docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md)).
- **LATEST smoke** (**sekcija H**, tri stuba): [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).
- **Evidencija / šabloni (indeks + dry-run):** [`docs/EVIDENCE-INDEX.md`](./docs/EVIDENCE-INDEX.md) · [`docs/NIVO-1-DRYRUN-LOG.md`](./docs/NIVO-1-DRYRUN-LOG.md).
- **Kad podižeš novi Val širom dokova:** [`scripts/README.md`](./scripts/README.md) — **Kad podigneš novi broj**.

**Next — interni dok hub:** uz `npm run dev` u `apps/omnigroup-web`, ruta **`/dev/docs`** — [`apps/omnigroup-web/README.md`](./apps/omnigroup-web/README.md); proširena lista putanja u [`apps/omnigroup-web/src/app/dev/docs/page.tsx`](./apps/omnigroup-web/src/app/dev/docs/page.tsx).

**N2 minimum za PDF pravila (već u repou):** [`NIVO-2-CEO-PDF-RULES-CLOSURE.md`](./docs/NIVO-2-CEO-PDF-RULES-CLOSURE.md) — N3 nadovezuje **celokupan red CEO sekcije F** i dublju **PDF → modul → status** matricu.

**Repou maksimum (2026-05-02):** Talas A+B+C završeni — vidi [`NIVO-3-STATUS.md`](./docs/NIVO-3-STATUS.md) i [`NIVO-3-MASTER-CHECKLIST.md`](./NIVO-3-MASTER-CHECKLIST.md).

### Solo režim (jedan vlasnik repoa)

Kad nema posebnog tima: **ti** si „tim“ za potpis — možeš da ažuriraš u [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md) **CEO sekciju F** na `[x]` kad **ti** prihvatiš trag u [`NIVO-3-PDF-TRACE.md`](./docs/NIVO-3-PDF-TRACE.md) / [`nivo3-wave-a/`](./docs/nivo3-wave-a/) (npr. **partial** kao dovoljan prag). **P.N2.2** u [`NIVO-3-MASTER-CHECKLIST.md`](./NIVO-3-MASTER-CHECKLIST.md) je **`[x]`** uz lokalni dokaz (**Val 355** / 2026-05-14 — D.1 Iter 2; ranije **Val 354** / 2026-05-13; **Val 349** / 2026-05-08): pun [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md); uključuje **`apps/omnigroup-web`** osim **`-SkipOmnigroupWeb`**; **`-SkipDocAudit`** samo lokalno; **Port mismatch** Nest/pg — [`scripts/README.md`](./scripts/README.md)) · opciono [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) (Atina Node = **GET** `/health`) · po potrebi **`npm run smoke:all`** — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) — **LATEST verify:** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) · **LATEST smoke** (**sekcija H**): [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md); **F.4** (matrica koraka): [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md). Ako kasnije koristiš GitHub sa timom, dodatno po želji: zelen **CI (monorepo)** posle merge-a na `main` — red **0.3** u [`NIVO-2-MASTER-CHECKLIST.md`](./NIVO-2-MASTER-CHECKLIST.md).

**Dalje (solo):** **CEO sekcija F** — zatvorena u [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md) (2026-05). **P.N2.2** `[x]` u [`NIVO-3-MASTER-CHECKLIST.md`](./NIVO-3-MASTER-CHECKLIST.md) — lokalni dokaz **Val 355** (2026-05-14 sa D.1 placeholder Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13 sa D.1 placeholder rekonstrukcijom; **Val 349** / 2026-05-08); ako koristiš GitHub, po želji dopuni URL zelenog **CI (monorepo)** na `main`.

## N3 master lista i agenti

- **N3 master lista (operativni koraci):** [`NIVO-3-MASTER-CHECKLIST.md`](./NIVO-3-MASTER-CHECKLIST.md)
- **Talasi po 6 agenata:** [`NIVO-3-AGENT-WAVES.md`](./docs/NIVO-3-AGENT-WAVES.md)
- **Granice agenata 9–10:** [`AGENT-RADNI-PLAN.md`](./AGENT-RADNI-PLAN.md) (*Raspored agenata* — PDF & Sec/Ops)
- **Merge:** [`CONTRIBUTING.md`](./CONTRIBUTING.md)

## Redosled rada (preporuka)

1. **Discovery** — lista fajlova u `sve/` vs redovi **CEO sekcije F** u [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md); odluka šta je **N/A** (npr. celokupan K8s deo ako nije proizvod).
2. **Agent 9** — matrica PDF → modul/repo put → status; ažuriranje `[ ]` u **CEO sekciji F** samo uz dokaz (PR, link na sekciju u trace MD-u).
3. **Agent 10** — Sec/Ops, preostala **CEO sekcija G** gde se preklapa sa produkcionim gate-om (bez lažnog „zeleno“ bez staginga).
4. **Vizionarski sloj** (opciono) — posebni PR-evi / poseban proizvod; u master listi eksplicitno **Van opsega** ili pod-faze.

## Komande (nepromenjeno od N1/N2)

- Root: [`NIVO-1-START.md`](./NIVO-1-START.md) (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md) + pytest, compose, smoke).  
- Jedan lokalni prolaz kao **CI (monorepo):** [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md); prvi korak **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md)) · [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) (HTTP posle servisa; Atina Node = **GET** `/health`) · **`npm run smoke:all`** — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) · [`scripts/README.md`](./scripts/README.md) (**`-SkipOmnigroupWeb`** / **`-SkipNestVerifyCi`** → Nest **`verify:n1`** bez Postgresa; **`-SkipCompose`** bez Docker `config`; **`-SkipDocAudit`** bez doc gate audita lokalno; **Port mismatch** na punom Nest **`verify:ci`**) · **F.4** (matrica koraka): [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify:** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 349** / 2026-05-08) · **LATEST smoke** (**sekcija H**): [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 348** / 2026-05-08).  
- Node SaaS: `atina-platform/atina` → `npm run test:ci`
- Atina Node HTTP (kad je API podignut): **`npm run smoke:all`** — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*). **`smoke-stack.ps1`** za Node: samo **`GET /health`** — [`scripts/README.md`](./scripts/README.md).
- Nest: `atina-system` → `npm run verify:ci` (uz Postgres; brzi **`verify:n1`** = build + unit)

## Šta ne raditi

- Ne označavati **CEO sekciju F** kao `[x]` bez čitljivog traga (modul ili **N/A** sa razlogom).
- Ne mešati **Agent 9** (PDF / `sve/`) sa velikim refaktorom `src/modules/**` u istom PR-u bez dogovora.

---

| Dokument | Svrha |
|----------|--------|
| [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md) — **CEO sekcija F** | Izvor redova PDF |
| [`NIVO-3-MASTER-CHECKLIST.md`](./NIVO-3-MASTER-CHECKLIST.md) | Gate-ovi Nivoa 3 |
| [`NIVO-2-CEO-PDF-RULES-CLOSURE.md`](./docs/NIVO-2-CEO-PDF-RULES-CLOSURE.md) | Inženjerski minimum pre punog F |

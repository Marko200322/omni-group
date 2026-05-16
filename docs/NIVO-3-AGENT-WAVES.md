# Nivo 3 — talasi agenata (Cursor Task)

**Cilj:** paralelno **do 6** agenata **po jednom talasu** (tabela ispod); unutar talasa **disjunktni fajlovi** / moduli. Posle talasa: jedan **konsolidacioni** PR može spojiti `docs/nivo3-wave-a/*.md` u [`NIVO-3-PDF-TRACE.md`](./NIVO-3-PDF-TRACE.md) ako tim želi jednu tabelu.

**CEO sekcija F** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md): ažurirati **jedan** PR po merge dogovoru (nakon što su wave fajlovi gotovi), da nema konflikata.

**Izvršavanje:** preporuka je jedan talas po koraku radi manjeg rizika konflikata; **moguće je** paralelno pokrenuti **više talasa odjednom** (npr. D + E + H + I) ako vlasnik repoa prihvata opterećenje i posle spoji izmene te proveri `test:ci`, **`apps/omnigroup-web`** `build` (ako si dirao taj app) i `verify:ci`.

**Cursor:** ako vidiš `deadline_exceeded` / „Agent Execution Timed Out“, smanji paralelne Task-ove (npr. **samo jedan talas = 6** agenata po poruci), pa nastavi sledeći talas u **sledećoj** poruci.

**Napomena (2026-05-03):** dalje **ne pokretati** Task talase automatski ako vlasnik repoa ne traži; za urađeno / ostalo koristi [`NIVO-3-PLAN-RADA-OSTALO.md`](./NIVO-3-PLAN-RADA-OSTALO.md) i puni lokalni ili GitHub CI gate.

*Puni lokalni mirror **CI (monorepo)** posle većih merge-ova (na GitHubu job **`python`**: **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md) → pytest → Atina `test:ci` → Omnigroup `build` → Nest `verify:ci` + tri `compose config`; opcije **`-SkipOmnigroupWeb`** / **`-SkipNestVerifyCi`** / **`-SkipCompose`** / **`-SkipDocAudit`** lokalno):* [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) (HTTP posle servisa; Atina Node stub = GET `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*) · [`scripts/README.md`](../scripts/README.md) (**Port mismatch** Nest/pg) · **F.4:** [`./NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

**Evidencija / šabloni (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

**Next — interni dok hub:** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** — [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md).

---

## Talas A — PDF trag (6 agenata)

| Agent | Dozvoljeni pisi (samo ovo) |
|-------|---------------------------|
| **N3-A1** | [`nivo3-wave-a/01-master-spec-final.md`](./nivo3-wave-a/01-master-spec-final.md) |
| **N3-A2** | [`nivo3-wave-a/02-ultimate-ultra.md`](./nivo3-wave-a/02-ultimate-ultra.md) |
| **N3-A3** | [`nivo3-wave-a/03-titanix-astra.md`](./nivo3-wave-a/03-titanix-astra.md) |
| **N3-A4** | [`nivo3-wave-a/04-craftor-supply-dominus.md`](./nivo3-wave-a/04-craftor-supply-dominus.md) |
| **N3-A5** | [`nivo3-wave-a/05-omnitube-apex.md`](./nivo3-wave-a/05-omnitube-apex.md) |
| **N3-A6** | [`nivo3-wave-a/06-g-ops-audit-vision.md`](./nivo3-wave-a/06-g-ops-audit-vision.md) |

---

## Talas B — most ka G / PR telu / vizija (6 agenata)

| Agent | Dozvoljeni pisi (samo ovo) |
|-------|---------------------------|
| **N3-B1** | [`NIVO-3-CEO-F-PR-BODY.md`](./NIVO-3-CEO-F-PR-BODY.md) |
| **N3-B2** | [`atina-platform/atina/docs/operations/NIVO-3-G-ALIGNMENT.md`](../atina-platform/atina/docs/operations/NIVO-3-G-ALIGNMENT.md) |
| **N3-B3** | [`NIVO-3-AUDIT-ROADMAP.md`](./NIVO-3-AUDIT-ROADMAP.md) |
| **N3-B4** | [`atina-system/docs/NIVO-3-SUPPLY-CORE-PDF.md`](../atina-system/docs/NIVO-3-SUPPLY-CORE-PDF.md) |
| **N3-B5** | [`NIVO-3-VISION-K8S-AI.md`](./NIVO-3-VISION-K8S-AI.md) |
| **N3-B6** | [`NIVO-3-STATUS.md`](./NIVO-3-STATUS.md) |

---

## Talas C — konsolidacija (1 agent, posle A+B)

| Agent | Zadatak |
|-------|---------|
| **N3-C1** | Spoji sadržaj `docs/nivo3-wave-a/*.md` u ažuriranu glavnu tabelu [`NIVO-3-PDF-TRACE.md`](./NIVO-3-PDF-TRACE.md); reši konflikte; **ne** dirati `CHECKLIST-CEO-SISTEM.md` (tim primenjuje [`NIVO-3-CEO-F-PR-BODY.md`](./NIVO-3-CEO-F-PR-BODY.md)). |

**Stanje 2026-05-02:** izvršeno u repou (sekcija *Talas C* u `NIVO-3-PDF-TRACE.md` + ažuriran [`NIVO-3-MASTER-CHECKLIST.md`](../NIVO-3-MASTER-CHECKLIST.md)).

---

*`[x]` u **CEO sekciji F** primenjuje vlasnik repoa (solo = ti) iz [`NIVO-3-CEO-F-PR-BODY.md`](./NIVO-3-CEO-F-PR-BODY.md).*

---

## Talas D — kod (Node / Nest, 6 agenata)

**Cilj:** PDF trag u N3 + **(T)** učvrstiti testovima; disjunktni `src/modules/<folder>`.

| Agent | Samo ovi moduli + testovi |
|-------|---------------------------|
| **N3-D1** | `atina-platform/atina`: `omnitube`, `omnigame` + odgovarajući `src/tests/unit/**` |
| **N3-D2** | `atina-platform/atina`: `apex-predator`, `template-engine` + unit testovi za ta dva |
| **N3-D3** | `atina-platform/atina`: `titanix`, `titanis` + unit testovi |
| **N3-D4** | `atina-platform/atina`: `craftor`, `dominus360` + unit testovi |
| **N3-D5** | `atina-system`: **samo** `src/modules/supply-core/**` + `*.spec.ts` uz taj modul |
| **N3-D6** | `atina-platform/atina`: `client-hunter`, `lead-scoring` + unit testovi |

Posle talasa: `npm run test:ci` u `atina-platform/atina`; `npm run verify:ci` u `atina-system` (ako diran); za **pun** paritet sa **CI (monorepo)** (uključujući **`apps/omnigroup-web`** build) pokreni iz korena [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md); **Port mismatch** Nest/pg — isti README) · kad su stackovi gore: opciono [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) (Atina Node = **GET** `/health`) · **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) · **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

---

## Talas E — kod (Node SaaS, 6 agenata)

| Agent | Samo ovi moduli + unit testovi |
|-------|--------------------------------|
| **N3-E1** | `payments`, `billing` |
| **N3-E2** | `subscriptions`, `sistem-naplate` |
| **N3-E3** | `gdpr`, `compliance` |
| **N3-E4** | `notifications`, `analytics` |
| **N3-E5** | `integration-hub`, `validator` |
| **N3-E6** | `resource-management`, `kpi` |

**Zabrana:** ne menjati `workflow-chain/service/workflow-chain.service.ts`.

---

## Talas F — kod (Node SaaS, 6 agenata)

| Agent | Samo ovi moduli + unit testovi |
|-------|--------------------------------|
| **N3-F1** | `phase-launch`, `digital-signature` |
| **N3-F2** | `follow-up`, `follow-up-automation` |
| **N3-F3** | `api-gateway`, `titan-monitor` |
| **N3-F4** | `admin`, `audit-log` |
| **N3-F5** | `recommendation`, `ai-memory` |
| **N3-F6** | `titan-master`, `forge` (Titan Forge / `titan-forge.service` u `forge/`) |

**Zabrana:** `workflow-chain.service.ts`.

---

## Talas G — kod (Node SaaS, 6 agenata)

| Agent | Samo ovi moduli + unit testovi |
|-------|--------------------------------|
| **N3-G1** | `deal-offer`, `package-pricing` |
| **N3-G2** | `crm`, `outreach` |
| **N3-G3** | `automation`, `tasks` |
| **N3-G4** | `atina-system`, `users` |
| **N3-G5** | `load-balancer`, `proxy-rotation` |
| **N3-G6** | `backup-recovery`, `system-updater` |

**Zabrana:** `workflow-chain.service.ts`.

---

## Talas H — Nest (`atina-system`, 6 agenata)

Jedan agent = **jedan** modul ispod `atina-system/src/modules/<slug>/` + `*.spec.ts` (bez drugih modula).

| Agent | Samo |
|-------|------|
| **N3-H1** | `atina-system/src/modules/analytics/**` |
| **N3-H2** | `atina-system/src/modules/ai/**` |
| **N3-H3** | `atina-system/src/modules/billing/**` |
| **N3-H4** | `atina-system/src/modules/contracts/**` |
| **N3-H5** | `atina-system/src/modules/crm/**` |
| **N3-H6** | `atina-system/src/modules/notifications/**` |

Posle talasa: `npm run verify:ci` u `atina-system` · za pun monorepo red: [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) iz korena (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md); zatim pytest + Atina + Omnigroup + compose; **Port mismatch** Nest/pg — isti README) · kad su stackovi gore: opciono [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) (Atina Node = **GET** `/health`) · **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) · **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

---

## Talas I — kod (preostali Express moduli, 6 agenata)

Moduli ispod **nisu** u tabelama D–G (jedan agent = jedan folder + odgovarajući `src/tests/unit/**`).

| Agent | Samo ovi moduli + unit testovi |
|-------|--------------------------------|
| **N3-I1** | `auth` |
| **N3-I2** | `contracts` |
| **N3-I3** | `scraper` |
| **N3-I4** | `self-healing` |
| **N3-I5** | `titan-score` |
| **N3-I6** | `workflow-chain` |

**Zabrana (N3-I6):** ne menjati `workflow-chain/service/workflow-chain.service.ts` (isti dogovor kao u E/F/G). Ostali fajlovi u `workflow-chain/**` + testovi dozvoljeni.

Posle talasa: `npm run test:ci` u `atina-platform/atina` · za pun monorepo red: [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) iz korena (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md); **Port mismatch** Nest/pg — isti README) · kad su stackovi gore: opciono [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) (Atina Node = **GET** `/health`) · **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) · **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

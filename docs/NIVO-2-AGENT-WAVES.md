# Nivo 2 — plan talasa agenata (Cursor Task)

**Cilj:** paralelno **6** agenata po talasu, **disjunktni** `src/modules/<folder>` (manje konflikata na merge). Svaki agent: samo svoj modul + `src/tests/unit/**` (i za Nest samo `atina-system/src/**`).

**Šta N2 *ne* može agentima u repou:** **P.1 / F.4** i **0.3** — vidi [`NIVO-1-MASTER-CHECKLIST.md`](../NIVO-1-MASTER-CHECKLIST.md) i [`NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md).

*Lokalni mirror **CI (monorepo)** pre merge-a (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md) → pytest → Atina `test:ci` → `apps/omnigroup-web` build → Nest `verify:ci` / `verify:n1` + tri `docker compose config`; opcije **`-SkipOmnigroupWeb`** / **`-SkipNestVerifyCi`** / **`-SkipCompose`** / **`-SkipDocAudit`** lokalno):* [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) (HTTP posle servisa; Atina Node = **GET** `/health`) · **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) · [`scripts/README.md`](../scripts/README.md) (**Port mismatch** Nest/pg) · **F.4:** [`NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

**Evidencija / šabloni (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

---

## Talas A — jezgro prodaje + izvršavanje (6)

| # | Moduli | Napomena |
|---|--------|----------|
| A1 | `titanis`, `titanix` | DTO / rute / servis edge |
| A2 | `deal-offer`, `package-pricing` | rute + stub već pokriven; ne duplirati veliki diff |
| A3 | `digital-signature`, `contracts` | mali dodatak na postojeće suite-ove |
| A4 | `crm`, `outreach` | modul + rute |
| A5 | `follow-up`, `follow-up-automation` | bez menjanja `workflow-chain.service.ts` |
| A6 | `load-balancer`, `proxy-rotation` | servis / rute |

---

## Talas B — infra moduli + admin (6)

| # | Moduli |
|---|--------|
| B1 | `audit-log`, `auth` (unit samo; auth u `middleware` ako već postoji test glob) |
| B2 | `admin`, `apex-predator` |
| B3 | `omnitube`, `omnigame` |
| B4 | `atina-system`, `users` |
| B5 | `tasks`, `automation` |
| B6 | `craftor`, `dominus360` (održavanje nakon ranijih PR-ova) |

---

## Talas C — Nest + Python (6)

| # | Oblast |
|---|--------|
| C1–C4 | `atina-system` — podela po **4** disjunktna `src/modules/*` (jedan agent = jedan modul ili par susednih bez preklapanja) |
| C5 | Root `tests/**`, `src/**` (Python) — pytest edge ako treba |
| C6 | `docs/` samo — ažurirati [`NIVO-2-DISCOVERY-AUDIT.md`](./NIVO-2-DISCOVERY-AUDIT.md) ili smoke evidenciju |

---

## Talas D — integracija + CI dok (6)

| # | Zadatak |
|---|---------|
| D1 | `src/tests/integration/workflow-chain.*` — jedan novi edge ili samo čitanje + izveštaj |
| D2 | `src/tests/integration/auth.integration.test.ts` — proširenje ako bezbedno |
| D3 | Dokument **GitHub Actions** — ažurirati [`../.github/workflows/ci-monorepo.yml`](../.github/workflows/ci-monorepo.yml) komentar (bez promene job logike); job **`python`** u Actions / branch protection: **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md); uskladiti sa **F.4** [`NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md) |
| D4 | `CONTRIBUTING.md` — jedan pasus „N2 talasi agenata“ link na ovaj fajl |
| D5 | `jest.config.js` — **ne** menjati osim timski dogovor; agent samo pročita i vrati „OK“ |
| D6 | [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) — README cross-link ako treba; Atina Node u skripti = GET `/health` · bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) |

---

*Redosled talasa:* **A → B → C → D** (ili paralelno A+B ako nema istih foldera). Posle svakog talasa: `npm run test:ci` u `atina-platform/atina`.

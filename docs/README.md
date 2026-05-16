# `docs/` — Monorepo dokumentacija (entry-point)

Ovo je središte sve dokumentacije monorepa. Ako prvi put gledaš ovaj direktorijum — kreni odozgo nadole; svaki naslov je tačka ulaza za tipičan tok rada.

> **Napomena:** Ovaj `README.md` je **navigacioni zaslon** — ne sadrži pun sadržaj već usmerava na konkretne fajlove. Pun sadržajni indeks svih dokova: [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md). Generišu ga / održavaju agenti kao "single source of truth" za vlasnika; agent-safe izmene se loguju u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md) (Talas N hronologija).

---

## 1) Vlasnik dolazi prvi put — odakle krenuti

| Cilj | Ulazni dokument |
|------|-----------------|
| Pregledati šta je sad otvoreno / zatvoreno (high-level dashboard) | [`MONOREPO-HEALTH-SNAPSHOT-LATEST.md`](./MONOREPO-HEALTH-SNAPSHOT-LATEST.md) |
| Master backlog (Faze A–F, Nivoi 1–5, agent-safe Talas-evi) | [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md) |
| LATEST verify (CI mirror) — Val br. + dokaz | [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) |
| LATEST smoke (HTTP) — Val br. + dokaz | [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) |
| Sumirani dnevnik dana (najsvežije agent-safe izmene) | [`AGENT-WORK-2026-05-14-SUMMARY.md`](./AGENT-WORK-2026-05-14-SUMMARY.md) |
| Šta vlasnik treba da uradi sledeće (P0 / P1 redosled) | [`VLASNIK-PAKET.md`](./VLASNIK-PAKET.md) i [`VLASNIK-ZAVRSAVA.md`](./VLASNIK-ZAVRSAVA.md) |

## 2) Šta je tačno već zatvoreno (autonomno) i šta čeka vlasnika

- **Sav agent-safe rad (Talas 65 → 192):** [`AGENT-WORK-2026-05-14-SUMMARY.md`](./AGENT-WORK-2026-05-14-SUMMARY.md) — sekcija 1 (zatvoreno autonomno; konsolidovan pregled jedinica/domena u [`TALAS-INDEX.md`](./TALAS-INDEX.md)) + sekcija 2 (čeka vlasnika).
- **Detaljan dry-run log po Talas-u:** [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md) — svaki *Zapis (izvršen)* fajl-po-fajl.
- **Indeks svih dokumenata + runbook-a (jedan red — *paged*):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md).

## 3) Operativni runbook-i

| Domen | Runbook |
|-------|---------|
| `npm audit` (sve 3 Node tačke) | [`NPM-AUDIT-MONOREPO.md`](./NPM-AUDIT-MONOREPO.md) |
| Prazni `*.md` fajlovi (5 dehidrirana) — Korak 1/2/3 | [`EMPTY-DOCS-RUNBOOK.md`](./EMPTY-DOCS-RUNBOOK.md) |
| `apps/omnigroup-web` D.1 placeholder izvori | [`OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md) |
| Python Astra (compose, smoke tri-stub) | [`PYTHON-ASTRA-OPS.md`](./PYTHON-ASTRA-OPS.md) |
| Staging release | [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md) · [`STAGING-MIRROR-PROD.md`](./STAGING-MIRROR-PROD.md) · [`STAGING-EXECUTION-LOG.template.md`](./STAGING-EXECUTION-LOG.template.md) |
| SMTP staging (Atina Node) | [`SMTP-STAGING-RUNBOOK.md`](./SMTP-STAGING-RUNBOOK.md) |
| Observability (health / logovi / tajne) | [`OBSERVABILITY-RUNBOOK.md`](./OBSERVABILITY-RUNBOOK.md) |
| Atina deploy / rollback (formalan release gate) | [`../atina-platform/atina/docs/operations/deploy-rollback-checklist.md`](../atina-platform/atina/docs/operations/deploy-rollback-checklist.md) · [`../atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) |
| GitHub branch protection / required check | [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) |
| F.4 backlog (Next ↔ Atina) | [`FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md) · [`FAZA-4-SAAS-DECISION.md`](./FAZA-4-SAAS-DECISION.md) |

## 4) Auto-generisani dokumenti (regenerišu se skriptama, ne ručno)

| Dokument | Generator | Smer |
|----------|-----------|------|
| [`SCRIPTS-HELP-SNAPSHOT.md`](./SCRIPTS-HELP-SNAPSHOT.md) | [`../scripts/regenerate-help-snapshot.ps1`](../scripts/regenerate-help-snapshot.ps1) | `Get-Help -Full` za svih **43** root `scripts/*.ps1` (default `ScriptDir`; Atina posebno — red ispod) |
| [`SCRIPTS-HELP-SNAPSHOT-ATINA.md`](./SCRIPTS-HELP-SNAPSHOT-ATINA.md) | [`../scripts/regenerate-help-snapshot.ps1`](../scripts/regenerate-help-snapshot.ps1) (`-IncludeAtina`) | Atina podpaket (8 PS skripti) |

> Ne edituj direktno; regen komanda u [`../scripts/README.md`](../scripts/README.md).

## 5) Audit / pre-PR alat (read-only, single entry point)

> **Pun monorepo gate (CI mirror):** [`../scripts/verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) — job **`python`** / required check **`Python (Doslednost dok + pytest)`** ([`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)); pun mirror uključuje `apps/omnigroup-web` build osim sa `-SkipOmnigroupWeb`.
>
> **HTTP smoke:** [`../scripts/smoke-stack.ps1`](../scripts/smoke-stack.ps1) (root level — Atina + Nest + Python tri-stub) + bundled Atina **`npm run smoke:all`** (formalni Atina release gate: [`../atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) — *Local notes — Smoke tests*).

Konsolidovan wrapper (read-only koraci, ne pomera Val broj sam po sebi): [`../scripts/run-all-audits.ps1`](../scripts/run-all-audits.ps1) — **39** koraka (**37** read-only skripte u `scripts/` + `scan-todo-markers.ps1` + `audit-npm-monorepo.ps1`). Brzi pre-PR: `-SkipNpmAudit -SkipTodoScan` (**37** read-only prolaza). **Pun redosled imena koraka** ne duplirati ovde (drift-uje) — kanon je u `Get-Help .\scripts\run-all-audits.ps1 -Full` i u [`../scripts/README.md`](../scripts/README.md).

**Tipičan agent / vlasnik flow pre PR-a:**

1. Brzi audit (preskoči npm i TODO markere koji su informativni):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-all-audits.ps1 -SkipNpmAudit -SkipTodoScan
```

2. Pun monorepo gate (CI mirror — `Python (Doslednost dok + pytest)` required check):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-monorepo.ps1
```

3. HTTP smoke (Atina `npm run smoke:all`):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\smoke-stack.ps1
```

> Komandna referenca + scenariji: [`../scripts/README.md`](../scripts/README.md).

Operativni handbook (lekcije Talas 65 → **166**, 3-/4-way garancija, agent-safe pravila): [`../scripts/AGENT-AUTOMATION-GUIDE.md`](../scripts/AGENT-AUTOMATION-GUIDE.md).

## 6) Nivo 1–5 evidencija (po fazama)

- **Nivo 1 (CI / smoke / docs gate):** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md), [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md), [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md), [`NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md)
- **D.1 / Iter 1 + Iter 2:** [`OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md), [`D1-ITER2-PR-BODY.md`](./D1-ITER2-PR-BODY.md)
- **Faza 4 (Next ↔ Atina):** [`FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md), [`FAZA-4-SAAS-DECISION.md`](./FAZA-4-SAAS-DECISION.md)

---

*Verzija: docs landing v1, 2026-05-14 (Val 355). Talas 81 (paket README presence skener) — autonomno kreiran kako bi `docs/README.md` postojao kao entry-point za `docs/` direktorijum. **Posle 2026-05-15 (kanon):** Talas **114**, audit suite **39** koraka (**37** read-only + TODO + npm) — vidi §5 gore i [`TALAS-INDEX.md`](./TALAS-INDEX.md).*

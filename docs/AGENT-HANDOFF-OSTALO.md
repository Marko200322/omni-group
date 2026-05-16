# Handoff za agenta — šta još treba uraditi

**Repo:** `c:\Users\Marko Kosic\OneDrive\Desktop\omni group`  
**Vlasnik:** unosi API ključeve u `atina-platform/atina/.env` (7 agregatora + Stripe dodatna polja). **Ne commituj `.env`.**

**Politika:** Ne pokretati Cursor Task talase D–I automatski. Raditi direktno u repou + lokalni gate-ovi.

---

## A. Vlasnik (ne agent) — 10 stavki CEO + ključevi

Kopija liste: [`CEO-OPEN-BULLETS-RUNBOOK.md`](./CEO-OPEN-BULLETS-RUNBOOK.md) · korak-po-korak: [`VLASNIK-PAKET.md`](./VLASNIK-PAKET.md)

1. **CEO A** — GitHub: zaštiti `main`, obavezni PR → [`GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md)
2. **CEO C** — Nest prod: `TYPEORM_SYNC=false` + migracije na pravoj bazi → [`TYPEORM-PROD-EVIDENCE-LATEST.md`](./TYPEORM-PROD-EVIDENCE-LATEST.md)
3. **CEO G (8×)** — build prod, staging migracije, prod `.env`, live plaćanja, SMTP, `npm run smoke:all`, admin monitoring, rollback → [`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md)
4. Popuniti **`.env`** agregatore (URL + KEY) — vidi ispod

**Preduslov za Git CEO A:** `git init` + commit na `main` (**2026-05-16**). **Push:** vidi [`GITHUB-PUSH-READY.md`](./GITHUB-PUSH-READY.md) — dodaj `origin` + `git push`.

---

## B. Agent — povezivanje 7 agregatora u kod ✅ (Val 356)

Env šema je u `atina-platform/atina/.env`. Config: `config.aggregators.*` u [`atina-platform/atina/src/config/index.ts`](../atina-platform/atina/src/config/index.ts).

| Agregator | Env | Povezati u modulima (predlog) |
|-----------|-----|-------------------------------|
| `ai` | `AI_URL`, `AI_KEY` | `ai-memory`, `recommendation`, workflow AI koraci |
| `businessDev` | `BUSINESS_AND_DEV_*` | `integration-hub`, CRM sync, GitHub/Meta/Google preko Nango klijenta |
| `scraper` | `SCRAPER_*` | `scraper`, `proxy-rotation`, `client-hunter` |
| `finance` | `FINANCE_*` + Stripe polja | `payments`, `billing`, `subscriptions` — `config.stripe` već čita `FINANCE_KEY` |
| `comms` | `COMMS_*` | `notifications` (umesto ili pored SMTP iz agregatora) |
| `infrastructure` | `INFRASTRUCTURE_*` | deploy skripte, `phase-launch`, ops dokumentacija |
| `storage` | `STORAGE_*` | `backup-recovery`, Forge export, upload endpointi |

**Zadaci:**
- [x] Kreirati tanak klijent po agregatoru npr. `src/integrations/ai-client.ts` (čita `config.aggregators.ai`)
- [x] Zameniti hardkod / stare `process.env.FIVESIM_*` reference ako postoje *(nije bilo u `src/`)*
- [x] Unit testovi sa mock config (bez pravih ključeva) — `src/tests/unit/integrations/aggregator-clients.test.ts`
- [x] `npm run test:ci` zelen posle izmena — **Val 356** / 2026-05-16 (**3081/3081**)

Infra defaulti (baza, JWT): [`config/env-aggregator.json`](../config/env-aggregator.json) — ne duplirati u `.env`.

---

## C. Agent — Git i CI

- [x] Proveriti da je `.env` u `.gitignore` (koren + `atina-platform/atina/.gitignore`)
- [x] Pomoci vlasniku: `.gitignore` u korenu repoa, `git init`, prvi commit — vidi [`GIT-INIT-HELP.md`](./GIT-INIT-HELP.md)
- [x] Drugi commit: agregatori wiring, Faza 0 docs, Nest `esModuleInterop`, runbook-i — vidi `git log`
- [x] Push uputstvo: [`GITHUB-PUSH-READY.md`](./GITHUB-PUSH-READY.md) *(push = vlasnik posle `remote add`)*
- [x] **NIVO-2 red 0.3** — runbook spreman ([`CI-GREEN-ON-MAIN.md`](./CI-GREEN-ON-MAIN.md), [`N2-0-3-EVIDENCE-LATEST.md`](./N2-0-3-EVIDENCE-LATEST.md)); **Pass na GitHubu** = posle prvog push-a + merge na `main`
- [x] Ponovo pokrenuti pun mirror: `scripts/verify-monorepo.ps1` → [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 356** / 2026-05-16, exit 0, ~814 s)

---

## D. Agent — produkcija i operativa (posle vlasnikovih ključeva)

- [x] [`STAGING-MIRROR-PROD.md`](./STAGING-MIRROR-PROD.md) — repou priprema (§6); izvršenje na staging hostu = vlasnik
- [x] [`OBSERVABILITY-RUNBOOK.md`](./OBSERVABILITY-RUNBOOK.md) — runbook u repou (health, logovi, tajne); live ritual = posle deploya
- [ ] Smoke na prod URL: `npm run smoke:all` u `atina-platform/atina` — **vlasnik** (CEO G)
- [x] Tri stub lokalno: [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) Val 351; ponoviti na prod hostu posle deploya

---

## E. Agent — proizvod / front (opciono, niži prioritet)

- [x] **F4-6** — ostaje u backlogu: [`FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md) (nije go-live gate)
- [x] **omnigroup-web D.1** — placeholder komponente + **`npm run build` PASS** (2026-05-16); pun restore sa OneDrive = opciono kasnije — [`OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md)
- [x] PDF **aligned** — nije u scope-u; **audit-complete**: [`NIVO-3-PDF-TRACE.md`](./NIVO-3-PDF-TRACE.md), [`NIVO-3-PDF-FULL-AUDIT-COMPLETE.md`](./NIVO-3-PDF-FULL-AUDIT-COMPLETE.md)

---

## F. Već urađeno (ne ponavljati)

- N1–N3 master DoD u repou; talasi A–I u statusu
- Lokalni gate: Val 355 `verify-monorepo` (**`Python (Doslednost dok + pytest)`**); pytest 11; `test:ci`; Nest `verify:ci` / `verify:n1`
- Env refactor: 7 agregatora u `.env`, ostalo u `config/env-aggregator.json`
- `config.aggregators` + `config.stripe.secretKey` ← `FINANCE_KEY`
- **Val 356:** `src/integrations/*` (7 klijenata) + wiring modula; Nest `esModuleInterop` fix

---

## G. Gate-ovi pre PR-a

```powershell
cd "c:\Users\Marko Kosic\OneDrive\Desktop\omni group"
python -m pytest -q
cd atina-platform\atina
npm run build
npm run test:ci
cd ..\..\atina-system
npm run verify:n1
# pun mirror (Docker Postgres):
# powershell -File .\scripts\verify-monorepo.ps1  # Python (Doslednost dok + pytest) — GIT-BRANCH-PROTECTION.md
```

---

## H. Ključni fajlovi

| Fajl | Uloga |
|------|--------|
| `atina-platform/atina/.env` | 7 agregatora + Stripe (vlasnik popunjava) |
| `config/env-aggregator.json` | DB, Redis, JWT, admin, Nest, Next |
| `CHECKLIST-CEO-SISTEM.md` | 10 otvorenih `[ ]` = ~100% CEO liste |
| `docs/NIVO-3-PLAN-RADA-OSTALO.md` | Plan rada |
| `docs/AGENT-HANDOFF-OSTALO.md` | ovaj fajl |

**Procena:** ~60% ceo sistem (inženjering u repou ~90%; go-live + wiring agregatora ~40% preostalo).

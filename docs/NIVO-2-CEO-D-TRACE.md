# Nivo 2 — trag CEO sekcije D (50 modula)

**Izvor istine za gate X.1:** ovaj fajl + unit/integration testovi u `atina-platform/atina/src/tests/`.  
**Oznake:** **(T)** = smislen unit i/ili routes/integration pokrivač u repou; **N/A** = van monorepo modula ili eksplicitno nije zaseban folder; **Napomena** = šta nije puni produkcioni PDF audit (ostaje N2+ / tim).

**E2E:** trag **CEO sekcije D** (npr. „lead → deal → …”); vidi [`atina-platform/atina/docs/operations/NIVO-2-E2E.md`](../atina-platform/atina/docs/operations/NIVO-2-E2E.md) i integracioni test `atina-platform/atina/src/tests/integration/workflow-chain.core-business-flow.integration.test.ts` (CRM → contract → payment → analytics u jednom `run`). **E2E.3 — pun CoreEngine:** `core-engine.full-stack.integration.test.ts` (`/health`, lista modula, GET po slug-u).

**Evidencija / šabloni (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

| # | Spec (kratko) | N2 | Dokaz (glavni testovi / lokacija) |
|---|-----------------|----|-------------------------------------|
| 1 | Titan / orchestracija | (T) | `src/tests/unit/core-engine.test.ts`, `ModuleRegistry.test.ts`, `module-registry.test.ts` |
| 2 | Titan Core | (T) | isto + lifecycle u CoreEngine testovima |
| 3 | Titan Master | (T) | `titan-master.*.test.ts` |
| 4 | Titan Monitor | (T) | `titan-monitor.service.test.ts`, modul/rute testovi |
| 5 | Titanis | (T) | `titanis.*.test.ts` |
| 6 | Titanix | (T) | `titanix.*.test.ts` |
| 7 | Client Hunter | (T) | `client-hunter.*.test.ts`, `client-hunter.controller.test.ts` |
| 8 | Scraper | (T) | `scraper.*.test.ts`, `scraper-queue-scrape-url.test.ts` |
| 9 | Proxy & Rotation | (T) | `proxy-rotation.*.test.ts`, `proxy-rotation.controller.test.ts` |
| 10 | Online Data Sources | (T) | `integration-hub.*.test.ts`, `integration-hub.controller.test.ts` |
| 11 | Validator | (T) | `validator.*.test.ts` |
| 12 | Lead Scoring | (T) | `lead-scoring.*.test.ts`, `lead-scoring.controller.test.ts` |
| 13 | CRM | (T) | `crm.*.test.ts` |
| 14 | Outreach | (T) | `outreach.*.test.ts`, `outreach.controller.test.ts` |
| 15 | Follow-up Automation | (T) | `follow-up-automation.*.test.ts`, `follow-up-automation.controller.test.ts` |
| 16 | Deal & Offer | (T) | `deal-offer.*.test.ts`, `deal-offer.controller.test.ts` |
| 17 | Package & Pricing | (T) | `package-pricing.*.test.ts`, `package-pricing.stub.test.ts` |
| 18 | Contract Automation | (T) | `contracts.*.test.ts` |
| 19 | Digital Signature | (T) | `digital-signature.*.test.ts` |
| 20 | Billing & Payment | (T) | `billing.*.test.ts`, `payments.*.test.ts`, `billing.controller.test.ts` |
| 21 | Invoice | (T) | `sistem-naplate.*.test.ts` |
| 22 | Subscription | (T) | `subscriptions.*.test.ts` |
| 23 | Alert System | (T) | kompozit: `titan-monitor`, `notifications`, `admin` testovi |
| 24 | Error Handling | (T) | `errors` korišćen kroz suite; `core-engine`, middleware testovi |
| 25 | Logging | (T) | `logger.test.ts` |
| 26 | Security | (T) | `auth.*.test.ts`, `rate-limit.middleware.test.ts`, Helmet/CORS kroz app testove |
| 27 | Access Control | (T) | `auth.*.test.ts` |
| 28 | Audit Log | (T) | `audit-log.*.test.ts` |
| 29 | Phase Launch | (T) | `phase-launch.service.test.ts`, `phase-launch.controller.test.ts`, `phase-activation.middleware.test.ts` |
| 30 | Resource Management | (T) | `resource-management.*.test.ts` |
| 31 | Scaling | N/A | Infra van repoa (vlasnik) |
| 32 | Load Balancer | (T) | `load-balancer.*.test.ts`, `load-balancer.controller.test.ts` |
| 33 | Database Core | (T) | `src/database/**` + integracioni tokovi sa `query`; migracije u `src/database/migrations` |
| 34 | Backup & Recovery | (T) | `backup-recovery.*.test.ts` |
| 35 | Analytics | (T) | `analytics.*.test.ts` |
| 36 | KPI | (T) | `kpi.*.test.ts` |
| 37 | AI Learning & Memory | (T) | `ai-memory.*.test.ts` |
| 38 | Titan Score | (T) | `titan-score.*.test.ts` |
| 39 | Recommendation | (T) | `recommendation.*.test.ts` |
| 40 | Compliance | (T) | `compliance.*.test.ts` |
| 41 | GDPR | (T) | `gdpr.*.test.ts`, `gdpr.controller.test.ts` |
| 42 | Public Website | N/A | Nema modula u repou |
| 43 | Client Dashboard | N/A | Delom `users` + API; nema odvojenog foldera |
| 44 | Admin Dashboard | (T) | `admin.*.test.ts`, `admin.dto.test.ts` |
| 45 | API Gateway | (T) | `api-gateway.*.test.ts`, `api-gateway.controller.test.ts` |
| 46 | Integration Hub | (T) | vidi red 10 |
| 47 | Notification | (T) | `notifications.*.test.ts` |
| 48 | Email System | (T) | unutar `notifications` modula — isti testovi + Nodemailer konfiguracija u kodu |
| 49 | Template Engine | (T) | `template-engine.*.test.ts`, `template-engine.dto.test.ts` |
| 50 | System Updater | (T) | `system-updater.*.test.ts`, `system-updater.controller.test.ts` |

**PDF pravila** (stavke ispod tabele **CEO sekcije D**): zatvoreno uz [`NIVO-2-CEO-PDF-RULES-CLOSURE.md`](./NIVO-2-CEO-PDF-RULES-CLOSURE.md) (modularnost, migracije/rollback, dev/test/prod) + unit/integration/E2E kao gore. Staging webhook šablon: [`NIVO-2-STAGING-WEBHOOKS.md`](./NIVO-2-STAGING-WEBHOOKS.md). Dubinski PDF stranični audit = **N2+** / tim.

---

*Poslednja izmena: Nivo 2 zatvaranje u repou (inženjering). **F.4** (Actions na `main` **ili** lokalni [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) — isti red kao CI — job **`python`**: **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md), zatim pytest + **`apps/omnigroup-web`** build osim **`-SkipOmnigroupWeb`**; **`-SkipDocAudit`** samo lokalno; **Port mismatch** Nest/pg — [`scripts/README.md`](../scripts/README.md) · [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) (HTTP, opciono; Atina Node stub = GET `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*)) i **0.3** i dalje na timu — vidi [`NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md); **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).*

# Nivo 2 — Discovery audit

**Datum:** 2026-05-02  
**Opseg:** [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) **u CEO sekciji D** (50 redova Master Spec v2) vs stvarni kod pod `atina-platform/atina/src/modules/**` + lokacije van `modules/` koje tabela **CEO sekcije D** navodi.

**Izvor liste foldera:** direktorijum `src/modules/` (samo top-level imena).

*Pre merge-a širih izmena modula:* [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) (HTTP, opciono; Atina Node stub = GET `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*) · [`scripts/README.md`](../scripts/README.md) — lokalni mirror **CI (monorepo)** (na GitHubu job **`python`**: **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md) + pytest + ostalo; uključuje **`apps/omnigroup-web`** build osim **`-SkipOmnigroupWeb`**; **`-SkipDocAudit`** lokalno; **Port mismatch** Nest/pg); **F.4:** [`NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

**Evidencija / šabloni (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

---

## 1. Pregled: svi modul-folderi u repou (alfabetno)

`admin`, `ai-memory`, `analytics`, `apex-predator`, `api-gateway`, `atina-system`, `audit-log`, `auth`, `automation`, `backup-recovery`, `billing`, `client-hunter`, `compliance`, `contracts`, `craftor`, `crm`, `deal-offer`, `digital-signature`, `dominus360`, `follow-up`, `follow-up-automation`, `forge`, `gdpr`, `integration-hub`, `kpi`, `lead-scoring`, `load-balancer`, `notifications`, `omnigame`, `omnitube`, `outreach`, `package-pricing`, `payments`, `phase-launch`, `proxy-rotation`, `recommendation`, `resource-management`, `scraper`, `self-healing`, `sistem-naplate`, `subscriptions`, `system-updater`, `tasks`, `template-engine`, `titanis`, `titanix`, `titan-master`, `titan-monitor`, `titan-score`, `users`, `validator`, `workflow-chain`.

**Ukupno:** 52 foldera.

---

## 2. Mapiranje CEO sekcije D (1–50) → kod

Legenda: **OK** = očekivana putanja postoji ili je N/A eksplicitno u matrici **CEO sekcije D**; **DELIMIČNO** = funkcija je podeljena na više foldera / treba ručna dubinska provera; **VAN_MODULES** = očekivano van `src/modules/`.

| # | Spec (kratko) | Status | Napomena |
|---|----------------|--------|----------|
| 1–2 | Titan / Titan Core | **VAN_MODULES** | `src/core/CoreEngine.ts`, `src/core/ModuleRegistry.ts` — nema `titan/` modula (kao u matrici **CEO sekcije D**). |
| 3 | Titan Master | **OK** | `titan-master/` |
| 4 | Titan Monitor | **OK** | `titan-monitor/` |
| 5 | Titanis | **OK** | `titanis/` |
| 6 | Titanix | **OK** | `titanix/` |
| 7 | Client Hunter | **OK** | `client-hunter/` |
| 8 | Scraper | **OK** | `scraper/` (**(F)** — **CEO sekcija D**) |
| 9 | Proxy & Rotation | **OK** | `proxy-rotation/` |
| 10 | Online Data Sources | **DELIMIČNO** | **CEO sekcija D:** `integration-hub/` delimično — folder postoji. |
| 11 | Validator | **OK** | `validator/` |
| 12 | Lead Scoring | **OK** | `lead-scoring/` |
| 13 | CRM | **OK** | `crm/` (**F**) |
| 14 | Outreach | **OK** | `outreach/` |
| 15 | Follow-up Automation | **OK** | `follow-up-automation/`; dodatno postoji i **`follow-up/`** (nije poseban red **CEO sekcije D** — razjasniti odnos pri talasu 2). |
| 16 | Deal & Offer | **OK** | `deal-offer/` |
| 17 | Package & Pricing | **OK** | `package-pricing/` |
| 18 | Contract Automation | **OK** | `contracts/` |
| 19 | Digital Signature | **OK** | `digital-signature/` |
| 20 | Billing & Payment | **OK** | `billing/` + `payments/` |
| 21 | Invoice | **OK** | `sistem-naplate/` (+ billing u **CEO sekciji D**) |
| 22 | Subscription | **OK** | `subscriptions/` |
| 23 | Alert System | **DELIMIČNO** | **CEO sekcija D:** nema jednog `alerts/` — `titan-monitor/`, `notifications/`, `admin/` |
| 24 | Error Handling | **VAN_MODULES** | `src/utils/errors.ts`, CoreEngine middleware |
| 25 | Logging | **VAN_MODULES** | `src/utils/logger.ts` |
| 26 | Security | **DELIMIČNO** | Helmet/CORS/globalno + `auth/` |
| 27 | Access Control | **OK** | `auth/` |
| 28 | Audit Log | **OK** | `audit-log/` |
| 29 | Phase Launch | **OK** | `phase-launch/` |
| 30 | Resource Management | **OK** | `resource-management/` |
| 31 | Scaling | **OK (N/A)** | Infra van modula (N/A u **CEO sekciji D**). |
| 32 | Load Balancer | **OK** | `load-balancer/` |
| 33 | Database Core | **VAN_MODULES** | `src/database/` |
| 34 | Backup & Recovery | **OK** | `backup-recovery/` |
| 35 | Analytics | **OK** | `analytics/` (**F**) |
| 36 | KPI | **OK** | `kpi/` |
| 37 | AI Learning & Memory | **OK** | `ai-memory/` |
| 38 | Titan Score | **OK** | `titan-score/` |
| 39 | Recommendation | **OK** | `recommendation/` |
| 40 | Compliance | **OK** | `compliance/` |
| 41 | GDPR | **OK** | `gdpr/` |
| 42–43 | Public site / Client dashboard | **OK (N/A)** | Kao u matrici **CEO sekcije D**. |
| 44 | Admin Dashboard | **OK** | `admin/` |
| 45 | API Gateway | **OK** | `api-gateway/` |
| 46 | Integration Hub | **OK** | `integration-hub/` |
| 47–48 | Notification / Email | **OK** | `notifications/` (+ konfiguracija emaila u istom sloju) |
| 49 | Template Engine | **OK** | `template-engine/` |
| 50 | System Updater | **OK** | `system-updater/` |

**Zaključak (tabela **CEO sekcije D**):** nema „praznih“ redova gde matrica **CEO sekcije D** očekuje jedan `src/modules/<ime>/` a folder ne postoji — svi modulski redovi koji mapiraju na jedan folder su **pokriveni** osim namernih N/A i van-modulskih redova (1–2, 24–26, 33, 42–43).

---

## 3. Folderi u `src/modules/` koji nisu jedan-na-jedan red u tabeli **CEO sekcije D**

Ovi folderi su u repou i uglavnom su u **CEO sekciji E** [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) ili su proširenje speca:

| Folder | Veza sa matricom / CEO listom |
|--------|---------------------|
| `forge` | **CEO sekcija E** — Forge |
| `workflow-chain` | **CEO sekcija E** — Workflow chain |
| `automation` | **CEO sekcija E** — Automation |
| `craftor`, `dominus360`, `omnitube`, `omnigame`, `apex-predator` | **CEO sekcija E** |
| `self-healing` | **CEO sekcija E** |
| `tasks` | **CEO sekcija E** — Tasks |
| `atina-system` | **CEO sekcija E** — Atina System bridge |
| `users` | **CEO sekcija C** (Nest moduli) + implicitno klijentski API; red 43 spominje `users` |
| `follow-up` | Pored reda 15 (`follow-up-automation`) — **Nivo 2:** dokumentovati ulogu ili spojiti test plan sa redom 15 |

Za **Talas 1 (Agent 5)** prema [`AGENT-RADNI-PLAN.md`](../AGENT-RADNI-PLAN.md): prioritet **`workflow-chain`**, **`forge`**, **`automation`** (disjunktni PR-ovi).

---

## 4. Predlog za fazu **0.2** (usvojeno za rad u repou; tim može promeniti)

1. **Talas 1:** `workflow-chain`, `forge`, `automation` (paralelno max 3 agenta, različiti folderi).  
2. **Talas 2:** blokovi oko **CRM → payments** (redovi 13–22 u smislu biznis toka): `crm`, `outreach`, `follow-up-automation`, `follow-up` (odluka), `deal-offer`, `package-pricing`, `contracts`, `digital-signature`, `billing`, `payments`, `sistem-naplate`, `subscriptions`.  
3. **Talas 3:** preostali `src/modules/**` + moduli **CEO sekcije E** koji nisu ušli u 1–2.  
4. **Agent 8 (E2E):** posle stabilizacije API-ja za lead → deal → contract → payment (PDF pravila / **CEO sekcija F**).

*(**0.2** zatvoren u master listi **2026-05-02** — podrazumevani redosled iz odjeljak 4; tim i dalje može promeniti redosled talasa u PR-u.)*

---

## 5. CI na `main` (red **0.3**)

Zavisno od **F.4** (GitHub `main` (job **`python`**: **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) **ili** lokalni [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) sa istim redom kao CI — prvo **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md), zatim pytest + **`omnigroup-web`**; **Port mismatch** — [`scripts/README.md`](../scripts/README.md) · opciono [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) (Atina Node stub = GET `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*) · **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14)): svaki merge mora držati **CI (monorepo)** zelenim — bez promene procesa u odnosu na Nivo 1.

---

## 6. Talas 1 (Agent 5) — izvršeno u repou **2026-05-02**

- **0.2:** Usvojen podrazumevani redosled iz odjeljak 4 (tim može izmeniti u PR komentaru).
- **Jest `collectCoverageFrom`:** isključen je samo monolit `workflow-chain.service.ts`; DTO, modul i **kontroler** ulaze u coverage — vidi `atina-platform/atina/jest.config.js`.
- **Novi testovi:** `src/tests/unit/workflow-chain.controller.test.ts` (mock `WorkflowChainService`, svi HTTP handleri).
- **Forge / automation:** postojeći unit testovi (`forge.service`, `forge-health`, `automation.module`, itd.) + `npm run test:ci` zeleno posle izmene.

## 7. Paralelni Cursor Task agenti (Talas 2, **2026-05-02**)

Tri disjunktna agenta (follow-up / follow-up-automation, digital-signature, contracts) + lokalno **`package-pricing.stub.test.ts`** (`computePackagePricingRun`). Novi fajlovi u `src/tests/unit/`: `follow-up.controller.test.ts`, `follow-up-automation.controller.test.ts`, `digital-signature.module.unit.test.ts`, `package-pricing.stub.test.ts`. **`npm run test:ci`** nakon merge-a: zeleno (**178** suite-ova u poslednjem prolazu).

*Napomena:* paralelni PR-ovi na GitHubu i dalje treba disjunktne foldere; ovde je sve spojeno u jednom workspace prolazu.

## 8. Talas 2 — druga iteracija (**2026-05-02**, nastavak)

Unit testovi (mock servisa, isti obrazac kao `follow-up.controller.test.ts`):

- `src/tests/unit/phase-launch.controller.test.ts` — `get`, `set`
- `src/tests/unit/client-hunter.controller.test.ts` — `status`, `list`, `create`, `run` (+ idempotency header)
- `src/tests/unit/lead-scoring.controller.test.ts` — `status`, `list`, `create`, `run` (+ `normalizeIdempotencyKeyHeader` trim / prazan)

`npm run test:ci` nakon dodavanja: zeleno.

## 9. Šest paralelnih Cursor Task agenata (celokupan repo — modulska podela, **2026-05-02**)

Pokrenuto **6** `generalPurpose` agenata u pozadini, **disjunktni** skupovi `src/modules/**` (bez preklapanja foldera), cilj: dopuniti **unit testove** ka N2; **ne** pokrivaju **CEO sekciju D** red-po-red, **E2E**, niti **stavke u matrici** ([`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md)) — to ostaje tim + merge na `main` + **F.4**.

| Agent | Moduli (samo ti folderi + odgovarajući `src/tests/unit`) |
|-------|------------------------------------------------------------|
| 1 | `admin`, `ai-memory`, `analytics`, `apex-predator`, `api-gateway`, `atina-system`, `audit-log`, `auth` |
| 2 | `automation`, `backup-recovery`, `billing`, `client-hunter`, `compliance`, `contracts`, `craftor`, `crm` |
| 3 | `deal-offer`, `digital-signature`, `dominus360`, `follow-up`, `follow-up-automation`, `forge`, `gdpr`, `integration-hub`, `kpi` |
| 4 | `lead-scoring`, `load-balancer`, `notifications`, `omnigame`, `omnitube`, `outreach`, `package-pricing`, `payments`, `phase-launch` |
| 5 | `proxy-rotation`, `recommendation`, `resource-management`, `scraper`, `self-healing`, `sistem-naplate`, `subscriptions`, `system-updater`, `tasks` |
| 6 | `template-engine`, `titanis`, `titanix`, `titan-master`, `titan-monitor`, `titan-score`, `users`, `validator`, `workflow-chain` (bez monolit `workflow-chain.service.ts`) |

---

## 10. Zatvaranje Nivoa 2 u repou (**2026**)

- **CEO sekcija D (50 redova):** kolona stavki (`[x]` / `[ ]`) u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) + trag [`NIVO-2-CEO-D-TRACE.md`](./NIVO-2-CEO-D-TRACE.md).
- **CEO sekcija E:** šablon + matrica za webhook: [`NIVO-2-STAGING-WEBHOOKS.md`](./NIVO-2-STAGING-WEBHOOKS.md); zadnji red **CEO sekcije E** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) `[x]` uz timsko izvršenje na stagingu.
- **E2E:** [`../atina-platform/atina/docs/operations/NIVO-2-E2E.md`](../atina-platform/atina/docs/operations/NIVO-2-E2E.md) + integracioni `workflow-chain.core-business-flow`.
- **Master:** [`NIVO-2-MASTER-CHECKLIST.md`](../NIVO-2-MASTER-CHECKLIST.md) — T3.1, E2E, X.* su `[x]` u **inženjerskom** smislu; **P.1** / **0.3** zahtevaju **CI na `main`**.

## 11. Dva nedavna talasa od po šest agenata (kratak pregled)

- **Talas 1 — notifications:** notifikacije i povezani kanali.
- **Talas 1 — validator:** validacija ulaza i servisnih tokova.
- **Talas 1 — scraper + tasks:** prikupljanje podataka i task pipeline.
- **Talas 1 — craftor + dominus360:** paralelni domen **CEO sekcije E** (craftor, dominus360).
- **Talas 1 — recommendation + RM:** preporuke i resource management.
- **Talas 1 — Nest JWT:** autentikacija / JWT sloj (`auth`, `users`).

- **Talas 2 — ai-memory + analytics:** memorija modela i analitika.
- **Talas 2 — kpi + phase-launch:** KPI i faze lansiranja.
- **Talas 2 — integration-hub + backup:** integracije i backup-recovery.
- **Talas 2 — system-updater + self-healing:** ažuriranje sistema i self-healing.
- **Talas 2 — subscriptions + sistem-naplate:** pretplate i naplata.

Zatvaranje N2 i preostale stavke: [`NIVO-2-MASTER-CHECKLIST.md`](../NIVO-2-MASTER-CHECKLIST.md).

# PRODUCTS ≠ DOCS — Brutal per-SKU fulfillment audit (2026-10-08)

**Fear under review (Marko):** „Nećemo samo dokument pakete — trebaju nam PRODUKTI i USLUGE uz dokumente. Bojimo se da smo napravili nešto što nikad neće ispuniti zamisao.“

**Method:** Code handlers + bootstrap + quality checklist + live prod job spot-check (admin login) + HTTP probe of published sites. Marketing catalog copy is **not** evidence.

**Classes**

| Code | Meaning |
|------|---------|
| **A** | LIVE PRODUCT — client can use immediately (URL, shop, runnable scaffold, portal modules) |
| **B** | OPERATIONAL SERVICE PACK — real CRM/tasks/SLA/queue/workspace (usable ops, not only PDF) |
| **C** | DOCUMENT-PRIMARY — PDF/MD is the main deliverable (consulting artifacts) |
| **D** | HUMAN SERVICE — system kickoff + human must deliver ongoing |
| **E** | THEATER / DANGEROUS — looks like a product but is docs-only pretending |

**Handlers:** `atina-platform/atina/src/modules/billing/lib/deliverable-handlers/`  
**Bootstrap:** `client-deliverable-bootstrap.service.ts`  
**Contract:** `package-delivery-spec.ts` + `fulfillment-quality-checklist.ts`

---

## Executive summary (SR) — za Marka

**Niste napravili samo PDF fabriku.** Imate **žive sajtove/shop**, **portal ovlašćenja**, **support queue/SLA**, **CRM seed**, **lead-gen workspace** (pošteno bez izmišljenih leadova). To su proizvodi/usluge.

**Ali:** deo kataloga **jeste** dokumenti (audit, workflow, sales pack, ops-clarity) — i to je OK ako se prodaje kao consulting.  
**Najopasnija rupa (P0, fiksirana u ovom commitu):** `custom-software` na produ do sada je isporučivao **samo PDF/MD** koji pokazuju na VPS put (`/app/data/product-factory/...`) koji klijent **ne može** da preuzme — to je **theater**. Sad se pakuje **`software-scaffold.tar.gz`** u fulfillment artifacts + checklist gate.

**Šta još fali da zamisao uspe:** Stripe LIVE/Connect za pravi merchant shop; live Apollo harvest kad su flagovi upaljeni; custom domain; setup-quick da bude „deblji“ proizvod (ne samo notifications+billing); ljudski odgovori na support retainere.

---

## Live spot-check (prod, 2026-10-08)

Admin session → HARD matrix paymentIds → job API + site HTTP.

| Package | paymentId (sample) | Job | Non-doc proof |
|---------|--------------------|-----|---------------|
| website-ecommerce | `95e6e207-…a21152` | completed, score=100 | Live `/sites/…` **HTTP 200**, ~26 KB; catalog/shop page in site API |
| landing | `de70a81f-…2b65fe` | completed, score=100 | Live **HTTP 200**, ~14.8 KB |
| setup-quick | `1392fb6d-…ac051e` | completed, score=100 | `portal-modules.json` (notifications+billing entitlements) |
| custom-software | `1495ea4f-…75b16e48` | completed, score=100 | **Pre-fix:** only `software-handoff.pdf` + MD — **no downloadable scaffold** |
| lead-gen-retainer | `dc30bffc-…2ea2b4` | completed, score=100 | kickoff report + pipeline workspace + SLA (honest channels) |
| support-priority | `4429800a-…617b27d3af` | completed, score=100 | SLA pack + FAQ seed + welcome |
| bundle-ops-clarity | `443601b1-…08f9bb51b` | completed, score=100 | dual PDFs only (audit + workflow) |

Earlier evidence also: ecommerce storefront `https://omnigrouptech.com/sites/ai-data-studio-2026feae791a-mux7xi1y` (WebFetch + public site API: `siteType=ecommerce`, shop page, bank_transfer checkout settings, stock SKUs). Beauty business site live OK.

**No invented live ads** in this audit. Lead-gen samples show `leads_generated=0` when harvest flag off — honesty holds.

---

## Per-SKU brutal table

### 1. setup-quick — **B** (+ C docs)

| | |
|--|--|
| **Handler** | `setup.handler.ts` → tier `quick` |
| **Non-doc artifacts** | Workspace project; `portal-modules.json`; real `user_modules` notifications+billing; org billing access; welcome notification |
| **Docs** | `setup-quick.pdf` + MD |
| **Live** | No public URL (by design). Entitlements confirmed on prod job. |
| **Verdict** | Real portal ops pack — **thin product**, not theater. Fails vision only if sold as „full platform product“. |

### 2. setup-full — **B** (+ C)

| | |
|--|--|
| **Handler** | `setup.handler.ts` → `full` |
| **Non-doc** | CRM DEMO seed; modules crm/automation/notifications/billing; migration CSV; training outline; 30-day support window; automation honesty = MODULE_ENABLED_NOT_CONNECTED |
| **Docs** | setup PDF + training PDF/MD |
| **Verdict** | Operational onboarding. External automations **not** connected (honest). |

### 3. setup-custom — **B** / borderline **E** if oversold

| | |
|--|--|
| **Handler** | `setup.handler.ts` → `custom` |
| **Non-doc** | Same CRM/entitlements + `production-deploy-manifest.json` (checklist all PENDING_*) |
| **Docs** | enterprise setup PDF |
| **Verdict** | **Runbook product**, not remote deploy. Honest PENDING. Theater only if sales say „we deployed your VPS“. |

### 4. audit — **C**

| | |
|--|--|
| **Handler** | `consulting-doc.handler.ts` |
| **Artifacts** | `technical-audit.pdf` + MD only |
| **Verdict** | Document-primary by design. OK as consulting SKU. |

### 5. integration — **C** (+ config artifact)

| | |
|--|--|
| **Handler** | `consulting-doc.handler.ts` |
| **Non-doc** | `integration-config.json` (`status: DOCUMENTED_NOT_LIVE`), onboarding checklist MD |
| **Verdict** | Developer config pack — tools **not** pre-wired. Not a live integration product. |

### 6. workflow-design — **C**

| | |
|--|--|
| **Handler** | `consulting-doc.handler.ts` |
| **Artifacts** | workflow/SOP PDF + MD |
| **Verdict** | Document-primary. |

### 7. support-priority — **B** + **D**

| | |
|--|--|
| **Handler** | `retainer.handler.ts` + `bootstrapAutomatedSupport` |
| **Non-doc** | Support queue, SLA 24h, kickoff ticket, portal modules, FAQ seed, workspace project |
| **Docs** | welcome PDF, SLA/onboarding MD |
| **Verdict** | Real ops queue. **Human must reply** for ongoing value. |

### 8. support-dedicated — **B** + **D**

| | |
|--|--|
| **Handler** | same retainer path |
| **Non-doc** | SLA 8h, video-meetings module, health-check task, Slack notify when configured |
| **Verdict** | Same as priority, thicker ops + human. |

### 9. landing — **A**

| | |
|--|--|
| **Handler** | `website.handler.ts` |
| **Non-doc** | Live `/sites/{slug}`, HTTP probe, client brand (no Omni chrome) |
| **Docs** | delivery PDF (URL + guides) |
| **Live proof** | HTTP 200 on sampled landing |
| **Verdict** | Real hosted product. |

### 10. website-business — **A**

| | |
|--|--|
| **Handler** | `website.handler.ts` |
| **Non-doc** | Live multi-page (≥5) site under client brand |
| **Verdict** | Real hosted product. |

### 11. website-ecommerce — **A** (merchant LIVE = config required)

| | |
|--|--|
| **Handler** | `website.handler.ts` + public-site shop orders |
| **Non-doc** | Live storefront, shop page, 4+ catalog SKUs, inventory, tax/shipping settings, bank-transfer order API; Stripe TEST when keys set |
| **Live proof** | Sample job HTTP 200 ~26KB; public API `siteType=ecommerce` with shop page + checkout settings |
| **Excludes** | Stripe LIVE / Connect = CONFIGURATION REQUIRED (honest) |
| **Verdict** | Sellable storefront product today (bank transfer). Not full card merchant without Connect. |

### 12. white-label-setup — **A** (+ C)

| | |
|--|--|
| **Handler** | `vertical-growth.handler.ts` → brand PDF + nested `landing` fulfill |
| **Non-doc** | Live partner landing required for `completed` |
| **Verdict** | Product = live landing; PDF is packaging. |

### 13. sales-enablement — **C**

| | |
|--|--|
| **Handler** | `growthFulfillmentHandler` |
| **Artifacts** | sales PDF + MD only |
| **Verdict** | Document-primary. |

### 14. vertical-package — **B** (+ C)

| | |
|--|--|
| **Handler** | `verticalPackFulfillmentHandler` |
| **Non-doc** | CRM seed, modules crm/automation/support-avatar/billing, kickoff ticket, FAQ/SLA packs, workspace project |
| **Verdict** | Industry ops pack. Ads NOT CONNECTED until APIs. |

### 15. lead-gen-retainer — **B** + **D** (honest, not theater)

| | |
|--|--|
| **Handler** | `retainer.handler.ts` → `runLeadGenKickoff` |
| **Non-doc** | CRM stages, sequence templates, weekly plan, channel board, portal tasks, kickoff ticket, analysis pack |
| **Honesty** | `leads_generated=0` without `LEAD_LIVE_HARVEST_ON_KICKOFF` + enrichment; ads NOT CONNECTED without keys |
| **Verdict** | Ops workspace is real. **Not** live lead machine until harvest flags. Selling as „garantovani leadovi“ = theater. |

### 16. ai-support-retainer — **B** + **D**

| | |
|--|--|
| **Handler** | `bootstrapAiSupportRetainer` |
| **Non-doc** | RAG seed, FAQ, ticket queue, modules; avatar CONNECTED only with HeyGen/D-ID keys |
| **Evidence** | `_manual-live-20261007/...ai-support-setup.json` showed avatarConfigured when keys present |
| **Verdict** | Usable AI support ops; video avatar depends on keys. |

### 17. custom-software — **E → A** (fix in this change)

| | |
|--|--|
| **Handler** | `custom-software.handler.ts` + greenfield builder |
| **Pre-audit prod** | Artifacts: PDF + MD only. Source on VPS path client cannot download → **E theater** |
| **Fix** | Persist `software-scaffold.tar.gz` via `persistSoftwareScaffoldArchive`; checklist requires `software_scaffold_archive` |
| **Post-fix** | Downloadable runnable Node/SPA starter + handoff docs = **A** (starter product, not bespoke app) |

### 18. bundle-portal-presence — **A** + **B**

| | |
|--|--|
| **Handler** | `bundle.handler.ts` → setup-quick + landing |
| **Non-doc** | Portal entitlements + live landing URL |
| **Verdict** | Matches vision: product + portal ops. |

### 19. bundle-sales-launch — **A** + **C**

| | |
|--|--|
| **Handler** | landing + sales-enablement |
| **Non-doc** | Live landing + sales PDF |
| **Verdict** | Product + docs kit — intentional. |

### 20. bundle-ops-clarity — **C**

| | |
|--|--|
| **Handler** | audit + workflow-design |
| **Artifacts** | dual PDFs only (confirmed live) |
| **Verdict** | Document bundle. OK if sold as consulting. Fails vision only if sold as „ops product“. |

---

## 1) Which SKUs FAIL the user’s vision?

Vision = **products and services accompany documents**, not docs alone pretending to be products.

| SKU | Fail? | Why |
|-----|-------|-----|
| **custom-software** | **YES (P0)** — fixed in code, needs SafeDeploy | Was docs pointing at inaccessible VPS path |
| setup-custom | Soft fail if oversold | Runbook ≠ deployed infra |
| lead-gen-retainer | Soft fail if sold as live leads | Workspace real; harvest often 0 |
| audit, workflow-design, sales-enablement, bundle-ops-clarity, integration | **No** if cataloged as consulting/docs | Fail only if marketed as software products |
| landing / website-* / white-label / bundle-portal-presence | **Pass** | Live products exist |
| setup-quick/full, support-*, vertical, ai-support | **Pass as ops/service** | Real modules/queues; thin vs „full SaaS product“ |

**Bottom line:** Catalog is **mixed** (good). Worst fake-product was **custom-software**. Consulting SKUs are honestly docs. Site SKUs are real.

---

## 2) What MUST be built next (concrete P0/P1)

### P0 (now)

1. **custom-software downloadable archive** — DONE in this change (`software-scaffold.tar.gz` + checklist gate). **SafeDeploy required** so prod jobs ship the zip.
2. **Re-fulfill or smoke one custom-software** on prod after deploy; confirm artifact download HTTP 200 for `.tar.gz`.
3. **Sales honesty lock:** never claim setup-custom = remote deploy; never claim lead-gen = live leads without harvest flags.

### P1 (next sprint, concrete)

1. **Ecommerce merchant path:** wire Stripe Connect / LIVE only with real keys; keep bank-transfer as default until then (already honest).
2. **Lead harvest switch:** when Apollo + `LEAD_LIVE_HARVEST_ON_KICKOFF` + F4 ready, enable on prod and prove `leads_generated > 0` with evidence — or keep pack-only positioning.
3. **setup-quick thickness:** add at least one client-usable surface beyond notifications+billing (e.g. files module or CRM lite or auto-linked public site slot) so „setup“ feels like a product.
4. **Custom domain runbook automation** for site SKUs (still client DNS) — checklist + optional CNAME verify job.
5. **Support retainers:** staffing SLA so tickets get human replies within promised hours (system already opens tickets).
6. **Client UI:** clear „Download scaffold“ button on fulfillment detail (API already serves artifacts).

### Not P0 (do not fake)

- Invented ads metrics / Titanis lead counts
- Claiming Stripe Connect live without keys
- Claiming SSL/domain DONE in setup-custom

---

## 3) Fixes applied this session

| Change | File(s) |
|--------|---------|
| Zip/tar.gz greenfield into fulfillment artifacts | `artifact-helpers.ts` `persistSoftwareScaffoldArchive`, `custom-software.handler.ts` |
| Checklist blocks release without scaffold archive | `fulfillment-quality-checklist.ts`, acceptance contract, unit mock |
| Honest delivery copy (downloadable archive) | `package-delivery-spec.ts` (atina + web), `deliverable-catalog.ts`, handoff generator |
| This audit | `docs/evidence/PRODUCTS-NOT-JUST-DOCS-AUDIT-20261008.md` |

Unit: `fulfillment-quality-checklist.test.ts` — 33/33 PASS.

**SafeDeploy:** EXIT 0 (web + atina-api). Log: `docs/evidence/_tmp-safedeploy-scaffold-zip-20261008.txt`.

**Post-deploy prod smoke (custom-software):**

| Field | Value |
|-------|-------|
| paymentId | `98c70df6-1731-4d12-8289-f9b5571c78dc` |
| status / score | completed / **100** |
| artifacts | `software-scaffold.tar.gz`, `software-handoff.pdf`, `software_handoff_md.md` |
| download | **HTTP 200**, 4383 bytes (`software-scaffold.tar.gz`) |
| evidence | `docs/evidence/_tmp-custom-software-scaffold-smoke-20261008.txt` |

**P0 theater closed on prod:** client can download a runnable scaffold — not a PDF that only names a VPS path.

---

## Handler → class map (quick)

```
setup.handler          → B (quick/full/custom)
consulting-doc         → C (audit, workflow; integration = C+config)
retainer.handler       → B+D (support*, lead-gen, ai-support)
website.handler        → A (landing, business, ecommerce)
vertical-growth        → B (vertical); A+C (white-label); C (sales)
custom-software        → A after archive fix (was E)
bundle.handler         → A+B / A+C / C
```

---

---

## 4) P1 follow-up — setup-quick thickness + catalog honesty (2026-10-08, same day)

### setup-quick — thicker PRODUCT/OPS pack

| Before | After |
|--------|--------|
| Entitlements: notifications + billing only | Entitlements: **notifications + billing + CRM view + tasks** |
| Welcome notification | Welcome notification + **≥3 actionable onboarding tasks** in Tasks queue |
| Gate: core entitlements | Gate: core + **CRM** + **onboardingTasksSeeded** (notifications+billing alone = FAIL) |
| Automations | Still **NOT CONNECTED** (not granted; honesty kept) |
| CRM DEMO seed | Still **Full onboarding only** (excluded from Quick) |

### Catalog honesty lock (DOCUMENT vs PRODUCT)

Document-primary SKUs now explicitly labeled **DOCUMENT / consulting deliverable** (not live connected product) in catalog + package-delivery-spec + client-offers + delivery-honesty badges:

`audit`, `workflow-design`, `sales-enablement`, `integration` (docs + config), `bundle-ops-clarity`

PRODUCT/OPS language kept for: `setup-quick`, websites/ecommerce, lead-gen, portal+landing bundle.

### Tests

- `setup-handler.acceptance.test.ts` — CRM/tasks + thickness fail path
- `fulfillment-quality-checklist.test.ts` — fails thin notifications+billing; passes CRM+tasks
- `catalog-document-honesty.test.ts` — DOCUMENT vs PRODUCT/OPS strings
- `apps/omnigroup-web/scripts/test-delivery-honesty.mjs` — DOCUMENT labels

### Deploy + smoke

| Step | Result |
|------|--------|
| SafeDeploy | **EXIT 0** (~343s). Log: `docs/evidence/_tmp-safedeploy-setup-quick-thick-20261008.txt` |
| setup-quick smoke | industry=`marketing`, paymentId=`934d1ee3-3bed-46d4-9d71-50abbc49e399`, status=completed, **score=100**, checklistPassed=true |
| portal-modules.json | modulesActivated=`notifications, billing, crm, tasks`; billingAccess=true; notificationSeeded=true |
| Commit | `d3ee672` (pushed `feat/phase10-outreach-send-enabled`) |

Evidence: `docs/evidence/_tmp-setup-quick-thick-smoke-20261008.txt`, `_tmp-setup-quick-thick-portal-modules-20261008.json`.

*No Stripe LIVE. No fake leads.*

---

*Audit date: 2026-10-08. No Stripe LIVE secrets recorded. No invented live ads.*

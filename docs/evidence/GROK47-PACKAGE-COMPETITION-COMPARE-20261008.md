# Grok 4.7 — Omni base packages vs 2026 EU/US SMB competition

**Date:** 2026-10-08  
**Scope:** 20 base fulfillment templates only (not the ~1000 industry SKUs).  
**Market:** EU SME, Germany-facing published EUR where it exists; Serbia-facing sell prices in EUR. USD figures stay in USD (not converted).  
**Code is unchanged.** This file is evidence only.

**Honesty lock (do not invent):** this report does not claim a live Stripe charge, a live ad account, Apollo harvest, or a lead count. It does not say Stripe Connect/LIVE is on. Repo evidence that factory phase was M6 (`docs/FACTORY-MACHINE-JA-CLOSEOUT.md`, `docs/evidence/M6-PROD-20260922.md`) is cited as **documented phase**, not re-checked against production checkout on this date.

---

## How “Omni current price” is read

Two numbers exist in code. They are not the same.

| Layer | Where | What it is |
|-------|--------|------------|
| **Public list** | `getPublicListPriceEur` → `getPackageAnchorEur` | Phase anchor. In-code comment treats Quick setup list as **€549**, which is the **M6** cell in `package-delivery-spec.ts`. `ANCHOR_MULTIPLIER` default is `1`. |
| **Catalog anchor** | `BASE_DELIVERABLE_CATALOG.anchorEur` | Static template price. Often **below** M6. Industry quote math can multiply further (`getIndustryCompetitiveFactor` clamps about **0.68–1.22**, times a per-SKU factor about **0.93–1.08**). |

**Recommended full** and **intro** below are **standard-tier base list prices** for what fulfillment ships today. They are not stacked on nonprofit ×0.72, budget ×0.86, or the competitive factor. Stacking an intro cut on top of those multipliers will undersell cost.

**Intro** = first 50 paying customers, about **13–20%** under the recommended full list, still above template-mill prices.

Fulfillment class codes are from `docs/evidence/PRODUCTS-NOT-JUST-DOCS-AUDIT-20261008.md`: **A** live product, **B** ops/service, **C** document-primary, **D** human must continue, **E** theater.

---

## Executive summary (EN)

Omni is not a PDF-only factory. Live sites, a seeded shop (bank transfer), portal entitlements, support queues, and a downloadable software scaffold are real. Several **M6 list prices assume a heavier product than the handler ships.**

The prices that are hard to defend against 2026 competitors:

- **custom-software** — M6 **€7,900** / catalog **€4,900** for a Node/SPA starter archive. A prod smoke in the 2026-10-08 audit downloaded `software-scaffold.tar.gz` at **4,383 bytes**. A narrow European freelancer MVP is about **€10,000–€16,000**; a solo 7-day MVP is published at **€6,500**. A scaffold is not that product. Recommended list **€1,490**.
- **setup-custom** — M6 **€4,900** for a client-run deploy **runbook** (DNS/SSL/backup **PENDING**), not a remote go-live. German agency sites that are actually built sit nearer **€1,500–€6,000**. Recommended list **€1,990** only if a **90-minute guided handoff** ships with the runbook; otherwise cap at **€1,290**.
- **lead-gen-retainer** — M6 **€990/mo** while `leads_generated=0` unless harvest flags and keys are on. European retainers that book meetings publish about **€2,000–€10,000/mo** (Ripe Leads **€3,750** then **€2,850**). Sell the ops workspace near **€449/mo**. Do not price it as lead generation until harvest is proven.
- **website-ecommerce** — M6 **€4,900** without merchant Stripe LIVE/Connect. DACH/EU Shopify builds that include card checkout cluster about **€3,000–€8,000** (ClickForest SME from **€3,995**). Recommended list **€2,790** for the bank-transfer storefront that exists.
- **support-*** — queues and SLA **targets** exist; a person must still answer. Competitors at **€249–€495/mo** include hours and a response time (RABZI Care Pro **€249**, Enterprise **€495**). A health-check PDF is not problem resolution.

Landing, business site, portal setup, and the ops-clarity docs are in a defensible band if copy stays honest (hosted on `omnigrouptech.com/sites`, AI first draft, no custom domain, documents labeled as documents).

---

## Executive summary (SR)

Niste napravili samo PDF fabriku. Živi sajt, shop na virman, portal ovlašćenja, support red i preuzimivi scaffold jesu stvarni. Problem je što **M6 lista na nekoliko paketa košta kao agencijski proizvod, a handler isporučuje tanju stvar.**

Najskuplji raskorak:

- **custom-software** — M6 **€7.900** za starter arhivu. Smoke na produ: `software-scaffold.tar.gz` **4.383 bajta**. Uži EU freelancer MVP je oko **€10.000–€16.000**. Preporučena lista **€1.490**.
- **setup-custom** — M6 **€4.900** za runbook (DNS/SSL **PENDING**), ne za deploy na klijentski server. Lista **€1.990** samo uz **90-min vođeni handoff**; inače plafon **€1.290**.
- **lead-gen-retainer** — M6 **€990/mes** dok je `leads_generated=0` bez flagova. Agencije koje bukiraju sastanke su **€2.000–€10.000/mes**. Ovaj paket je ops radni prostor: **€449/mes**. Ne zvati ga generatorom leadova dok harvest nije dokazan.
- **website-ecommerce** — M6 **€4.900** bez Stripe LIVE/Connect. Shopify agencije sa karticama kreću oko **€3.000–€8.000**. Za shop koji danas radi (virman, zalihe, 4+ SKU): **€2.790**.
- **support** — red i ciljno vreme postoje; čovek mora da odgovori. PDF health-check nije rešen problem.

Landing, poslovni sajt, brzi portal i ops-clarity dokumenti mogu da stoje na ozbiljnoj ceni ako tekst kaže tačno šta klijent dobija (host na `omnigrouptech.com/sites`, bez custom domena, dokument = dokument).

**Intro za prvih 50:** oko **13–20%** ispod preporučene pune liste. Ne slagati intro popust preko nonprofit/budget množilaca.

---

## Pricing table (recommended standard-tier EUR)

`fullEur` / `introEur` are the recommendation. `m6List` is today’s public list **if** phase is M6 and the multiplier is 1. `catalog` is `anchorEur`.

| baseId | billing | catalog | m6List | fullEur | introEur | intro vs full | competitorBand | notes |
|--------|---------|--------:|-------:|--------:|---------:|--------------:|----------------|-------|
| setup-quick | one_time | 449 | 549 | **549** | **470** | −14% | Agency kickoff / thin portal €400–€1,500; site builders €0 + €10–€40/mo | Price holds: entitlements are real. Do not sell as full CRM. |
| setup-full | one_time | 1290 | 1690 | **1490** | **1290** | −13% | Connected automation projects ~$1,000–$3,000; hands-on CRM impl. higher | DEMO seed + CSV template. Connectors NOT live. |
| setup-custom | one_time | 3490 | 4900 | **1990** | **1690** | −15% | Built agency sites €1,500–€6,000; this SKU is a runbook | €1,990 needs a 90-min handoff. Without it: **€1,290**. |
| audit | one_time | 590 | 790 | **790** | **690** | −13% | Webshore €300 / €1,200; pentest from €1,800+ (excluded) | AI-assisted report + kickoff ticket. Not a pentest. |
| integration | one_time | 1190 | 1990 | **890** | **750** | −16% | Live Zapier/API $300–$3,000; this SKU is docs+JSON | €1,790 only when **one** connector is actually live. |
| workflow-design | one_time | 690 | 990 | **790** | **690** | −13% | Human SOP pilot $750–$1,250; libraries $3,000–$8,000 | No operator interview in the handler. |
| support-priority | monthly | 249 | 399 | **299** | **249** | −17% | RABZI €95–€249; UK brochure £80–£250 | €299 needs real replies, not only a PDF. |
| support-dedicated | monthly | 690 | 1190 | **790** | **690** | −13% | RABZI Enterprise €495 (5h); app care €300–€1,500 | €1,190 needs named hours logged (~8h). |
| landing | one_time | 990 | 1290 | **1190** | **990** | −17% | DE one-pagers €470–€1,290 typical; complex to €2,000 | Hosted subdomain, AI copy, no custom domain. |
| website-business | one_time | 1990 | 2990 | **2290** | **1990** | −13% | DE KMU ab €1,500; WebDrift Core €3,990; DIY €10–€40/mo | 5+ pages, no CMS login for the client. |
| website-ecommerce | one_time | 3490 | 4900 | **2790** | **2290** | −18% | Shopify agency ~€3,000–€8,000 **with cards** | Bank transfer is the product. Cards = config required. |
| white-label-setup | one_time | 1790 | 2490 | **1490** | **1290** | −13% | GHL $97–$497/**mo** platform; Duda WL from $149/mo | One landing + brand PDF, not a reseller SaaS. |
| sales-enablement | one_time | 890 | 1190 | **790** | **690** | −13% | Human playbook pilots ~$750–$1,250 | Document. No calls, no CRM. |
| vertical-package | monthly | 299 | 790 | **349** | **299** | −14% | Jobber from $49/mo; Housecall teams ~$299/mo | Seeded modules, not field-service software. |
| lead-gen-retainer | monthly | 499 | 990 | **449** | **379** | −16% | Meeting retainers €2,000–€10,000; cold email €750–€1,500 | Ops pack. **€1,490/mo** only after proven harvest. |
| ai-support-retainer | monthly | 349 | 690 | **329** | **279** | −15% | Tidio Lyro ~$33–$39 / 50 conv; Fin $0.99/outcome | RAG+queue. **€490/mo** after ≥30% auto-resolve. |
| custom-software | one_time | 4900 | 7900 | **1490** | **1190** | −20% | Solo MVP from ~€4,000–€8,000; narrow freelancer MVP €10,000–€16,000 | Starter archive. Not an MVP. |
| bundle-portal-presence | one_time | 899 | 1090 | **1390** | **1190** | −14% | Sum of recommended parts €1,739 | ~20% off setup-quick + landing. |
| bundle-sales-launch | one_time | 1290 | 1590 | **1590** | **1290** | −19% | Sum of recommended parts €1,980 | Landing + sales PDF. |
| bundle-ops-clarity | one_time | 990 | 1190 | **1290** | **1090** | −16% | Sum of recommended parts €1,580 | Two consulting PDFs + service companion. |

Bundle check (recommended full): portal €549+€1,190=€1,739 → bundle €1,390 (−20%). Sales €1,190+€790=€1,980 → €1,590 (−20%). Ops €790+€790=€1,580 → €1,290 (−18%).

---

## Per package

### 1. setup-quick — portal onboarding

| | |
|--|--|
| **Current** | Public M6 **€549** one-time. Catalog anchor **€449**. |
| **Ships** | **B.** Portal entitlements: notifications, billing, CRM **view**, tasks; welcome notification; ≥3 onboarding tasks; setup PDF. Automations **NOT CONNECTED**. No public URL. No CRM DEMO seed. |
| **Catalog promise** | “PRODUCT/OPS: portal entitlements … welcome onboarding tasks, setup PDF — automations NOT CONNECTED.” Client offer: “Your client portal, ready to use.” |
| **Competitors** | [MOKKA](https://mokka-agentur.de/angebot) landing ab **€499** (that is a page, not a portal). [Webdesign-Preisindex 2026](https://guenstige-webseiten.de/webdesign-preisindex-2026.html): freelancer sites **€500–€3,000**, builders **€10–€40/mo**. HighLevel agency starter **$97/mo** is a full CRM platform, not a setup fee ([HighLevel pricing](https://www.gohighlevel.com/pricing/)). |
| **Full / intro** | **€549 / €470.** Holds. Thin product, real ops. |
| **Must ship for this price** | Login that opens billing + notifications + CRM view + tasks; onboarding tasks a human can complete; PDF that matches those modules. |
| **Copy tweak** | Kill `marketing-plans.ts` addon line “Env, login, manual billing, contact form — ready for first clients in 1–2 days.” Replace with: “Portal login with billing, notifications, CRM view, and tasks. Automations are not connected. Not a public website.” |

### 2. setup-full — CRM seed + training outline

| | |
|--|--|
| **Current** | M6 **€1,690**. Catalog **€1,290**. |
| **Ships** | **B.** Labeled DEMO/industry CRM samples; automation module **enabled, connectors NOT CONNECTED**; migration CSV **template**; training outline; 30-day support window. Not hands-on migration. |
| **Catalog promise** | Matches the handler. Problem-spec outcome still says “automation modules active,” which readers hear as “Zaps are live.” |
| **Competitors** | A **live** custom API / multi-step automation is about **$1,000–$3,000** ([GolmTech](https://golmtech.solutions/blog/how-much-does-a-zapier-consultant-cost/)). Simple live Zaps **$300–$1,000**. Hands-on CRM implementation in DACH is commonly above this SKU; this handler does not do that work. |
| **Full / intro** | **€1,490 / €1,290.** M6 €1,690 is the connected-automation price. |
| **Must ship for €1,490** | DEMO rows visibly labeled DEMO; CSV that is a real template (columns, sample rows); training outline that states connectors are off; 30-day window that opens the support queue. |
| **Copy tweak** | Promise: “CRM demo pipeline, migration spreadsheet template, and a training outline. We do not move your old data and we do not turn external automations on.” |

### 3. setup-custom — production runbook

| | |
|--|--|
| **Current** | M6 **€4,900**. Catalog **€3,490**. |
| **Ships** | **B, oversell = E.** `production-deploy-manifest.json` with checklist items **PENDING**. Client ops executes go-live. No SSH, no “SSL done.” |
| **Catalog promise** | Honest in `client-offers.ts`. **Dishonest** in `marketing-plans.ts`: “deploy on your domain.” |
| **Competitors** | Agencies that **build and host** a KMU site: [MOKKA](https://mokka-agentur.de/angebot) ab **€1,500–€2,800**; [Preisindex](https://guenstige-webseiten.de/webdesign-preisindex-2026.html) **€1,500–€6,000** standard agency. Those prices buy a site, not a PDF checklist. |
| **Full / intro** | **€1,990 / €1,690** with a scheduled **90-minute** handoff on the runbook. **Without the call, full list €1,290** (document + CRM seed). Do not keep €3,490–€4,900. |
| **Must ship for €1,990** | Downloadable runbook a tech can follow; PENDING never flipped to done in copy; CRM seed; the 90-minute call on the calendar; invoice linked. |
| **Copy tweak** | Name on the storefront: “Production runbook (you deploy).” Delete “Custom deploy” and “deploy on your domain.” |

### 4. audit — technical audit document

| | |
|--|--|
| **Current** | M6 **€790**. Catalog **€590**. |
| **Ships** | **C + service companion.** PDF (6+ sections) + markdown + workspace project + kickoff ticket + invoice. Not a pentest, not on-site, not a legal sign-off. |
| **Catalog promise** | “DOCUMENT / consulting deliverable … not a live connected product.” Good. |
| **Competitors** | [Webshore](https://webshore.eu/wordpress-audit/) single area **€300**, full five-area **€1,200**, 48h, manual. [SafetyBis](https://www.safetybis.com/pricing/) web pentest from **€2,500**, external network from **€1,800**. [Flawfence](https://flawfence.com/blog/en/security-audit-cost-2026/) SME full audit **€3,500–€18,000**. [Hard2bit](https://hard2bit.com/en/blog/cybersecurity-audit-cost-for-businesses/) SME web focus from **€2,950**. |
| **Full / intro** | **€790 / €690.** Serious versus a €300 single-topic scan, far under a pentest. Do not move to €2,000 until a human reviews the AI draft and the report says so. |
| **Must ship for €790** | Industry-specific findings (not a generic 6-heading shell); 90-day roadmap; explicit “not a penetration test”; kickoff ticket + invoice (companion). |
| **Copy tweak** | Title: “AI-assisted technical audit (report).” First line: “Not a penetration test and not a compliance certificate.” |

### 5. integration — documented config, tools off

| | |
|--|--|
| **Current** | M6 **€1,990**. Catalog **€1,190**. |
| **Ships** | **C + `integration-config.json`** with status **DOCUMENTED_NOT_LIVE**. Developer wires keys. |
| **Catalog promise** | Honest in client offers. M6 price is a **live integration** price. |
| **Competitors** | [GolmTech](https://golmtech.solutions/blog/how-much-does-a-zapier-consultant-cost/): live simple automation **$300–$1,000**, custom API **$1,000–$3,000**, retainers **$500–$5,000/mo**. [Zapier](https://zapier.com/pricing) plans from **$19.99/mo**. [Make](https://www.make.com/en/compare/make-vs-zapier) Core from **$9/mo**. [API integration cost 2026](https://projectcostestimator.com/blog/api-integration-cost-2026): iPaaS setup **$300–$3,000**. |
| **Full / intro** | **€890 / €750** for the document + JSON. **€1,790** only after one named connector is connected in the client’s tool and a test event is in the handoff. |
| **Must ship for €890** | JSON a developer can drop env values into; sample payloads; checklist “add your API key here”; sentence “nothing is connected yet.” |
| **Copy tweak** | “Integration map for your developer. We do not connect Stripe, CRM, or ERP in this package.” |

### 6. workflow-design — SOP PDF

| | |
|--|--|
| **Current** | M6 **€990**. Catalog **€690**. |
| **Ships** | **C.** Process map, SOP sections, roles, KPIs, rollout. Automations are not built. |
| **Catalog promise** | Document, not a live product. Good. |
| **Competitors** | [Infinite Consulting](http://inf.in/) pilot **$750–$1,250**: one walkthrough, one map, **three** SOPs (human). [SOPX 2026](https://sopx.io/insights/sop-consultant-cost/) cites Olivier basic **€800–€1,500** and comprehensive **€2,000–€5,000+**; US libraries **$5,000–$25,000**. [Covision](https://covisionconsultants.com/services/sop-writing-documentation/) **$3,000–$8,000** for 5–10 SOPs with operator interviews. |
| **Full / intro** | **€790 / €690.** Matches a short human pilot only if the PDF has several real SOPs for that industry. It does **not** match a $5k interviewed library. |
| **Must ship for €790** | At least 3 named SOPs with owner, steps, and exception path; industry nouns (not “process A”). To justify **€1,200+**: one recorded client walkthrough baked into the SOPs. |
| **Copy tweak** | “SOP pack from your industry profile. We have not interviewed your staff. We do not build the automations.” |

### 7. support-priority — 24h target queue

| | |
|--|--|
| **Current** | M6 **€399/mo**. Catalog **€249/mo**. Resource profile: **3 support hours**. |
| **Ships** | **B+D.** Queue, 24h **target** (not an automated SLA clock), kickoff ticket, FAQ seed, health-check PDF, portal modules. **A person must reply.** |
| **Catalog promise** | “Human replies by our team — not a PDF-only retainer.” The PDF still ships; the replies are the product. |
| **Competitors** | [RABZI](https://rabzi.nl/en/blog/website-maintenance-cost): small-business site **€100–€300/mo**, response 1–2 business days; Care from **€95** (2 business days); Care Pro from **€249** (8 business hours, ~2h changes); Enterprise from **€495**. [PixelMakers](https://pixelmakers.com/services/maintenance) **€340/mo** for **5 hours**. [Parrot](https://www.parrotcreative.co.uk/website-maintenance-retainer-uk/) UK brochure **£80–£250/mo**. |
| **Full / intro** | **€299 / €249.** €399 is Care-Pro-plus money and needs a measured response time plus about **2 hours of actual ticket work**, not a monthly PDF. |
| **Must ship for €299** | Kickoff ticket answered by a human; inbox the client can use; written cap (“up to 2 hours of replies / small fixes per month, business days, 24h target”); health PDF is an appendix. |
| **Copy tweak** | “We answer tickets. Target: within 24 business hours. This is not weekend cover and not a build retainer.” See auto-resolve section before promising a bot. |

### 8. support-dedicated — 8h target

| | |
|--|--|
| **Current** | M6 **€1,190/mo**. Catalog **€690/mo**. Resource profile: **8 support hours**. |
| **Ships** | **B+D.** 8h target, video-meetings **module**, monthly health-check task, Slack **notify if webhook exists** (not a private client Slack). No automated SLA clock (`client-offers` already says this). |
| **Competitors** | RABZI Enterprise **€495** (5h, 4h response) up to application SLA **€950+**. PixelMakers scale **€1,700** for 30h. Parrot ecommerce **£600–£1,200**. Extra agency hours about **€95–€130** (RABZI) or **€65** (PixelMakers). 8h × ~€80 ≈ **€640** labor floor in Western Europe; Serbia delivery can sit under that, which is why **€690–€790** can be sustainable **if the hours happen**. |
| **Full / intro** | **€790 / €690.** Do not list €1,190 until a named person and an hour log exist. |
| **Must ship for €790** | Same queue as priority, faster target, video module the client can open, **up to 8h** of human work, hour log the client can see. Slack line stays “webhook notify.” |
| **Copy tweak** | “8-hour response target on business days, up to 8 hours of work. Not a private Slack channel. Not 24/7.” |

### 9. landing — hosted one-pager

| | |
|--|--|
| **Current** | M6 **€1,290**. Catalog **€990**. |
| **Ships** | **A.** Live `/sites/{slug}`, client brand, niche copy, contact section, handoff PDF. No custom domain. No unlimited revisions. AI/vertical first draft. |
| **Catalog promise** | “Live client-branded landing.” Client offer correctly says hosted under omnigrouptech.com. |
| **Competitors** | [MOKKA](https://mokka-agentur.de/angebot) ab **€499** (design, form, GDPR basis, hosting year 1). [contentivo / citos](https://www.werbeagentur-citos.de/angebot-landingpage) ab **€1,250** excl. VAT. [WebDrift](https://webdrift.io/blog/website-kosten-2026-angebote-vergleichen) (3 Oct 2026) **€1,290** once or **€130/mo × 24 months**. [CodeCosmos](https://codecosmos.de/landingpage-erstellen-lassen.html) ab **€470**, richer pages **€800–€2,000**. |
| **Full / intro** | **€1,190 / €990.** Sits with contentivo/WebDrift on price, **below** them on craft (subdomain, no legal pages guaranteed, no designer revision). €1,290 is fair only with one revision round **or** Impressum/privacy stubs plus a working contact store. |
| **Must ship for €1,190** | HTTP 200 on the client URL; mobile layout; contact that stores a lead somewhere the client can read; no Omni admin chrome; handoff states “your domain is not included.” |
| **Copy tweak** | “Live page on our host (`/sites/…`). Your own domain is a later step, not this package. Copy is an AI/industry first draft, one pass, not a brand workshop.” |

### 10. website-business — 5+ page site

| | |
|--|--|
| **Current** | M6 **€2,990**. Catalog **€1,990**. |
| **Ships** | **A.** 5+ pages (services, pricing, contact), client brand, live URL, handoff PDF. No custom domain, no CMS training, no photography. |
| **Competitors** | MOKKA KMU ab **€1,500** (up to 7 pages, **CMS the client can edit**). WebDrift Core **€3,990** once or **€290/mo × 24**. Preisindex agency standard **€1,500–€6,000**. DIY: [Dupple 2026](https://dupple.com/learn/best-website-builders) Framer from **$10/mo**, Squarespace **$16**, Wix **$17**, Webflow **$15**. [UIGuides](https://www.uiguides.com/compare/website-builder-comparison-chart) Squarespace Commerce Basic **$27/mo**, Wix Business **$36**. [Flowversity](https://www.flowversity.tech/blog/how-much-does-a-webflow-website-cost-2026) freelancer Webflow average about **$5,259**; agency starter examples **$9,000+** ([AgencyPitch](https://www.agencypitch.io/blog/how-to-price-webflow-framer-builds-2026)). |
| **Full / intro** | **€2,290 / €1,990.** Above MOKKA’s €1,500 floor only if pages are real. **Below** WebDrift €3,990 because the client does not get a CMS. Do not list €2,990 until the client can edit text without a ticket. |
| **Must ship for €2,290** | ≥5 pages with niche copy (not lorem, not Omni chrome); sitemap/robots if the phase unlock says so; contact path; handoff: “hosted by us, not your domain, not a CMS login.” |
| **Copy tweak** | “Five or more pages, live on our host. You cannot log into Wix/Webflow to edit them. Custom domain is not included.” |

### 11. website-ecommerce — storefront, cards external

| | |
|--|--|
| **Current** | M6 **€4,900**. Catalog **€3,490**. |
| **Ships** | **A, merchant cards = config required.** Live shop, 4+ catalog SKUs, cart, stock decrement, tax/shipping settings, **bank transfer** orders. Stripe TEST only when platform keys exist. **Stripe LIVE/Connect is not included.** |
| **Catalog promise** | Honest in delivery spec and client offers. M6 price still matches agencies that turn on **card** checkout. |
| **Competitors** | [Lunidev](https://lunidev.com/en/blog/shopify-website-development-costs-2026) basic store **€2,000–€6,000** (5–50 products **€3,000–€6,000**). [ClickForest](https://www.clickforest.com/en/blog/webshop-development-cost) SME Shopify from **€3,995** including 3 months support; Shopify plans **€24–€384/mo** (page read 14 Aug 2026). [Shopify Workshop](https://theshopifyworkshop.com/custom-shopify-store-cost-2026/) Germany agency **€3,000–€8,000**. [Project cost estimator](https://projectcostestimator.com/cost/shopify/western-europe) Western Europe freelancer **€900–€3,900**, agency **€2,350–€9,400**. [Axire](https://www.axireinfotech.com/blog/shopify-development-agency-for-eu-retailers-scope-pricing) customized theme **€4,000–€12,000**. |
| **Full / intro** | **€2,790 / €2,290** for the bank-transfer shop that exists. **€4,490** when the client’s Stripe Connect/LIVE (or equivalent) takes a real card payment and the handoff shows it. Do not sit at €3,490–€4,900 on seed SKUs + virman. |
| **Must ship for €2,790** | Public shop URL; ≥4 products; test order on bank transfer visible to the owner; stock moves; tax/shipping on the order; PDF says cards are configuration required. No invented “Stripe live” line. |
| **Copy tweak** | Lead with “Shop that takes bank-transfer orders today.” Stripe sentence in the same paragraph, not a footnote. |

### 12. white-label-setup — partner PDF + one landing

| | |
|--|--|
| **Current** | M6 **€2,490**. Catalog **€1,790**. |
| **Ships** | **A+C.** Brand PDF + **one** live partner landing. Not legal agreements. Not custom domain. Not a multi-tenant reseller console. |
| **Competitors** | [HighLevel](https://www.gohighlevel.com/pricing/) Starter **$97/mo** (3 sub-accounts), Unlimited **$297/mo**, Agency Pro SaaS mode **$497/mo** ([upgrade article](https://help.gohighlevel.com/support/solutions/articles/48001180534-how-to-upgrade-to-highlevel-s-agency-pro-plan-497-saas-plan-)). [Duda white label](https://www.duda.co/website-builder/white-label) from **$149/mo**. [Simvoly roundup](https://simvoly.com/the-best-white-label-website-builder) Simvoly from **$59/mo**, Duda **$149/mo**, GHL cited **$297/mo**. Those are **platforms the partner keeps using**. |
| **Full / intro** | **€1,490 / €1,290** one-time. A €2,490 tag needs a **reusable snapshot** the partner can duplicate and a login that does not show Omni chrome. |
| **Must ship for €1,490** | Live partner URL (required for completed) + brand PDF with resale one-pager. Say what it is not. |
| **Copy tweak** | “Partner landing and brand PDF. Not GoHighLevel, not a white-label SaaS you can resell as software.” |

### 13. sales-enablement — scripts PDF

| | |
|--|--|
| **Current** | M6 **€1,190**. Catalog **€890**. |
| **Ships** | **C + companion** (project, kickoff, invoice). Demo script, hooks, FAQ, closing checklist. No calls, no CRM. |
| **Competitors** | Same band as a short human playbook: Infinite pilot **$750–$1,250**. Interviewed sales playbooks in the SOPX ranges sit higher (**$2,500+**). |
| **Full / intro** | **€790 / €690.** Better bought inside the sales-launch bundle. |
| **Must ship for €790** | Script uses the industry’s actual offer (objections, CTA), not a generic “book a demo” shell; companion ticket exists so it is a service, not a naked PDF. |
| **Copy tweak** | Already labeled DOCUMENT. Add: “Your team still makes the calls. We do not set up CRM.” |

### 14. vertical-package — monthly industry ops

| | |
|--|--|
| **Current** | M6 **€790/mo**. Catalog **€299/mo**. |
| **Ships** | **B.** CRM seed, modules crm/automation/billing, FAQ/SLA, kickoff, vertical PDF. Ads **NOT CONNECTED**. Video avatar is the AI-support SKU. |
| **Catalog promise** | “CRM + automations + AI support” in the short catalog line is **wider** than the delivery spec (avatar excluded). |
| **Competitors** | [Jobber](https://www.getjobber.com/pricing/) plans from about **$29–$49/mo** (Core one user; Connect/Grow around **$199/$299** at five users — [Augmented Trades](https://augmentedtrades.com/contractor-software-pricing/), 29 Sep 2026). Housecall Pro Basic **$79**, team Essentials **$299** (5 users). [Cliniko](https://www.comparethecloud.net/articles/cliniko-nookal-or-semble-for-a-growing-uk-physiotherapy-clinic) **$45** (1 practitioner) to **$395**. HoneyBook from **$29/mo** ([Tabsy comparison](https://tabsy.co/compare/best-client-management-software), Oct 2026). Those products schedule jobs, take payments, and have mobile apps. |
| **Full / intro** | **€349 / €299.** €790/mo is a staffed retainer (see support-dedicated), not a seeded vertical CRM. |
| **Must ship for €349** | Industry pipeline stages the client can use next week; modules actually on; ads line = not connected; monthly price includes the portal, not a promise of leads. |
| **Copy tweak** | Replace “AI support” in the one-line description with “CRM, automation module, billing. Ads and video avatar are separate and off until configured.” |

### 15. lead-gen-retainer — pipeline workspace, not leads

| | |
|--|--|
| **Current** | M6 **€990/mo**. Catalog **€499/mo**. |
| **Ships** | **B+D, honest.** CRM stages, sequences, weekly plan, channel board, kickoff, analysis pack. **`leads_generated=0`** unless `LEAD_LIVE_HARVEST_ON_KICKOFF` + enrichment. Ads NOT CONNECTED without keys. Simulated harvest cannot pass. |
| **Catalog promise** | Long and honest in the spec. The **name** “Lead gen retainer” still sells leads. |
| **Competitors (people who send outreach or book meetings)** | [Ripe Leads](https://ripeleads.eu/resources/b2b-lead-generation-agency-pricing-2026) European retainers **€2,000–€10,000/mo**; their published price **€3,750** first month then **€2,850**. [Lead Matrix](https://leadmatrix.io/en/resources/b2b-prospecting-cost/) cold email **€750–€1,500/mo**, multichannel **€2,000–€5,000**, pay-per-meeting **€200–€350**. [Profitbl](https://www.profitbl.com/blog/sales-outsourcing-pricing-europe) retainer **€3,000–€8,000**. [CegTec](https://www.cegtec.net/en/knowledge/outbound-sales-as-a-service-vergleich/) platform from **€499/mo**, done-for-you from **€2,500/mo**; DACH SDR **€4,500–€9,500/mo**. |
| **Full / intro** | **€449 / €379** for the ops pack that ships. **Do not charge €990** while the counter is zero. A separate live-harvest offer at **€1,490/mo** (intro **€1,290**) is the first price that may sit under cold-email agencies — **only after** a prod job shows `leads_generated>0` with sources, and copy still says **no meeting guarantee**. |
| **Must ship for €449** | Pipeline the client can open; channel board red/green; kickoff states zero leads and why; no sample “47 leads” in the PDF. |
| **Copy tweak** | Public name: **“Lead pipeline workspace.”** Promise: “CRM stages, email sequences, and a weekly plan. We do not deliver contacts unless live harvest is switched on for your account. We do not guarantee meetings.” |

### 16. ai-support-retainer — RAG + queue

| | |
|--|--|
| **Current** | M6 **€690/mo**. Catalog **€349/mo**. |
| **Ships** | **B+D.** RAG seed, FAQ, ticket queue, modules. HeyGen/D-ID avatar **CONFIGURATION REQUIRED**. Resolution rate is **not** an evidenced product metric in the audits. |
| **Competitors that close conversations** | [Intercom Fin](https://www.intercom.com/pricing) **$0.99 per outcome** (customer confirms, or does not ask again, or a procedure completes including some handoffs) plus seats from **$29**. [Tidio](https://www.tidio.com/pricing/) Lyro marketed at ~**75%** resolution; [Gleap’s 2026 read](https://www.gleap.ai/blog/tidio-pricing) Lyro about **$32.50–$39/mo** for 50 conversations, then ~**$0.70–$0.78** each. [Zendesk vs Fin](https://www.getmacha.com/blog/intercom-fin-vs-zendesk-ai-pricing): Zendesk verified resolution about **$1.50** committed / **$2** pay-as-you-go, on seats from about **$55–$115**. |
| **Full / intro** | **€329 / €279** until the bot closes tickets. **€490 / €390** after a trailing 30-day auto-resolve rate **≥30%** on FAQ-class tickets (definition below). €690 is Fin-plus-seat money without Fin’s outcome meter. |
| **Must ship for €329** | Client can ask a question in the inbox and see either an answer from the seeded FAQ/RAG or a clear escalation. Avatar line stays “off until keys.” |
| **Copy tweak** | “AI inbox seeded from your industry FAQ, plus a human queue. We do not quote a resolution rate until we have measured one. Video avatar is optional and off by default.” |

### 17. custom-software — starter archive

| | |
|--|--|
| **Current** | M6 **€7,900**. Catalog **€4,900**. |
| **Ships** | **A after the 2026-10-08 fix** (was **E**). Downloadable `software-scaffold.tar.gz`, README, `.env.example`, smoke tests, handoff PDF. **Not** a finished product. Prod smoke in the audit: HTTP 200, **4,383 bytes**. That size must stay honest in sales: it is a starter, and a tiny archive cannot be described as an application. |
| **Catalog promise** | Name is already “Software starter kit.” `client-offers` `youGet` still says “Isolated starter project” and “Test gate metadata” and **does not say “download the tar.gz.”** |
| **Competitors** | [Simon Ingemann Jensen](https://simonij.com/en/blog/mvp-development-cost): narrow European freelancer MVP **€10,000–€16,000** (100–160h); SaaS MVP **€25,000–€40,000**. [YipLabs](https://www.hunteryip.com/blog/mvp-cost-2026): solo simple MVP **€4,000–€8,000**; author’s 7-day MVP **€6,500**. [Zealousys](https://zealousys.com/blog/mvp-development-cost-for-saas-startups-in-europe/): Eastern Europe **€20,000–€60,000**, Western **€70,000–€150,000**. [Syntanea](https://www.syntanea.com/blog/mvp-development-cost-europe): small MVP **€25,000–€60,000**. |
| **Full / intro** | **€1,490 / €1,190.** This is serious versus a free boilerplate and honest versus a €6,500 MVP. **€4,900–€7,900 is not justified** by the current artifact. To list **€6,500**: deployed staging URL, auth, one vertical workflow, and a short bugfix window — a different SKU. |
| **Must ship for €1,490** | Archive the client can download from the portal (not a VPS path); README run steps that work; tests that were executed; handoff that says “starter, not your product.” |
| **Copy tweak** | youGet: “Download `software-scaffold.tar.gz` (Node API + SPA shell).” Promise stays “not a finished custom product.” Never “MVP” on this id. |

### 18. bundle-portal-presence — portal + landing

| | |
|--|--|
| **Current** | M6 **€1,090**. Catalog **€899**. |
| **Ships** | **A+B.** Quick-setup entitlements **plus** live landing. |
| **Competitors** | Sum of the two markets: a DE landing **€499–€1,290** plus a portal kickoff. Current €899 is **under** a single contentivo landing (**€1,250**) while shipping two things — aggressive, and only sustainable because fulfillment is automated. |
| **Full / intro** | **€1,390 / €1,190** (~20% off recommended €549+€1,190). Catalog €899 can remain a **temporary** first-50 price only if support hours stay inside the quick-setup cap. It should not be the standing list or it trains the market to expect agency work at builder prices. |
| **Must ship** | Both proofs: portal modules JSON **and** landing HTTP 200. |
| **Copy tweak** | “One checkout: portal login and a live niche page on our host. Not a custom domain. Not connected automations.” |

### 19. bundle-sales-launch — landing + sales PDF

| | |
|--|--|
| **Current** | M6 **€1,590**. Catalog **€1,290**. |
| **Ships** | **A+C.** Live landing + sales enablement PDF. No CRM, no calls. |
| **Competitors** | Landing €470–€1,290 plus a playbook PDF. M6 €1,590 matches the recommended bundle. |
| **Full / intro** | **€1,590 / €1,290.** Intro equals today’s catalog anchor. |
| **Must ship** | Live URL **and** the PDF. PDF-only is a failed bundle. |
| **Copy tweak** | “The page is live. The script is a document. We do not run the outreach.” |

### 20. bundle-ops-clarity — audit + SOP

| | |
|--|--|
| **Current** | M6 **€1,190**. Catalog **€990**. |
| **Ships** | **C + companion** (after the invoice/companion gate). Two PDFs. Live prod sample in the audit was dual PDFs. Not an ops product. |
| **Competitors** | Webshore full audit **€1,200** **or** a $750 SOP pilot — this bundle is both, thinner than either human engagement. |
| **Full / intro** | **€1,290 / €1,090.** Standing list €990 is slightly cheap once both docs plus kickoff and invoice are mandatory; keep €990 only as the intro if the first 50 need a round number (that is −23% vs €1,290, a bit past the 20% rule — prefer **€1,090**). |
| **Must ship** | Both PDFs, cross-linked 90-day items, service companion, invoice. If any of those are missing, it is PDF theater. |
| **Copy tweak** | Already DOCUMENT. Add the outcome line: “A reading pack for what to fix first. We do not change your systems in this bundle.” |

---

## Support retainers — resolution, not reports

### What competitors actually do

| Vendor | What “resolved” means | Price signal | Source |
|--------|------------------------|--------------|--------|
| **Intercom Fin** | Outcome: customer confirms, or does not ask for more help, or a procedure completes (they also count some handoffs). Once per conversation. | **$0.99/outcome**; seats from **$29** | [intercom.com/pricing](https://www.intercom.com/pricing) |
| **Tidio Lyro** | Answers from support content, follow-ups, not only scripted flows. They publish an average **~75%** resolution. | Lyro entry about **$33–$39 / 50 conversations**, then ~**$0.70–$0.78** | [tidio.com/pricing](https://www.tidio.com/pricing/), [Gleap 2026](https://www.gleap.ai/blog/tidio-pricing) |
| **Zendesk AI** | **Verified** resolution. Escalation to a human is not the billed resolution (May 2026 description in the comparison). | About **$1.50** committed / **$2** pay-as-you-go, on top of seats ~**$55–$115** | [getmacha comparison](https://www.getmacha.com/blog/intercom-fin-vs-zendesk-ai-pricing) |
| **RABZI / PixelMakers** | A person changes the site inside an hour cap and a response clock. | **€95–€495** typical SMB; **€340** for 5h | RABZI, PixelMakers |

### What Omni ships today

- **support-priority / support-dedicated:** queue, target time, FAQ seed, kickoff ticket, **health-check PDF**. Class **D**: value after kickoff is a human reply. The PDF is the companion.
- **ai-support-retainer:** RAG + FAQ + queue. Avatar only with keys. No published resolve rate.
- Client copy already admits there is **no automated SLA clock**.

A monthly PDF that describes health is the failure mode the product audit warned about. Competitors in this price band either **close the conversation** or **spend hours**.

### AI auto-resolve engine — recommendation (product, not a claim)

Do not advertise a resolution rate until this exists and a month of tickets has been counted.

1. **Stricter than Fin.** Count a ticket as auto-resolved only when the client got a usable answer **or** a completed safe procedure (status, link, FAQ steps) **and** a human did not edit the reply. **Handoff is not a resolution.** Intercom bills some handoffs; Omni should not copy that definition.
2. **Flow:** classify → retrieve FAQ/RAG → if confidence is high enough, post the answer and mark `pending_confirm` → close if the client confirms or does not object within a stated window (for example 48h) → else escalate into the **same** human queue with the transcript, inside the 24h or 8h target.
3. **Meter:** `auto_resolved / faq_class_tickets` over 30 days. Gate the **€490** AI list price at **≥30%**. Below that, the SKU stays the **€329** ops pack.
4. **Priority €299** = that engine for FAQ-class tickets **plus up to 2 human hours** on escalations. **Dedicated €790** = same engine **plus up to 8 human hours** and the video module. Unused hours are not “a report instead.”
5. **Unsafe to auto-close:** payments disputes, legal, medical advice, deletions, anything the checklist already treats as configuration-required. Those go to a human every time.
6. **Client-visible log:** each ticket shows `auto` or `human` and the hour balance. That is the retainer product. The health PDF attaches to it.

Until (2) and (3) are in production, storefront copy stays: “a person replies; the assistant may draft from the FAQ; we do not promise that the bot closes tickets.”

---

## Copy debt that fights the honest catalog

`apps/omnigroup-web/src/lib/marketing-plans.ts` `IMPLEMENTATION_ADDONS` is stale and should not be public:

| id | Stale line | Honest replacement |
|----|------------|--------------------|
| setup-quick | “contact form — ready for first clients in 1–2 days” | Portal modules only; automations off; not a website |
| setup-full | “Data migration, CRM, automations, team training” | DEMO CRM, CSV **template**, connectors off, outline not a live course |
| setup-custom | “deploy on your domain” | Runbook, PENDING, client executes |

`client-offers.ts` is largely aligned. Gaps to close in copy (not done in this task):

- **custom-software** `youGet` must name the **downloadable tar.gz**.
- **vertical-package** one-liner must drop “AI support” and state ads are not connected.
- **lead-gen-retainer** public name must not say generation until harvest is on.
- **setup-full** problem outcome “automation modules active” → “module on, external tools not connected.”

---

## Explicit non-claims

- No live Stripe price was read for this report. Public list = phase anchor in code (M6 cells above).
- No ad account, Apollo, LinkedIn, or Google Ads performance is claimed. Lead jobs with harvest off stay at **zero leads**.
- Stripe LIVE/Connect, custom DNS, SSL on client servers, and video avatars stay **configuration required** until a job proves them.
- Industry multipliers and nonprofit/budget tiers are **not** already inside `fullEur` / `introEur`.

---

## Sources (retrieved 2026-10-08)

Landing / sites (EUR, DE):

- https://mokka-agentur.de/angebot
- https://www.werbeagentur-citos.de/angebot-landingpage
- https://webdrift.io/blog/website-kosten-2026-angebote-vergleichen
- https://guenstige-webseiten.de/webdesign-preisindex-2026.html
- https://codecosmos.de/landingpage-erstellen-lassen.html

Builders / Webflow (USD):

- https://dupple.com/learn/best-website-builders
- https://www.uiguides.com/compare/website-builder-comparison-chart
- https://marketsplash.com/best-website-builders-for-agencies/
- https://www.flowversity.tech/blog/how-much-does-a-webflow-website-cost-2026
- https://www.agencypitch.io/blog/how-to-price-webflow-framer-builds-2026

Ecommerce:

- https://lunidev.com/en/blog/shopify-website-development-costs-2026
- https://www.clickforest.com/en/blog/webshop-development-cost
- https://theshopifyworkshop.com/custom-shopify-store-cost-2026/
- https://projectcostestimator.com/cost/shopify/western-europe
- https://www.axireinfotech.com/blog/shopify-development-agency-for-eu-retailers-scope-pricing

Audit:

- https://webshore.eu/wordpress-audit/
- https://www.safetybis.com/pricing/
- https://flawfence.com/blog/en/security-audit-cost-2026/
- https://hard2bit.com/en/blog/cybersecurity-audit-cost-for-businesses/
- https://angelortegacastro.com/en/consultoria-ciberseguridad-empresas-servicios-costes/

SOP:

- http://inf.in/
- https://sopx.io/insights/sop-consultant-cost/
- https://covisionconsultants.com/services/sop-writing-documentation/
- https://eatsleeplaunchrepeat.com/services/sops

Integration:

- https://golmtech.solutions/blog/how-much-does-a-zapier-consultant-cost/
- https://zapier.com/pricing
- https://www.make.com/en/compare/make-vs-zapier
- https://projectcostestimator.com/blog/api-integration-cost-2026

Care retainers:

- https://rabzi.nl/en/blog/website-maintenance-cost
- https://rabzi.nl/en/services/website-maintenance
- https://pixelmakers.com/services/maintenance
- https://www.parrotcreative.co.uk/website-maintenance-retainer-uk/

AI support:

- https://www.intercom.com/pricing
- https://www.tidio.com/pricing/
- https://www.gleap.ai/blog/tidio-pricing
- https://www.getmacha.com/blog/intercom-fin-vs-zendesk-ai-pricing

Lead gen:

- https://ripeleads.eu/resources/b2b-lead-generation-agency-pricing-2026
- https://leadmatrix.io/en/resources/b2b-prospecting-cost/
- https://www.profitbl.com/blog/sales-outsourcing-pricing-europe
- https://www.cegtec.net/en/knowledge/outbound-sales-as-a-service-vergleich/
- https://ripeleads.eu/resources/best-appointment-setting-agencies-europe-2026

MVP:

- https://simonij.com/en/blog/mvp-development-cost
- https://www.hunteryip.com/blog/mvp-cost-2026
- https://zealousys.com/blog/mvp-development-cost-for-saas-startups-in-europe/
- https://www.syntanea.com/blog/mvp-development-cost-europe

White-label / vertical SaaS:

- https://www.gohighlevel.com/pricing/
- https://help.gohighlevel.com/support/solutions/articles/48001180534-how-to-upgrade-to-highlevel-s-agency-pro-plan-497-saas-plan-
- https://www.duda.co/website-builder/white-label
- https://simvoly.com/the-best-white-label-website-builder
- https://www.getjobber.com/pricing/
- https://augmentedtrades.com/contractor-software-pricing/
- https://tabsy.co/compare/best-client-management-software
- https://www.comparethecloud.net/articles/cliniko-nookal-or-semble-for-a-growing-uk-physiotherapy-clinic

Internal:

- `atina-platform/atina/src/modules/billing/lib/base-deliverable-catalog.ts`
- `atina-platform/atina/src/modules/billing/lib/package-delivery-spec.ts`
- `atina-platform/atina/src/modules/billing/lib/competitive-catalog-pricing.ts`
- `atina-platform/atina/src/modules/billing/lib/category-pricing.ts`
- `apps/omnigroup-web/src/lib/client-offers.ts` (`getPublicListPriceEur`)
- `docs/evidence/PRODUCTS-NOT-JUST-DOCS-AUDIT-20261008.md`
- `docs/evidence/PRODUCT-SERVICE-INVOICE-CHAIN-20261008.md`

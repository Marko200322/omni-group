# Grok 4.7 — industry price recompare (2026-10-09)

**Apply target:** M6 `anchorByPhase` in both `package-delivery-spec.ts` files (atina + web). This file does not edit them.  
**Machine table:** [`GROK47-PRICE-TABLE-20261009.json`](./GROK47-PRICE-TABLE-20261009.json)  
**Prior list:** M6 already equals the 2026-10-08 applied cuts in [`GROK47-PRICING-APPLIED-20261008.md`](./GROK47-PRICING-APPLIED-20261008.md). `oldM6` below is that live list.  
**Intro:** first **50** completed deliverable customers, then full list. Recommended **`discountPct`: 18** (`maxSlots`: 50). Intro EUR uses the checkout rule `Math.round(fullEur * 0.82)`.

`fullEur` is the **standard M6 list** for every industry SKU of that package. It is not pre-stacked with `PRICING_TIER_META` (nonprofit 0.72, budget 0.86, standard 0.96, premium 1.04, regulated 1.10). Checkout today takes `getPackageAnchorEur` and then the intro. Do not also multiply by the tier factor on the same charge.

## Industries in this system (50)

Source: `INDUSTRY_CATEGORIES` = 25 freelance (`freelance-platform-taxonomy.ts`) + 25 legacy SMB (`category-pricing.ts`). No industries outside that list.

| Tier | Slugs the catalog already sells |
|------|----------------------------------|
| Budget | admin_support, community_moderation, customer_service, photography, writing_translation, retail, hospitality, beauty, fitness, home_services, pets |
| Standard | audio_music, creator_services, design_creative, ecommerce, education_training, hr_recruiting, localization, marketing, sales, video_animation, construction, education, agriculture, automotive, media, travel, professional, entertainment |
| Premium | ai_data, business_consulting, development_it, engineering_architecture, engineering_science, finance_accounting, legal_services, product_project_management, real_estate_services, web3, legal, finance, logistics, real-estate, manufacturing, technology |
| Regulated | healthcare, government, energy, industrial |
| Nonprofit | nonprofit |

Same artifact ships in every vertical. Premium and regulated buyers do not get a pentest, a CMS, card checkout, or live ads by paying the base list. Those stay excluded.

## Competitor bands used (retrieved 2026-10-09 unless noted)

Honest public ranges for the buyers above. Not converted from USD except where a source is already in EUR.

- **Landing / KMU site:** Digitale Hilfe KMU landing **ab €1,290**, extended site **ab €1,690** ([digitale-hilfe-kmu.de/leistungen](https://digitale-hilfe-kmu.de/leistungen/)). Online KMU (Handwerk/Bau): landing **€999 incl. VAT** with CMS, domain, Impressum; standard site **€2,200 incl. VAT** ([online-kmu.de](https://online-kmu.de/webseiten-fuer-handwerker-bauunternehmen/)). MagnetSeiten 2026: landing freelancer **€500–€1,800** / small agency **€800–€2,500**; company site freelancer **€1,200–€3,500**, small agency **€1,500–€5,000** ([magnet-seiten.de](https://magnet-seiten.de/blog/website-erstellen-lassen-kosten)). Digital Dynamics: 5–10 page designed KMU site **€3,000–€8,000** net ([digidynamics.de](https://digidynamics.de/blog/was-kostet-eine-website-2026/)).
- **Shop (cards included):** DACH Shopify starter on a standard theme **€3,000–€8,000**; freelancers from about **€1,500** ([ostend.digital](https://ostend.digital/shopify-shop-erstellen-lassen-kosten-ablauf/), [falkeconsulting.com](https://falkeconsulting.com/blogs/blog/shopify-agentur-kosten), [code-expert.de](https://code-expert.de/ratgeber/online-shop-kosten/)). One DACH agency page quotes theme setups from **€20,000**; that is a premium-specialist band, not the SME floor used here.
- **Care retainers:** RABZI Care **€95**, Care Pro **€249** (~2h, 8 business hours), Care Enterprise **€495** (5h, 4 business hours); extra **€115/h** ([rabzi.nl](https://rabzi.nl/en/blog/website-maintenance-cost)). Senorit from **€249 / €349 / €499** ([senorit.de](https://senorit.de/en/blog/website-maintenance-guide-2026)).
- **Lead gen that actually sends or books:** cold email **€750–€1,500**/mo; multichannel **€2,000–€5,000**; European retainers **€2,000–€10,000**; Ripe Leads **€3,750** then **€2,850** ([leadmatrix.io](https://leadmatrix.io/en/resources/b2b-prospecting-cost/), [ripeleads.eu](https://ripeleads.eu/pricing)).
- **Still from the 2026-10-08 compare** (not re-quoted today): AI audit vs Webshore **€300 / €1,200** and pentests from **~€1,800**; SOP / sales pilots about **$750–$1,250**; live simple automation **$300–$1,000**; Jobber / Housecall-class field software about **$49–$299**/mo; Tidio Lyro about **$33–$39 / 50 conversations**; solo MVP from about **€4,000**. White-label platforms (HighLevel, Duda) are monthly SaaS, not a one-page partner PDF.

## Delivery-cost check for 18%

Modeled with default unit costs in `config` (`support` $25/h, `infra` $2/h, EUR/USD 0.92) and `computeResourceCostEur`, then a 35% margin floor. Every intro price below is **above** that floor. Tightest: **custom-software** intro **€976** vs floor **€837**. **setup-custom** intro **€1,058** vs floor **€608**. A 20% intro would still clear those two floors; **18%** is the recommendation so card fees do not sit on the scaffold’s margin.

## Price table

| deliverableId | oldM6 | newFullEur | introEur@18% | competitor band | why | honesty notes |
|---------------|------:|----------:|-------------:|-----------------|-----|----------------|
| setup-quick | 549 | **549** | 450 | Portal kickoff vs a €999–€1,290 one-pager (Online KMU, Digitale Hilfe). Not a site. | Hold. Login, billing, CRM view, tasks, and a setup PDF are a real ops product under a landing’s price. | Automations NOT CONNECTED. No public URL, no DEMO CRM seed. |
| setup-full | 1490 | **1290** | 1058 | Live multi-step automation about $1,000–$3,000. This SKU is a labeled DEMO CRM, CSV template, training outline. | Cut. €1,490 was a connected-project price. €1,290 sits at the bottom of that band for a seed, not a wiring job. | Connectors stay off. No hands-on migration. 30-day window opens the queue only. |
| setup-custom | 1290 | **1290** | 1058 | Built KMU sites from about €1,500 net (MagnetSeiten small agency) up. This SKU is a runbook. | **Unchanged.** Do not raise without a scheduled handoff. Already under a site that is actually built. | DNS/SSL/backup/monitoring stay PENDING. Client ops executes go-live. No remote deploy. |
| audit | 790 | **690** | 566 | Single-topic scan ~€300; full manual web audit ~€1,200; pentest from ~€1,800. | Cut. AI report plus kickoff and invoice, between a cheap scan and a human five-area audit. | Not a pentest and not a compliance certificate. healthcare, government, energy, industrial, legal, finance still get a document. |
| integration | 890 | **690** | 566 | A live simple Zap/API is about $300–$1,000. | Cut. JSON + guide with status DOCUMENTED_NOT_LIVE should not sit at the top of a live-zap quote. | Stripe, ERP, and CRM are not connected. €1,790-class price only after one connector is live (not this SKU). |
| workflow-design | 790 | **690** | 566 | Human SOP pilot about $750–$1,250 with a walkthrough. Interviewed libraries are several thousand. | Cut to the bottom of a short pilot. No operator interview ships. | Does not build automations. Industry nouns come from the catalog profile, not a site visit. |
| support-priority | 299 | **249** | 204 | RABZI Care Pro **€249** (about 2h, 8 business hours). Senorit basic **€249**. Small-business care often €100–€300. | Match Care Pro money. Extra vs that plan is an AI first reply on Omni’s queue, not their CMS. | Not website backups, uptime, or plugin updates. Not weekend cover. Cap stays a target (catalog ~3h), not a penalty SLA. No live ads. |
| support-dedicated | 790 | **549** | 450 | RABZI Enterprise **€495** for 5h; Senorit enterprise **€499** with up to 8h content. Extra DACH hours ~€115. | Cut hard. €790 was above a 5-hour enterprise plan. €549 is a small step over €495 for an 8h **label**, AI escalation, and the video module. | Hours must be logged or the price is still high. Not a private Slack. Not 24/7. Not site maintenance. No live ads. Internal cost model ($25/h) clears; a Western €115/h roster does not. |
| landing | 1190 | **990** | 812 | Productized one-pagers **€999 incl. VAT** (Online KMU, with CMS, domain, Impressum) and **ab €1,290** (Digitale Hilfe, with legal pages and email). Agency landings **€800–€2,500**. | Cut under the €1,290 legal one-pager. Niche copy for the 50 categories is the extra; domain and Impressum are not. | Hosted at `/sites/{slug}`. No custom domain. AI/vertical first draft. No unlimited revisions. |
| website-business | 2290 | **1490** | 1222 | Extended KMU site **ab €1,690** (Digitale Hilfe). Trades standard site **€2,200 incl. VAT** with CMS and domain (Online KMU). Designed 5–10 page sites **€3,000–€8,000**. | Cut under the €1,690 CMS offer and far under the €3,000 design band. Five live niche pages are the product; the client cannot edit them in a CMS. | No custom domain, no CMS login, no photography, no guaranteed Impressum pack. Same page factory for beauty, construction, legal, and healthcare. |
| website-ecommerce | 2790 | **1990** | 1632 | Shopify starter **with card checkout** **€3,000–€8,000**; simple freelancer shops from ~€1,500. | Further cut. €2,790 was still near a card-taking starter. €1,990 is under that floor because the shop is bank transfer and a 4-SKU seed. | Stripe LIVE / Connect excluded. No carrier rate engine. Client replaces seed prices and photos. retail, ecommerce, hospitality, beauty use this same shop. |
| white-label-setup | 1490 | **1290** | 1058 | HighLevel / Duda are **monthly platforms** (~$97–$497/mo or from $149/mo), not a one-off PDF. A single landing in this catalog is €990. | Cut to landing plus a brand PDF. A €1,490 tag still reads like a reseller console. | Not a multi-tenant SaaS. No partner legal agreements. No custom domain. |
| sales-enablement | 790 | **690** | 566 | Short human playbook about $750–$1,250. | Same cut as the SOP pack. Scripts and FAQ for sales, marketing, real-estate, professional — document plus kickoff, no calls. | Team still makes the calls. No CRM setup. |
| vertical-package | 349 | **249** | 204 | Field-service and clinic apps (Jobber, Housecall, Cliniko class) about **$49–$299**/mo and they schedule jobs or appointments. | Cut under the team-plan end of that band. Seeded CRM + automation + billing modules are not those apps. | Fits home_services, construction, beauty, fitness, healthcare as a portal seed only. Ads NOT CONNECTED. Avatar is the AI-support SKU. |
| lead-gen-retainer | 449 | **349** | 286 | Cold email that sends: **€750–€1,500**/mo. Meetings: **€2,000–€10,000**/mo. | Further cut. €449 was still close to a software-only seat while `leads_generated` stays 0. €349 is clearly an ops workspace. | No meeting guarantee. LinkedIn/Google Ads and Apollo harvest stay CONFIGURATION REQUIRED. Do not name this lead generation on the storefront until a live harvest is proven. |
| ai-support-retainer | 329 | **279** | 229 | Tidio Lyro about **$33–$39 / 50 conversations**; Intercom Fin about **$0.99/outcome** plus seats. | Small cut. €279 is a step above priority (€249) for RAG + solver on the same queue, and far above a widget because a human path is included. | No published auto-resolve rate. HeyGen/D-ID avatar CONFIGURATION REQUIRED. Do not quote a resolution percentage. |
| custom-software | 1490 | **1190** | 976 | Solo/narrow MVP from about **€4,000**; agency app projects often from ~€4,950. Market boilerplates are tens to a few hundred euros. | Further cut, stopped at €1,190 so the 18% intro stays above the modeled cost floor (€837). A 4KB-class scaffold is not an MVP. | Downloadable Node/SPA starter, README, smoke tests, handoff PDF. Not production on client infra. Not an app-store launch. development_it and technology get the same archive. |
| bundle-portal-presence | 1390 | **1290** | 1058 | Sum of new parts €549 + €990 = **€1,539**. | **€1,290** is about 16% under the parts. One checkout for portal + landing. | Both proofs required: portal modules and landing HTTP 200. No custom domain. No connected automations. |
| bundle-sales-launch | 1590 | **1390** | 1140 | Sum of new parts €990 + €690 = **€1,680**. | **€1,390** is about 17% under the parts. | Live URL and the sales PDF. The script does not run outreach. |
| bundle-ops-clarity | 1290 | **1090** | 894 | Sum of new parts €690 + €690 = **€1,380**. A human full audit alone is ~€1,200. | **€1,090** is about 21% under the two documents. Under a single full manual audit because both pieces are AI-assisted. | Two PDFs + kickoff + invoice. No on-site visit. No automation build. |

## Intro recommendation

| | |
|--|--|
| **discountPct** | **18** |
| **maxSlots** | **50**, then full `newFullEur` |
| **Why not 15** | List prices already moved down. 15% on the new list is a shallow first-sale cut. |
| **Why not 20** | 20% still clears the internal 35% floor on every row, including custom-software (€952 vs €837). 18% leaves more room once card fees hit that scaffold. |
| **Do not stack** | Nonprofit 0.72 and budget 0.86 are quote multipliers. Applying them and then −18% undersells the cost floors. |

## Explicit non-claims

- Stripe LIVE, Stripe Connect, PayPal, Wise, and Kriptoman are not priced in and not switched on here.
- Live LinkedIn/Google Ads and Apollo harvest are not included.
- setup-custom does not gain a guided handoff in this table, so its list does not go up.
- No live charge was read for this recompare. Competitor figures are published list bands, not Omni’s conversion rate.

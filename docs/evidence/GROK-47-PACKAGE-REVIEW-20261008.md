# Grok 4.7 adversarial package review — 2026-10-08

Reviewer: Grok. Scope: all 20 IDs in `scripts/fulfillment-catalog-packages.ps1`.
Method: handler + checklist + public catalog/delivery spec, prior prod matrix (`package-quality-speed-20261007`, 20/20 score 100), live HTTP spot-check of site URLs from that run.

Prior 20/20 is a **checklist pass**, not proof that every SKU is a product. Several retainers could score 100 while the “service” was a PDF plus a boolean.

## Live spot-check (prod, before this fix)

| URL | HTTP | Bytes | Title | Note |
|-----|------|------:|-------|------|
| `/sites/marketing-studio-f0cfabd68956-muxu4bva` (website-ecommerce) | 200 | 25600 | Marketing Studio | Shell is client-rendered. `/shop` as a separate path is 404 — shop is in the site app, not a second route. |
| `/sites/marketing-studio-a1f755605472-muxu38mn` (landing) | 200 | 14362 | Marketing Studio | No System Admin / Ask Omi in the HTML shell. |
| `/sites/marketing-studio-149f58eb447c-muxu3skl` (website-business) | 200 | 19083 | Marketing Studio | Same. Page count is metadata + client render, not visible in the raw shell. |

Brand title “Marketing Studio” is the industry brand, not Omni chrome. That part is real.

## Cross-cutting P0 / P1 (fixed in this change)

### P0 — AI support “RAG” was write-only and still PASSed

`bootstrapAiSupportRetainer` wrote `support-kb` through `AiMemoryService.remember`, which requires the `ai-memory` module. The retainer granted `support-avatar` / `video-meetings` / `ai-rag`, not `ai-memory`. Non-admin buyers throw, the catch set `ragSeeded=false`, and the checklist still passed because `modulesActivated.length > 0`.

The web recall route `/api/atina/ai-memory/recall` is **admin-only**, so a client could not read the corpus anyway. Nothing else in the repo queries namespace `support-kb`.

**Fix:** grant `ai-memory` before remember; recall `support-kb` and require `ragRecallHits >= 1` or the job stays partial and the checklist fails; client route `GET /api/atina/support/knowledge` plus a knowledge panel on `/dashboard/support`.

### P1 — Health-check PDF was a marketing line

`support-priority` phase unlock (M3+, factory ceiling M6) says “Monthly health-check PDF auto-generated”. No generator existed. Dedicated support created a task named “Monthly health check scheduled”. Catalog one-liner said “Slack channel”, which the delivery spec already contradicted (notify-if-webhook, not a private channel).

**Fix:** kickoff health-check PDF + markdown on both support SKUs; retainer scheduler writes a dated PDF about every 30 days; catalog and offers no longer say “Slack channel”.

### P1 — Kickoff ticket could vanish and the package still completed

`openKickoffSupportTicket` swallows task failures and returns undefined. Checklist only required `slaHours` plus a markdown SLA file.

**Fix:** `kickoff_ticket` is required for `support-priority`, `support-dedicated`, `ai-support-retainer`, and `vertical-package`. Missing id => partial => quality gate fail.

Not done, on purpose: no Stripe LIVE keys, no ads credentials, no fake lead harvest.

## Per SKU

| SKU | What is real | Docs-only / honest limit | FAIL risk | Fix |
|-----|----------------|---------------------------|-----------|-----|
| setup-quick | Portal entitlements (notifications, billing, CRM view, tasks), welcome notification, onboarding tasks, setup PDF, workspace project | External automations NOT CONNECTED. No CRM demo seed | Task create can swallow on plan limits; thickness gate requires 3 tasks or status stays partial | None this round — product path exists |
| setup-full | CRM labeled demo seed, migration CSV, training outline, 30-day support task, automation module flagged NOT CONNECTED | No live connectors, no hands-on migration | Demo seed import fail => partial | None |
| setup-custom | Same CRM seed plus client-executable deploy runbook. SSL/domain forced PENDING | Not a remote go-live | Runbook that claims SSL done fails the gate (good) | None |
| audit | Consulting PDF + markdown. Catalog says DOCUMENT | Not a product. Correct | Thin PDF fails substance floors | Leave as document |
| integration | Guide PDF + `integration-config.json` + onboarding checklist. Tools documented, not connected | Not a live integration | Config artifact missing fails checklist | Leave as document + config |
| workflow-design | SOP / process PDF | Not a live workflow engine | Thin body fails substance | Leave as document |
| support-priority | Ticket queue, FAQ seed, SLA pack, project, **now** health-check PDF and required kickoff ticket | 24h target is a human promise, not a breach clock. No weekend emergency | Was PASS with zero tickets and no health-check PDF | **Fixed P1** |
| support-dedicated | 8h queue, video-meetings module, FAQ, health-check PDF, kickoff ticket. Slack is `notifySupportDedicated` when webhook exists | Not a private Slack channel | Same ticket/PDF hole; catalog lied | **Fixed P1** |
| landing | Published `/sites/{slug}`, HTTP probe, client brand, handoff PDF | Custom domain not included | Omni chrome / thin HTML throws | None. Live 200 checked |
| website-business | Multi-page site, project link, page_count >= 5, handoff PDF | Custom domain / CMS training excluded | pageCount or probe fail | None. Live 200 checked |
| website-ecommerce | Catalog 4+, shop page, cart, tax/shipping, bank-transfer `placeShopOrder`, inventory decrement, CRM contact + notification. Stripe LIVE is CONFIGURATION REQUIRED | Card checkout only if platform Stripe key exists; client Connect is not included | Honesty flag if someone sets `claimsFullMerchantStore` | None. Do not invent LIVE keys. Live shell 200 |
| white-label-setup | Brand PDF **and** partner landing via the landing handler | PDF alone is partial | Landing throw => partial (good) | None. Live 200 on prior cell |
| sales-enablement | Scripts / FAQ / close checklist PDF | Document. Correct | Thin PDF | Leave as document |
| vertical-package | CRM seed, modules crm/automation/support-avatar/billing, FAQ, SLA, kickoff ticket, project | Ads NOT CONNECTED. Automation module is entitled, not a live connector | Ticket miss now fails | **Fixed P1 gate** |
| lead-gen-retainer | CRM samples, Titanis workspace, ICP analysis artifact, pipeline workspace markdown, channel board CONNECTED or NOT CONNECTED, ops tasks. `leadsGenerated` stays 0 unless live harvest + enrichment | Sequences are templates in the workspace markdown, not a loaded sender. Ads/Apollo NOT CONNECTED without keys | Simulated harvest cannot pass (good) | No fake ads. Templates are the honest product |
| ai-support-retainer | FAQ, KB markdown, ticket, modules, **now** remember+recall of `support-kb`, client KB panel. Avatar stays CONFIGURATION REQUIRED without HeyGen/D-ID | Video avatar is not included until keys exist | Write-only memory used to PASS | **Fixed P0** |
| custom-software | Product-factory scaffold, `software-scaffold.tar.gz` (package.json, README, .env.example, min 800 bytes), handoff PDF, `testsPassed` required | Not an unlimited custom build | Missing archive or testsPassed false => partial | None |
| bundle-portal-presence | Child steps setup-quick + landing, both must complete | Inherits setup-quick automation honesty | One child partial fails `bundle_steps_complete` | None |
| bundle-sales-launch | Landing + sales-enablement PDF | Sales half is a document, landing is the product | Same | None |
| bundle-ops-clarity | Audit PDF + workflow PDF. Catalog says DOCUMENT | Not a live ops system | Missing either PDF fails `dual_pdf_artifacts` | Leave as document bundle |

## What a score of 100 still does not mean

- Stripe LIVE / Connect for the shop.
- LinkedIn, Google Ads, or Apollo sending.
- HeyGen/D-ID video avatar.
- A private Slack channel.
- Agency-grade design beyond “client brand, no Omni chrome, HTTP 200”.
- That audit / workflow / sales-enablement / ops-clarity are anything but documents. They are labeled that way. Do not pretend otherwise.

## Verification still required after deploy

Unit tests for checklist, retainer honesty, and scheduler: PASS (42).
Prod proof is a fresh `e2e-package-quality-speed-prod.ps1` **after** SafeDeploy, with numeric `checklistScore`. That file is `GROK-47-PACKAGE-PASS-20261008.md`.

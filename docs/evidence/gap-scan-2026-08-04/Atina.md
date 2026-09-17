# Production readiness audit — `C:\dev\omni group\atina-platform\atina`

**Current posture:** hard `factoryPhase: M4`, `factoryPhaseAuto: false`, budget €550, fulfillment 850/850 PASS (`docs/ADMIN-JEDNA-LISTA.md`). AUTO phase gates are off; M5/M6 require manual bump or re-enabling AUTO.

**Sources:** `docs/KLJUCEVI-JEDAN-IZVOR.md`, `docs/ADMIN-JEDNA-LISTA.md` (REDOM), `atina-platform/atina/src/config/index.ts`, `atina-platform/atina/src/modules/billing/lib/factory-phase-modules.ts`, `factory-phase-runtime.ts`, `factory-phase-effective.ts`, `deploy-secrets.local/deploy.config.json`, `atina-platform/atina/KLJUCEVI-POPUNI.local.txt`.

---

## KLJUCEVI-POPUNI.local.txt — SET vs EMPTY

| | Count |
|---|------|
| **SET** | **43** |
| **EMPTY** | **53** |

**SET (names only):**  
`AI_KEY`, `AI_URL`, `ALLOW_MANUAL_PAYMENTS_IN_PRODUCTION`, `BRIGHTDATA_API_KEY`, `BUSINESS_AND_DEV_KEY`, `BUSINESS_AND_DEV_URL`, `COMMS_KEY`, `COMMS_URL`, `CONTACT_CRM_INGRESS_EMAIL`, `CONTACT_CRM_INGRESS_PASSWORD`, `CONTACT_EMAIL_FROM`, `CONTACT_EMAIL_TO`, `CURSOR_API_KEY`, `CURSOR_REPO_PATH`, `ELEVENLABS_API_KEY`, `ENABLE_SCRAPER`, `HUNTER_API_KEY`, `LEAD_DATABASE_ENABLED`, `LEAD_DATABASE_ROLLOUT_PHASE`, `LEAD_ENRICH_ON_HUNT`, `MARKETING_GOOGLE_MEET_URL`, `MARKETING_ZOOM_URL`, `OPENROUTER_API_KEY`, `OUTREACH_*` (5 keys), `RESEND_API_KEY`, `SALES_GOOGLE_MEET_URL`, `SALES_ZOOM_URL`, `SCRAPER_KEY`, `SCRAPER_URL`, `SESSION_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SUPPORT_GOOGLE_MEET_URL`, `SUPPORT_ZOOM_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `VAPID_*` (3 keys)

**EMPTY (names only):**  
All Stripe/PayPal/Wise/Kriptoman keys; `HEYGEN_API_KEY`, `DID_API_KEY`, `CARTESIA_*`; `APOLLO_API_KEY`, `LUSHA_API_KEY`, `SNOV_*`, `ZOOMINFO_API_KEY`, `NEVERBOUNCE_API_KEY`, `ZEROBOUNCE_API_KEY`; both Slack webhooks; SMTP credentials; Zoom OAuth trio; all External AI stack keys (Clay, Salesforge, Intercom, Sierra, Make, n8n, Ramp, Vic, Jasper, Predis, Devin, Replit, CrewAI, LangChain); `APIFY_API_TOKEN`; `FINANCE_KEY`/`FINANCE_URL`

**deploy.config.json mirror (field names, no values):** 34 fields SET including IBAN, Hunter, Resend, scraper, Meet/Zoom; **20 EMPTY** including all Stripe/price IDs, company legal block, HeyGen/D-ID, Apollo, NeverBounce/ZeroBounce, Slack, `manualPayment.swift`.

---

## Factory phase M4 — active modules & required keys

From `C:\dev\omni group\atina-platform\atina\src\modules\billing\lib\factory-phase-modules.ts` (cumulative through M4):

| Module flag | M4 |
|-------------|-----|
| `payments`, `billing`, `fulfillment`, `crm`, `notifications` | ON (M0–M1) |
| `scraper`, `outreach_draft`, `client_hunter` | ON (M2) |
| `public_site`, `retainer_scheduler`, `shop_manual` | ON (M3) |
| `lead_db`, `outreach_send`, `titanis`, `hot_clients`, `analytics` | ON (M4) |
| `autonomy`, `stripe_live`, `avatar` (module profile) | OFF until M5/M6 |

**M4 required env (profile):** `HUNTER_API_KEY`, `LEAD_DATABASE_ENABLED` — both SET locally.  
**M4 optional env:** `SNOV_API_KEY`, `NEVERBOUNCE_API_KEY`, `CLAY_API_KEY`, `SALESFORGE_API_KEY`, `INTERCOM_*`, `SIERRA_API_KEY`, `MAKE_*`, `N8N_*`, `ELEVENLABS_API_KEY` (ElevenLabs SET).

**Runtime gates:** `C:\dev\omni group\atina-platform\atina\src\modules\billing\lib\factory-phase-runtime.ts`  
- `outbound_send`: needs domain warmup complete OR dev fallback (warmup SET complete).  
- `lead_db`: `LEAD_DATABASE_ENABLED=true` (SET).  
- `avatar` module flag: min M6; **routes still work** via `SUPPORT_AVATAR_ENABLED` / `SALES_AVATAR_ENABLED` defaults in config.

**Lead rollout at F3** (`LEAD_DATABASE_ROLLOUT_PHASE=F3`, SET): Hunter/Snov/Lusha chain only — Apollo excluded until F4. File: `C:\dev\omni group\atina-platform\atina\src\integrations\lead-databases\phased-rollout.ts`.

---

## What empty integrations gate (no secrets)

| Empty key(s) | What is blocked / degraded | Primary files |
|--------------|------------------------------|---------------|
| **Stripe** (`STRIPE_*`, price IDs, `FINANCE_KEY`) | Card checkout, subscriptions, webhooks, `stripe_live` module; shop uses manual bank-transfer fallback | `src/modules/payments/service/payments.service.ts`, `src/config/index.ts` (`resolvePaymentsMode`), `src/modules/public-site/service/public-site.service.ts` (lines 253–301) |
| **HeyGen / D-ID** | Talking-head **video** avatar; TTS/chat still works via ElevenLabs; fulfillment marks `avatarConfigured: false`; optional M6 gap | `src/modules/video-meetings/providers/avatar-video-render.provider.ts`, `src/modules/billing/service/client-deliverable-bootstrap.service.ts`, `src/modules/billing/lib/factory-phase-modules.ts` (`auditFactoryPhaseGaps`) |
| **Apollo** | Skipped in provider chain at F3; needed for F4 “full chain” enrich | `src/integrations/lead-databases/phased-rollout.ts`, `src/integrations/lead-database.service.ts` |
| **NeverBounce / ZeroBounce** | Email verify at F4+; **required verified email before outbound at F5** | `src/integrations/lead-database.service.ts`, `phased-rollout.ts` |
| **Lusha / Snov / ZoomInfo** | Fallback enrich providers skipped when unconfigured | `src/integrations/lead-database.service.ts` |
| **Slack webhooks** | Ops/contact pings silent (non-fatal) | `src/utils/slack-notifier.service.ts`, `src/modules/billing/service/retainer-scheduler.service.ts` |
| **SMTP_USER/PASSWORD** | Direct SMTP path off; Resend/COMMS carry email | `src/modules/shared/hunting-readiness.service.ts` |
| **External AI stack** (Clay, Intercom, Make, …) | Status-only wiring; no runtime block at M4 | `src/modules/billing/lib/external-ai-stack.ts`, `src/integrations/external-ai-connections.ts` |
| **Zoom OAuth** | Static Zoom URLs work; API-driven Zoom meetings need OAuth trio | `src/config/index.ts` (`videoMeetings.zoom`) |

**AUTO gates (currently off):** M6 needs Stripe keys + MRR €2000 + `PAYMENTS_MODE=live` — `src/modules/billing/lib/factory-phase-effective.ts`.

---

## Retainer / avatar / ecommerce dependencies

| Deliverable | Works today (M4 + IBAN) | Needs empty keys for full quality |
|-------------|-------------------------|-----------------------------------|
| **lead-gen-retainer** | Welcome PDF, CRM seed, monthly scheduler tick, Hunter F3 enrich | Apollo (F4+), verify keys (F5 outbound quality) — `retainer.handler.ts`, `retainer-scheduler.service.ts` |
| **ai-support-retainer** | Module activation, RAG memory, ElevenLabs voice/chat | HeyGen/D-ID for video + checklist `avatarConfigured` — `client-deliverable-bootstrap.service.ts`, `fulfillment-quality-checklist.ts` |
| **support-priority / support-dedicated** | Tasks, modules, SLA | Dedicated: avatar provision attempt; video degraded without HeyGen/D-ID |
| **website-ecommerce** | Demo catalog + hosted site fulfillment (850 PASS) | Live shop **card** checkout needs Stripe; else manual reference — `public-site.service.ts`, `product-factory.service.ts` |
| **Avatar routes** (`/support/avatar/*`) | Chat + ElevenLabs TTS always if `SUPPORT_AVATAR_ENABLED` | Video render chain empty without HeyGen/D-ID/LivePortrait — `avatar-agent.service.ts`, `avatar-video-render.provider.ts` |

---

## Ordered gap list

### MUST — IBAN / manual clients (M4, can sell now but fix before “clean” invoices)

1. **`companyLegalName` / `companyTaxId` / `companyAddress`** — EMPTY in deploy.config; proforma/invoice PDFs show blanks — REDOM #3 — `deploy-secrets.local/deploy.config.json`, `src/modules/payments/service/invoice-pdf.service.ts`, `src/config/index.ts` (`payments.manual.*`)
2. **`manualPayment.swift`** — EMPTY; optional on transfer instructions but listed incomplete — `deploy.config.json`, `payments.service.ts` (`buildTransferInstructions`)
3. **Production secrets hygiene** — JWT/DB/ADMIN must not be defaults at boot — enforced in `src/config/index.ts` (lines 6–33)
4. **Resend domain verification** — operational, not key-empty; REDOM 1A — `docs/ADMIN-JEDNA-LISTA.md`
5. **Sync pipeline after key edits** — `docs/KLJUCEVI-JEDAN-IZVOR.md` → `scripts/apply-integration-keys.ps1`, `scripts/deploy-from-local-secrets.ps1`

*Already satisfied for IBAN path:* IBAN SET, `ALLOW_MANUAL_PAYMENTS_IN_PRODUCTION`, Hunter, scraper, Resend, contact CRM ingress, fulfillment 850/850, Meet/Zoom static URLs.

---

### MUST — cards / M6 / “enterprise CEO green”

1. **`stripeSecretKey`, `stripePublishableKey`, `stripeWebhookSecret`** — all EMPTY — REDOM #4 — `deploy.config.json`, `KLJUCEVI-POPUNI.local.txt` §4, `factory-phase-effective.ts` (M6 keys)
2. **`starterPriceId`, `proPriceId`, `enterprisePriceId`** — all EMPTY — same files; placeholder IDs rejected — `factory-phase-effective.ts` (`envKeyPresent`)
3. **`PAYMENTS_MODE=live`** — auto when `sk_live_*` present — `src/config/index.ts`, `docs/FACTORY-PHASE-M6-READY.md`
4. **Bump `factoryPhase` → M6** + deploy — `scripts/bump-factory-phase.ps1`, `scripts/prod-factory-phase.ps1`
5. **GitHub branch protection** — REDOM #1 — `docs/GIT-BRANCH-PROTECTION.md`
6. **Nest TypeORM prod** (`TYPEORM_SYNC=false` + migrations; not in live Docker) — REDOM #5
7. **CEO G production sign-off** (staging migrations, prod env sign-off, live payments, SMTP beyond Resend, smoke, monitoring, rollback) — REDOM #6 — `docs/CEO-G-PRODUCTION-EVIDENCE-LATEST.md`
8. **Lead F5 verify** for safe card-era outbound — `NEVERBOUNCE_API_KEY` and/or `ZEROBOUNCE_API_KEY` EMPTY — `phased-rollout.ts`, `docs/FACTORY-PHASE-M6-READY.md`
9. **Premium avatar for M6 module** — `HEYGEN_API_KEY` and `DID_API_KEY` both EMPTY — optional in gaps but expected at M6 — `factory-phase-modules.ts`, `external-ai-stack.ts`

*Revenue gate if AUTO re-enabled:* MRR €2000 for M6 — `factory-phase-effective.ts`, `docs/ADMIN-JEDNA-LISTA.md` BLOK 3.

---

### OPTIONAL — enrich quality, ops noise, M5+

1. **Slack** — `SLACK_WEBHOOK_URL`, `CONTACT_SLACK_WEBHOOK_URL` EMPTY — REDOM #7
2. **Apollo / Lusha / Snov / ZoomInfo** — enrich breadth beyond Hunter F3
3. **HeyGen / D-ID / Cartesia** — premium video avatar (ElevenLabs already SET for voice)
4. **External AI stack** — Clay, Salesforge, Intercom, Sierra, Make, n8n (M4 catalog); Ramp, Vic, Jasper, Predis, Devin, Replit, CrewAI, LangChain (M5+) — `KLJUCEVI-POPUNI.local.txt` §11, `external-ai-stack.ts`
5. **PayPal / Wise / Kriptoman** — alternate payment rails — `src/config/index.ts`
6. **SMTP credentials** — alternative to Resend — `src/config/index.ts` (`smtp`)
7. **Zoom OAuth** (`ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`) — API meetings vs static links
8. **Staging VPS, uptime, CDN, 2FA, Nest+Python+Astra in prod** — REDOM #9 backlog
9. **`APIFY_API_TOKEN`** — redundant if `SCRAPER_KEY` SET (Apify URL already configured)

---

## REDOM alignment (`docs/ADMIN-JEDNA-LISTA.md`)

| # | Item | Blocks IBAN? | Blocks cards/M6? |
|---|------|--------------|------------------|
| 1 | GitHub branch protection | No | Yes (CEO/process) |
| 2 | VPS backup | No | No (done) |
| 3 | Firma/PIB/adresa | **Yes (invoice quality)** | Yes |
| 4 | Stripe live + price IDs | No | **Yes** |
| 5 | Nest TypeORM prod | No | Yes |
| 6 | CEO G sign-off | No | **Yes** |
| 7–8 | Slack, HeyGen, enrich, external AI | No | No (quality) |
| 9 | Staging/CDN/2FA backlog | No | No |

**Bottom line:** IBAN/manual sales at M4 are **operationally live** (fulfillment PASS, Hunter F3, manual checkout). Remaining IBAN MUST is mainly **legal invoice fields** (#3). Cards/M6 is **entirely unblocked keys + REDOM 1,4,5,6 + phase bump to M6**.

[REDACTED]

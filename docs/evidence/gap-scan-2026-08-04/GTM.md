# M4 GTM Audit — Lead Gen / Outreach / Partner

**Context:** Hard `factoryPhase: M4`, `factoryPhaseAuto: false`, budget €550, prod `full`, fulfillment 850/850 PASS per `docs/ADMIN-JEDNA-LISTA.md` (2026-08-04).

Ordered by what blocks a **daily outbound machine** first.

---

## 1. LIVE-READY (can run today, mostly manual)

| # | Area | Status | Evidence |
|---|------|--------|----------|
| 1 | **Factory M4 profile** | ON | `deploy-secrets.local/deploy.config.json`: `factoryPhase: M4`, Hunter + Apify keys present; `scripts/prod-factory-phase.ps1` M4 block sets `LEAD_DATABASE_ENABLED=true`, `LEAD_DATABASE_ROLLOUT_PHASE=F3`, `OUTREACH_DAILY_CAP=50`, warmup flags off/complete |
| 2 | **Hunter.io integration** | Wired | `HUNTER_API_KEY` in deploy config → `scripts/deploy-config-env.ps1`; provider in `atina-platform/atina/src/integrations/lead-databases/providers/hunter.provider.ts`; M4 gate requires key in `factory-phase-modules.ts` |
| 3 | **Scraper flags** | ON | `scraperKey` + `scraperUrl` (Apify) in deploy config; M2+ requires `SCRAPER_KEY`; prod script sets `ENABLE_SCRAPER=true`, `CRAFTOR_USE_REAL_SCRAPER=true` |
| 4 | **Client Hunter stack** | Built | Module + pipeline: hunt → enrich → CRM → outbound; readiness/bootstrap/pipeline APIs; smoke: `atina-platform/atina/scripts/smoke-hunting.ps1`, `scripts/smoke-hunting-integration.ps1` |
| 5 | **Outreach send engine** | Built | `outbound-queue.service.ts`: daily cap, warmup gate, Resend/Courier send; wired into `hunting-stack.service.ts` pipeline |
| 6 | **Admin ops UI** | Partial | `HuntingStackPanel` — readiness, bootstrap, pipeline run, process outbound, hot clients, job boards (`apps/omnigroup-web/src/components/platform/HuntingStackPanel.tsx`) |
| 7 | **CRM ingress** | ON | Contact form → Resend + CRM; CRM supports `source`, `tags`, `partner` status |
| 8 | **Resend outbound domain** | Configured | `noreply@omnigrouptech.com` in deploy config; contact smoke passed |
| 9 | **ICP documentation** | Done | `docs/MARKETING-PLAN-VRHUNSKI.md` §2 — SMB 1–50, buyer persona, Top 5 verticals, SR/EN outbound note |
| 10 | **Partner GTM docs** | Done (manual) | `docs/PARTNER-AGENCIJE-OUTREACH-I-UGOVOR.md` — SR/EN email, LinkedIn DM, 1-page contract, CRM manual ops |
| 11 | **BFF API layer** | Done | Routes for hunting, outreach, titanis, deal-offer under `apps/omnigroup-web/src/app/api/atina/` |
| 12 | **LinkedIn (scrape only)** | Partial | Job boards include `linkedin_jobs`; Craftor scrapes LinkedIn jobs — **not** Sales Navigator |

---

## 2. MISSING / NOT LIVE-READY (blocks daily machine)

| # | Gap | Severity | Detail |
|---|-----|----------|--------|
| **A** | **No daily automation** | **P0 — machine killer** | Hunt+send only via manual admin button or one-off scripts. Autonomy scheduler (`autonomy-loop.service.ts`) is **M5**; no M4 cron/Task Scheduler for `pipeline/run` + `processSendQueue`. |
| **B** | **Domain warmup unproven** | **P0 — send blocker** | Code hard-blocks send unless `OUTREACH_DOMAIN_WARMUP_COMPLETE=true` or dev fallback (`outbound-queue.service.ts:210–212`). M4 deploy script sets `true`, but checklist gates still open (`MARKETING-REVENUE-PHASED-CHECKLIST.md` M2 §215). Real Resend warmup not evidenced in repo. |
| **C** | **Email verification** | **P1 — deliverability** | `neverbounceApiKey` / `zerobounceApiKey` **empty** in deploy config. F3 = enrich without auto-verify; no pre-send verify until F5. |
| **D** | **Snov.io backup enrich** | **P2** | Documented for F3 (`SNOV_*`) but not in deploy config or `deploy-config-env.ps1` mapping. |
| **E** | **Apollo / F4** | **P2 — scale** | `apolloApiKey` empty; F4 auto-verify chain not available. |
| **F** | **Web analytics (M4 KPI)** | **P1 — measurement** | `MARKETING-PLAN-VRHUNSKI.md` P0: Plausible/GA4 required; **no env keys or integration** found. Reply rate / cost-per-lead not measurable from web. |
| **G** | **M4 operational gates** | **P1 — pipeline empty** | Open per checklist: ≥50 CRM contacts with email, ≥1 outbound→checkout conversion, ROI > API cost, lead-db status F3+ verified on prod, retainer tick log. |
| **H** | **Titanis / deal-offer UI** | **P2 — conversion path** | BFF routes exist; **no** `TitanisPanel` / `DealOfferPanel` in admin. Checklist item still `[ ]`. |
| **I** | **Affiliate / partner tracking** | **P2 — partner channel** | Explicitly manual: `partner:{ime}` CRM tags only (`PARTNER-AGENCIJE` §5). **No** partner codes, UTM, commission automation, or billing hooks. |
| **J** | **Sales Navigator** | **Absent by design** | Zero matches in codebase. LinkedIn = job scrape + outreach channel enum only. No SN API, export, or enrichment path. |
| **K** | **External AI stack (Clay/Salesforge/etc.)** | **Optional** | All keys empty in deploy config; status endpoint wired but unused. |
| **M** | **MRR tracking from billing** | **P2 — gate honesty** | Checklist: `[ ] MRR tracking iz billing API (ne demo metrics)`. |
| **N** | **Follow-up sequences** | **P2** | `follow-up` module exists but no daily scheduler tied to outbound at M4. |

---

## 3. Ordered launch checklist (daily outbound machine)

**Do these in order before calling it “live”:**

1. **Confirm prod env on VPS** — `GET /api/v1/client-hunter/readiness` + outbound stats: `warmupComplete`, `remainingToday`, lead DB phase F3.
2. **Finish real email warmup** — Resend domain reputation; only then keep `OUTREACH_DOMAIN_WARMUP_COMPLETE=true` (never flip flag without actual warmup).
3. **Add daily runner** — Windows Task Scheduler or VPS cron calling `pipeline/run` then `outbound/process-send` (or equivalent script); M4 has no built-in scheduler.
4. **Seed ICP list** — Run hunter pipeline against Top 5 verticals from ICP doc; target checklist ≥50 CRM contacts with email.
5. **Add NeverBounce** — At minimum F2 manual verify before scaling send volume.
6. **Install Plausible or GA4** — Required for M4 KPIs (reply rate, cost/lead).
7. **Partner outreach** — Use `PARTNER-AGENCIJE` templates; track via CRM tags until affiliate code exists.
8. **Defer** — Sales Navigator (not built), Apollo F4, external AI stack, autonomy scheduler (M5).

---

## 4. Per-area verdict

| Check item | Verdict |
|------------|---------|
| **Hunter** | **Live-ready** — key + code + F3 profile |
| **Scraper flags** | **Live-ready** — Apify ON at M2+ |
| **Outreach warmup** | **Risk / likely blocked** — code + M4 env say send ON, but warmup gate + open checklist = not proven safe for daily blast |
| **PARTNER-AGENCIJE** | **Doc-ready, ops manual** — copy/send today; no system tracking |
| **Affiliate tracking** | **Missing** — CRM tags only |
| **Sales Navigator** | **Absent** — not in scope of codebase |
| **ICP docs** | **Live-ready** — in `MARKETING-PLAN-VRHUNSKI.md`; no separate ICP file |

---

## Bottom line

**Infrastructure for M4 outbound exists and keys are in place**, but it is an **operator-triggered hunt+send tool**, not a unattended daily machine. The three hard blockers are: **(A) no scheduler**, **(B) warmup/deliverability unverified**, **(C) no verify + analytics for safe scaling**. Partner GTM is **document-complete, system-incomplete**. Sales Navigator is **not implemented** — LinkedIn coverage is scrape/jobs only.

[REDACTED]

# Platform + dashboard live audit — 2026-10-25

**Verdict: SOFT_SYSTEMATIC_READY** — factory + client/admin money paths show **live** Atina data. Not GTM LIVE (Stripe TEST + firma P2). Dashboards are mostly tuned; a few gaps remain (honest, not fake-healthy).

Code map: [Dashboard audit](822316c3-88f9-4442-852f-2b8c795be5fa). Live UI login as admin on `omnigrouptech.com`.

---

## Bottom line for Marko

| Question | Answer |
|----------|--------|
| Can we sell soft (IBAN) and deliver? | **Yes** — proven 23/23 + multi portfolio |
| Do dashboards show live data? | **Mostly yes** — orders/fulfillment/billing/revenue from API |
| Is everything perfectly tuned? | **No** — monitoring was stale until probe; KPI “bruto €0” vs allocation €112k; analytics overview API without UI (F-17); overview SaaS €0 by design |
| Card LIVE / legal firma? | **Still P2** |

---

## Live API numbers (admin token, soft home)

| Source | Key figures |
|--------|-------------|
| `GET /api/v1/admin/overview` | users=2 · recordedPayments=**130** · recordedRevenue=**€112,597** · SaaS totalRevenue=**€0** |
| `GET /api/v1/marketing/overview` | kind=**ACTUAL** · revenueEur=112597 · customers=130 · spend=0 |
| `GET /api/v1/analytics/admin/overview` | totalRevenue=112597 · totalUsers=2 · activeSubs=0 (**API OK, no admin UI** — F-17) |
| `GET /api/v1/billing/fulfillment/jobs?limit=200` | **129** jobs returned · **125** completed |
| `GET /api/v1/payments/methods` | mode=**sandbox** · stripeLivemode=**false** |
| `GET /api/v1/monitoring/overview` | was MONITORING_DEGRADED / no_recent_check → after **Run probes**: subsystems largely OK, marketing still no_recent_check |

---

## What the UI showed (browser)

### `/admin` Overview — LIVE badge
- Factory M6, €200/mo budget, **Stripe TEST — no live charges** (honest banner)
- Active users **2** (matches API)
- SaaS revenue **€0** labeled “SaaS only · test/history hidden” (IBAN deliverable revenue intentionally not in that card)
- Charts “No data yet” for workflow spark / revenue index (by design empty spark)

### `/admin/billing` — LIVE + labeled simulation
- **Fulfillment queue**: live completed jobs (Quick setup, websites, retainers, bundles…) matching portfolio paymentIds
- **Revenue allocation**: Gross **€112,597 · 130 payments**
- **Market simulation** panel clearly labeled; local catalog math (F-17) — not booked revenue
- KPI quirk: “Bruto prihod (DB) €0” while allocation shows €112k — **untuned label/source split** (SaaS vs deliverable), not fake PASS

### `/admin/monitoring` — LIVE but was stale
- Before probe: all subsystems `no_recent_check` / UNAVAILABLE (honest DEGRADED)
- After **Run probes**: Infrastructure/DB/API/Payments/Email/OMI/Reinvestment/Monitoring report real check reasons (`postgres_ping_ok`, `process_serving`, `stripe_keys_present`, …)
- Marketing still `no_recent_check` → overall still **DEGRADED** (honest; ads sync off)

### Client `/dashboard/deliveries`
- Real client portal shell; loads from live fulfillment BFF (same jobs as admin)

---

## LIVE vs SIM / thin (operator cheat sheet)

| Surface | Mode | Notes |
|---------|------|-------|
| Admin overview / customers / billing payments / fulfillment | **LIVE** | Atina BFF |
| Revenue allocation | **LIVE** | €112,597 / 130 |
| Market simulation on billing | **SIM** (labeled) | local `simulateIndustry` |
| Market KPI | **MIXED** | live allocation + local catalog verticals |
| Analytics admin overview | **LIVE API, no UI** | F-17 |
| Monitoring | **LIVE** | needs periodic probes |
| Marketing panel | **LIVE** ACTUAL | spend 0 / ads sync off |
| Factory / hunting / resources / autonomy | **LIVE or lean-locked** | empty ≠ fake |
| Client orders / deliveries / billing | **LIVE** | |
| Client documents upload | **local/stub** | not Atina library |
| Consultation video booking | **not live** | points to contact |
| Project progress % | **UI heuristic** | 55% etc. |

---

## Not “ustimano” yet (honest backlog)

1. **P2** firma + Stripe LIVE — blocks card GTM  
2. **Monitoring scheduler** — probes were idle until manual Run; wire cron or accept soft DEGRADED  
3. **KPI bruto €0 vs allocation €112k** — align labels so operators don’t think revenue is missing  
4. **F-17** analytics overview BFF without UI — optional admin chart  
5. **Overview SaaS €0** while deliverable revenue exists — OK if labeled; ensure operators read Billing → Revenue allocation  
6. F-12 Telegram OFF · F-19 harvest unproven · F-20 Instantly 402 — not soft blockers  

---

## Evidence siblings
- Soft portfolio: `docs/evidence/_portfolio-full-20261025-gtm/VERDICT.md`
- Soft readiness: `docs/evidence/_gtm-soft-readiness-20261025.md`
- Web smoke: `docs/evidence/_gtm-web-smoke-20261025.md`

# DONE except Marko P2 — 2026-10-09

**Verdict:** Agent-owned code, config checks, and the honesty deploy are **closed**. Remaining go-to-market blockers are **Marko P2** (firma + Stripe LIVE + optional payment APIs) plus optional harvest/P3. Stripe on prod is still **TEST**.

## DONE (with evidence)

| Item | Evidence |
|------|----------|
| Ultimatrix hashed gate **PASS** (`ok=true`, failed=0) | [`ultimatrix-LATEST.txt`](./ultimatrix-LATEST.txt) · [`ultimatrix-FULL-20261009.json`](./ultimatrix-FULL-20261009.json) · [`ULTIMATRIX-AGENT-PROOF-20261009.md`](./ULTIMATRIX-AGENT-PROOF-20261009.md) · STATUS-KANON **LIVE-18** |
| Jest inside that gate (OmniTrix, checklist, intro promo, support AI) | 5 suites, 58 tests, exit 0 — sha256 in LATEST |
| Web honesty + public catalog tests | Ultimatrix web suites exit 0 |
| Empty-key audit | [`../generated/EMPTY-KEYS.md`](../generated/EMPTY-KEYS.md) — **32 EMPTY · 67 SET** (2026-10-09 10:44). EMPTY set is P2/P3 keys (PayPal, Wise, Kriptoman, optional enrich). `FINANCE_URL` stays empty on purpose. |
| Prod autonomous audit | [`../generated/PROD-AUDIT.md`](../generated/PROD-AUDIT.md) — **13 PASS · 0 FAIL · 2 TI** |
| Live intro promo | `GET https://omnigrouptech.com/api/atina/payments/deliverable-intro-promo` HTTP 200 — active, −15%, **50/50** slots left |
| Commercial companion + support AI on VPS | `docker exec omni-group-atina-api-1`: `COMPANION_OK`, `SUPPORT_AI_OK`, `INTRO_OK`; `support_ticket` routed in `execute-task-by-type.js` |
| Public **SERVICE + DOCS** honesty | Was stale (`consulting PDF pack` in the previous web image). SafeDeploy **EXIT 0** — [`_tmp-safedeploy-honesty-labels-20261009.txt`](./_tmp-safedeploy-honesty-labels-20261009.txt). After: containers healthy; `/pricing` HTTP 200 contains `audit engagement` and **SERVICE + DOCS** (9), **zero** `consulting PDF pack`. STATUS-KANON **LIVE-20** |
| Fulfillment HARD matrix | **1000/1000** score=100 — [`fulfillment-matrix-prod-20x50-HARD-FINAL-20261006.md`](./fulfillment-matrix-prod-20x50-HARD-FINAL-20261006.md) |
| Site + API | `https://omnigrouptech.com/api/health` HTTP 200, Atina status 200 |

No `.env` secrets were committed. `companyLegalName` was not filled. Stripe was not switched to LIVE.

## MARKO-ONLY

| ID | Item | State |
|----|------|--------|
| P2-01 | Firma / VAT — `companyLegalName`, tax id, address | Empty in deploy config. Runbook [`../MARKO-P2-FINISH.md`](../MARKO-P2-FINISH.md) |
| P2-02 | Stripe **LIVE** + card smoke | Still **TEST**. Do not treat fulfillment PASS as live-card GTM |
| P2-03 | PayPal API | Keys EMPTY |
| P2-04 | Wise API | Keys EMPTY |
| P2-05 | Kriptoman API | Keys EMPTY |
| Optional | `LEAD_LIVE_HARVEST_ON_KICKOFF` | Stays off until Marko turns it on. Analysis → hunt is already shipped |
| P0-07 | Legal counsel sign-off | Pages exist in code; lawyer sign-off is Marko (**TI** in prod audit) |

## Optional P3 (not blocking DONE)

| Item | Note |
|------|------|
| Enrich / outbound vendors | Clay, Lusha, ZoomInfo, n8n API, Intercom, and the rest in [`../generated/EMPTY-KEYS.md`](../generated/EMPTY-KEYS.md) |
| Instantly plan | Prod readiness reports `sendEnabled=true` and `warmupComplete=true` (2026-10-09). Vendor **402 / expired plan** is still a Marko upgrade if cold send is rejected (P0-03 / P3-A04) |
| P0-06 | Mystery-shopper PDF in the last 7 days: **TI** (no fresh inbox PDF this audit). Earlier proof remains `INV-202609-0879.pdf` |
| Staging VPS, DMARC quarantine, ads budget | P3-D / P3-A06 — owner later |
| `origin/main` vs feat branch | Prod is the deployed feat tree. Merging feat → `main` is a Marko git decision, not a product hole |

## What finished means

Packages ship product/service + docs companion + invoice. Support AI solves `support_ticket` / `support_automation` / `ai_support_ops`. Intro price is −15% for the first 50, then list price. Public cards say SERVICE + DOCS. **You** do firma, then Stripe LIVE, when you want real cards.

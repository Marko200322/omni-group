# Omni Remediation Map (from audit 20261006, score 66/100)

## Priority order (this sprint) — DONE in code
1. **Security Critical/High** — Recall fail-closed; API key orgRole; autonomy GET admin; outreach send admin ✅
2. **Commerce honesty** — Stripe success verify; bank transfer when configured; stripeLivemode honesty ✅
3. **Discoverability** — `/packages` → `/products`; published `/sites` in sitemap ✅
4. **BLOCKED without human** — Stripe LIVE keys + Dashboard webhook; cannot fabricate ⛔

## Result
- After score (honest): **74/100** (was 66)
- Report: `docs/evidence/_tmp-production-readiness-report-20261006.md`
- Unit evidence: 125 payment/live-call tests PASS locally
- Deploy + Stripe TEST E2E on prod: still required

## Deferred (next sprints, still tracked)
- Full OMI E tools, engine cron/workers, all 12 PARTIAL packages to PASS, adversarial re-audit
- LIVE purchase verification = BLOCKED until sk_live_ configured
- SafeDeploy of remediation changes

## Do not
- Fake LIVE Stripe
- Downgrade real fulfillment to mocks
- Claim 90+ without evidence

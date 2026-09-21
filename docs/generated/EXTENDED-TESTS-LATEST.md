# Extended tests 2026-09-21

## Local / prod HTTP (run-extended-tests.ps1)

| Test | Result |
|------|--------|
| test:contact (Resend prod) | PASS sent_via_resend |
| smoke:hunting:quick | PASS |
| smoke:evolution | PASS (tick: 1 internal task `test_fix` failed — smoke still OK) |
| smoke:product-factory | PASS |
| smoke:category-rollout (status only, no seed) | PASS 25/25 categories |
| test:hunt-pipeline (OpenRouter/Gemini) | PASS |
| smoke:hunting (full + pipeline) | **FAIL** — `OUTREACH_SEND_ENABLED=false` on prod (expected kill-switch) |

## VPS (/var/log/omni-extended-tests.log)

| Test | Result |
|------|--------|
| test:ci + coverage | **FAIL** — 2 suites (`revenue-allocation`, `dynamic-pricing`) on clean Docker env; coverage ~85% vs 90% threshold |
| test:hunt-pipeline | SKIP — no `.env` with AI keys on CI clone |
| smoke-stack | **PARTIAL** — Astra :8080 OK; Nest :3001 connection refused (Redis port 6380 conflict with prod stack) |

## Not run in this pass

- test:ci on laptop (use VPS log above)
- Nest queue smoke (-NestQueueSmoke)

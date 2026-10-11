# Ultimatrix agent proof — 2026-10-09

Verdict: **PASS**

No Stripe LIVE and no firma changes. Nothing committed.

## Local gate

Command (repo root):

```
node scripts/test-ultimatrix.mjs
```

Exit code: **0**

Evidence written by that run (sha256 of each suite tail recomputed and matched):

- `docs/evidence/ultimatrix-FULL-20261009.txt`
- `docs/evidence/ultimatrix-FULL-20261009.json`
- `docs/evidence/ultimatrix-LATEST.txt` (same body as the txt)

`ok=true`, `failed=[]`

| suite | exit | pass | sha256 |
| --- | --- | --- | --- |
| atina-jest-ultimatrix-suites | 0 | true | `79e5ddd1b27cf83ca8bd806fdcd9a936095fbb25d9127b16ad96609ec92cd444` |
| web-delivery-honesty | 0 | true | `f1f07961ac4a12d528b3061cf5ba25c58ca8d4e91a8a904e07ffe931c0f7d928` |
| web-public-catalog | 0 | true | `bc5dabd26b8e442314cd9dbf5633cc83584d0985811cef18cddd76a017a72a8b` |

Window: `startedAt=2026-10-09T08:48:16.255Z` `endedAt=2026-10-09T08:49:20.328Z`

Jest tail in the JSON: 5 suites, 58 tests, `Time: 36.207 s` (includes `omnitrix-spec.test.ts (27.056 s)`).

## Live VPS (ssh from `deploy-secrets.local/deploy.config.json`)

Host curl `http://127.0.0.1:3000/api/v1/payments/deliverable-intro-promo` HTTP 200:

```json
{"success":true,"data":{"enabled":true,"active":true,"discountPct":15,"maxSlots":50,"redeemed":0,"remaining":50,"label":"Intro −15% — 50 of 50 slots left"},"message":"Success"}
```

`active=true`, `remaining=50`.

`docker exec omni-group-atina-api-1` files under `/app/dist` (mtime Oct 8 21:44):

- `/app/dist/modules/billing/lib/deliverable-handlers/commercial-companion.js` (9801 bytes)
- `/app/dist/modules/support/service/support-ticket-agent.service.js` (10632 bytes)
- `/app/dist/modules/payments/lib/deliverable-intro-promo.js` (3235 bytes)
- `/app/dist/modules/billing/lib/package-delivery-spec.js` (33268 bytes)

M6 anchors parsed from that `package-delivery-spec.js` (20 SKUs):

```
setup-quick M6=549
setup-full M6=1490
setup-custom M6=1290
audit M6=790
integration M6=890
workflow-design M6=790
support-priority M6=299
support-dedicated M6=790
landing M6=1190
website-business M6=2290
website-ecommerce M6=2790
white-label-setup M6=1490
sales-enablement M6=790
vertical-package M6=349
lead-gen-retainer M6=449
ai-support-retainer M6=329
custom-software M6=1490
bundle-portal-presence M6=1390
bundle-sales-launch M6=1590
bundle-ops-clarity M6=1290
```

Grep anchors present: `custom-software` `M6: 1490`, `setup-custom` `M6: 1290`.

## UltrMatrix live design

Command: `cd apps/omnigroup-web && npm run test:ultrimatrix`

Exit code: **0**

`avgDesignScore=100` (`failed=0`)

Written: `docs/evidence/ultrimatrix-live-20261005.txt` and `.json` (script stamps that filename).

Hard probes (pricing, home, products) score 100. Optional `/sites/{marketing,fitness,legal_services}` returned HTTP 404 score 40 and are excluded from the average by the script.

## Not a fail

Every required check above is proven on disk or from the live probe. No FAIL line.

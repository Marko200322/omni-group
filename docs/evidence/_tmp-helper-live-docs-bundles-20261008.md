# Helper LIVE docs + bundles industry SKUs - 2026-10-08

| Item | Value |
|------|-------|
| **Verdict** | **PASS - 8/8 PASS** |
| **Target** | https://omnigrouptech.com |
| **Script** | `scripts/_tmp-helper-live-docs-bundles-20261008.ps1` + retry |
| **Gates** | numeric checklistScore; thin-PDF floors; custom-software `software-scaffold.tar.gz` download+gzip magic; bundle `bundleSteps` all completed |
| **Anti-fake** | No PASS without numeric score; custom-software PDF-only = FAIL |
| **Code fix** | Expose `bundleSteps` on fulfillment job view; SafeDeploy EXIT 0; unit 11/11 PASS |
| **SafeDeploy** | EXIT 0 (~253s) — `_tmp-safedeploy-helper-bundles-20261008.txt` |

## Results

| deliverableId | status | score | elapsedSec | artifacts | scaffoldBytes | bundleStepsOk | paymentId | notes |
|---------------|--------|------:|-----------:|----------:|--------------:|---------------|-----------|-------|
| audit__healthcare | PASS | 100 | 174 | 2 |  |  | `a18f36fa-9384-4494-8718-495f98c2c3f2` | gate=checklist; pdf=technical-audit.pdf (14611B) |
| integration__technology | PASS | 100 | 11 | 4 |  |  | `15f03e8d-e228-4848-9d8b-fc5fc108e6ad` | gate=checklist; pdf=integration-guide.pdf (10624B) |
| workflow-design__finance | PASS | 100 | 72 | 2 |  |  | `09081b0c-2fe8-467e-9fb2-de228ce11be7` | gate=checklist; pdf=workflow-sop-pack.pdf (11495B) |
| sales-enablement__marketing | PASS | 100 | 48 | 2 |  |  | `17c0c640-52da-4b73-82f9-c3c024ed4015` | retry after HTTP 500; pdf=9590B |
| custom-software__construction | PASS | 100 | 99 | 3 | 4350 |  | `67798c0c-aa25-4050-8702-022706d2d179` | scaffold.tar.gz HTTP200 gzip=1F8B |
| bundle-portal-presence__fitness | PASS | 100 | 51 | 5 |  | True | `e689ab29-d358-4b83-a155-606854fc8c99` | bundleSteps=setup-quick:completed, landing:completed |
| bundle-sales-launch__beauty | PASS | 100 | 12 | 4 |  | True | `2f9a453f-a0b4-435e-bd59-abe5d3621081` | bundleSteps=landing:completed, sales-enablement:completed |
| bundle-ops-clarity__legal | PASS | 100 | 23 | 4 |  | True | `b39f5045-d81c-49f2-bcf8-d2fa44f62b86` | bundleSteps=audit:completed, workflow-design:completed |

## Per-SKU detail

### audit__healthcare

- status: **PASS** score=100 elapsed=174s
- paymentId: `a18f36fa-9384-4494-8718-495f98c2c3f2`
- artifacts (2): technical-audit.pdf, audit_report_md.md
- pdfBytes: 14611

### integration__technology

- status: **PASS** score=100 elapsed=11s
- paymentId: `15f03e8d-e228-4848-9d8b-fc5fc108e6ad`
- artifacts (4): integration-guide.pdf, integration_guide_md.md, integration-config.json, integration-onboarding-checklist.md
- pdfBytes: 10624

### workflow-design__finance

- status: **PASS** score=100 elapsed=72s
- paymentId: `09081b0c-2fe8-467e-9fb2-de228ce11be7`
- artifacts (2): workflow-sop-pack.pdf, workflow_design_md.md
- pdfBytes: 11495

### sales-enablement__marketing

- status: **PASS** score=100 elapsed=48s
- paymentId: `17c0c640-52da-4b73-82f9-c3c024ed4015`
- artifacts (2): sales-enablement.pdf, sales-enablement_md.md
- pdfBytes: 9590
- notes: first attempt HTTP 500 during poll; retry PASS

### custom-software__construction

- status: **PASS** score=100 elapsed=99s
- paymentId: `67798c0c-aa25-4050-8702-022706d2d179`
- artifacts (3): software-scaffold.tar.gz, software-handoff.pdf, software_handoff_md.md
- pdfBytes: 7524
- scaffold: bytes=4350 gzipMagicOk=True (downloaded, not PDF-only)

### bundle-portal-presence__fitness

- status: **PASS** score=100 elapsed=51s
- paymentId: `e689ab29-d358-4b83-a155-606854fc8c99`
- artifacts (5): setup-quick.pdf, setup_pack_md.md, portal-modules.json, landing-delivery.pdf, site_delivery_pack_md.md
- publicUrl: https://omnigrouptech.com/sites/fitness-studio-e689ab29d358-muzync35 (HTTP 200)
- pdfBytes: 10523
- bundleSteps (post-SafeDeploy API): `setup-quick:completed, landing:completed`
- bundleStepsOk: True

### bundle-sales-launch__beauty

- status: **PASS** score=100 elapsed=12s
- paymentId: `2f9a453f-a0b4-435e-bd59-abe5d3621081`
- artifacts (4): landing-delivery.pdf, site_delivery_pack_md.md, sales-enablement.pdf, sales-enablement_md.md
- publicUrl: https://omnigrouptech.com/sites/beauty-studio-2f9a453fa0b4-muzyok2j (HTTP 200)
- pdfBytes: 11001
- bundleSteps (post-SafeDeploy API): `landing:completed, sales-enablement:completed`
- bundleStepsOk: True

### bundle-ops-clarity__legal

- status: **PASS** score=100 elapsed=23s
- paymentId: `b39f5045-d81c-49f2-bcf8-d2fa44f62b86`
- artifacts (4): technical-audit.pdf, audit_report_md.md, workflow-sop-pack.pdf, workflow_design_md.md
- pdfBytes: 14366
- bundleSteps (post-SafeDeploy API): `audit:completed, workflow-design:completed`
- bundleStepsOk: True

## Fixes during slice

| Issue | Fix |
|-------|-----|
| Job API omitted `bundleSteps` | Added `bundleSteps` to `toFulfillmentJobView` + unit tests (11/11) |
| sales-enablement HTTP 500 | Retried with 500 treated as transient -> PASS |
| Bundle probe FAIL (metadata missing) | SafeDeploy EXIT 0; re-fetch shows direct `bundleSteps` all completed |
| SafeDeploy tar race (first attempt) | Retry EXIT 0 (~253s). Log: `_tmp-safedeploy-helper-bundles-20261008.txt` |

## Honesty

- PASS only when fulfillment completed + numeric checklistScore + package-specific evidence gates.
- custom-software: downloaded `software-scaffold.tar.gz` (4350 bytes, gzip `1F8B`) — not PDF-only.
- Bundles: post-deploy job API returns `bundleSteps` with every child `status=completed` (probe `_tmp-bundle-steps-postdeploy-20261008.txt`).
- Raw JSON: `docs/evidence/_tmp-helper-live-docs-bundles-20261008.json`

# LIVE retainer/ops industry packages - 2026-10-08

| Item | Value |
|------|-------|
| **Verdict** | **PASS - 5/5 PASS** |
| **Target** | https://omnigrouptech.com |
| **Slice** | support-priority__healthcare, support-dedicated__legal, lead-gen-retainer__marketing, ai-support-retainer__technology, vertical-package__construction |
| **Gates** | numeric checklistScore; problemsCovered>=5 + embedded; tickets/CRM/analysis/RAG as applicable; no fake leads |
| **Raw jobs** | `docs/evidence/_tmp-helper-live-retainer-industry-20261008/` |
| **Checked at** | 2026-10-08 22:01:58 +02:00 |
| **SafeDeploy** | EXIT 0 — opsEvidence on job API; log `_tmp-safedeploy-helper-live-retainer-industry-20261008.txt` |
| **Probe script** | `scripts/_tmp-helper-live-retainer-industry-20261008.ps1` |

## Results

| sku | status | score | problems | embedded | ticket | CRM/RAG/analysis | arts | checkout | elapsed |
|-----|--------|------:|---------:|:--------:|--------|------------------|------:|----------|--------:|
| `support-priority__healthcare` | **PASS** | 100 | 10 | True | yes | ticket=201dcf93... | 6 | industry_sku | 138s |
| `support-dedicated__legal` | **PASS** | 100 | 10 | True | yes | ticket=aa371147... | 6 | industry_sku | 70s |
| `lead-gen-retainer__marketing` | **PASS** | 100 | 10 | True | yes | ticket=a1c0ff7f...; crm; analysis=hot-v1; mode=channels_ready;live=0;samples=8 | 6 | industry_sku | 56s |
| `ai-support-retainer__technology` | **PASS** | 100 | 10 | True | yes | ticket=e492d2fd...; rag=True;hits=1 | 6 | industry_sku | 19s |
| `vertical-package__construction` | **PASS** | 100 | 10 | True | yes | ticket=eed8be18...; crm | 4 | industry_sku | 16s |

## Catalog presence (catalog-quality + package-matrix/context)

| sku | resolved | fullPackageCatalogCount | problems (context/matrix) |
|-----|:--------:|------------------------:|-------------------------:|
| `support-priority__healthcare` | True | 1000 | 10 |
| `support-dedicated__legal` | True | 1000 | 10 |
| `lead-gen-retainer__marketing` | True | 1000 | 10 |
| `ai-support-retainer__technology` | True | 1000 | 10 |
| `vertical-package__construction` | True | 1000 | 10 |

## Per-SKU substance (anti theater)

### `support-priority__healthcare` - PASS

- paymentId: `80847311-42e5-46e6-a367-6ae38c3a1706`
- checklistScore: `100` passed=True
- problemsCoveredCount: 10; problemsEmbeddedInDoc: True
- kickoffTicketId: `201dcf93-ba83-476d-8920-5764088f8c9b`
- artifactTypes: retainer_welcome; retainer_welcome_md; health_check; support-priority-health-check-md; sla_onboarding_pack; support_faq_seed

### `support-dedicated__legal` - PASS

- paymentId: `d823ad62-6204-4907-a771-2fbaec24ee89`
- checklistScore: `100` passed=True
- problemsCoveredCount: 10; problemsEmbeddedInDoc: True
- kickoffTicketId: `aa371147-fe7f-49af-b06b-38a017fbb2c6`
- artifactTypes: retainer_welcome; retainer_welcome_md; health_check; support-dedicated-health-check-md; sla_onboarding_pack; support_faq_seed

### `lead-gen-retainer__marketing` - PASS

- paymentId: `1b1bd6c3-d844-4693-b54a-131b76a0ce0d`
- checklistScore: `100` passed=True
- problemsCoveredCount: 10; problemsEmbeddedInDoc: True
- kickoffTicketId: `a1c0ff7f-ef05-434d-9a03-d9681a84a335`
- artifactTypes: retainer_welcome; retainer_welcome_md; lead_gen_analysis; lead_gen_report; lead_gen_pipeline_workspace; sla_onboarding_pack
- leadGen mode=`channels_ready` leadsGenerated=`0` samples=`8` analysis=`hot-v1`
- fake leads: **NO** (gate no_simulated_harvest; live=0 unless mode=live_harvest + CONNECTED enrichment)
- CRM/modules: `imported=8;seeded=True`

### `ai-support-retainer__technology` - PASS

- paymentId: `6a99bdae-2469-4ab8-a919-bd5e6aec6df6`
- checklistScore: `100` passed=True
- problemsCoveredCount: 10; problemsEmbeddedInDoc: True
- kickoffTicketId: `e492d2fd-0ed4-45d2-9afe-f3883a13b459`
- artifactTypes: retainer_welcome; retainer_welcome_md; ai_support_setup; ai_support_knowledge_base; support_faq_seed; sla_onboarding_pack
- RAG: ragSeeded=`True` ragRecallHits=`1`

### `vertical-package__construction` - PASS

- paymentId: `643f4a8a-3546-4251-9460-ab48bc3bfb44`
- checklistScore: `100` passed=True
- problemsCoveredCount: 10; problemsEmbeddedInDoc: True
- kickoffTicketId: `eed8be18-703c-4fe1-902b-e18bbf550078`
- artifactTypes: vertical_pack; vertical_pack_md; sla_onboarding_pack; support_faq_seed
- CRM/modules: `imported=8;seeded=True`

## Honesty

| Claim | Status |
|-------|--------|
| All 5 industry SKUs live-fulfilled with numeric checklistScore | **YES** |
| problemsSolved/problemsCovered >=5 + embedded in MD/PDF | Required gate; FAIL if missing |
| Docs-only theater (PDF without ticket/CRM/RAG/analysis) | Rejected by package-specific checklist gates |
| Fake leads | Forbidden |
| Fake PASS without checklistScore | Forbidden |

Honest run - PASS only when checklistScore is numeric and substance gates hold. Verdict: **PASS**.


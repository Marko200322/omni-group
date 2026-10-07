# Lead machine — analysis THEN hot hunt (adversarial) — 2026-10-07

| Item | Value |
|------|-------|
| **Verdict** | **FIXED — was blind dump when flags on; now analysis→gate→hot filter** |
| **Commit** | `2941e7e` |
| **Branch** | `feat/phase10-outreach-send-enabled` |
| **Stripe** | No LIVE charges |
| **Fake leads** | Forbidden — `leads_generated` = hot count only (0 allowed) |

## 1) Adversarial findings (BEFORE fix)

| Question | Honest answer |
|----------|---------------|
| Does kickoff always harvest blindly when flags on? | **YES (was).** If `LEAD_LIVE_HARVEST_ON_KICKOFF` + enrichment active → `enrichFromHuntContext({ verticalName })` then `leadsGenerated = contacts.length`. No ICP pack, no hot filter. |
| ICP/industry analysis BEFORE Apollo/Hunter? | **NO (was).** ICP was only a Week-1 human task string. Hunt used vertical display name as keywords. |
| Hot-lead scoring / filtering before counting? | **NO (was).** Raw enrichment rows counted. Demo CRM samples were labeled DEMO (honest) but live path was dump-N. |
| Or "dump N contacts"? | **YES (was)** for live path when keys+flag present. |

Ops pack determinism (CRM / sequences / weekly / channel board) and `leads_generated=0` without keys were real. The gap: live harvest was unfiltered dump, not smart hot hunt.

## 2) AFTER fix — Phase A → B → C

| Phase | Behavior |
|-------|----------|
| **A Analysis** | Always on kickoff: `buildLeadGenAnalysisPack` → ICP keywords, target titles, seniority, excluded roles, thresholds, `huntReady`. Artifact: `lead-gen-analysis-pack.md` (`lead_gen_analysis`). |
| **B Hunt gate** | Apollo/Hunter **only if** `analysis.huntReady` AND `LEAD_LIVE_HARVEST_ON_KICKOFF` AND enrichment active. Search uses ICP `searchKeywords`. |
| **C Hot filter** | `hot-v1`: non-junk email; decision-maker title; exclude intern/junior/…; industry match or ICP-search provenance; score ≥ 60. Count = hot only. |

Code: `lead-gen-analysis-hunt.ts` → `runLeadGenKickoff` + `retainer.handler` + checklist `lead_gen_analysis_before_hunt`.

## 3) Unit tests

```
lead-gen-analysis-hunt.test.ts
lead-gen-channel-honesty.test.ts
lead-gen-ops-pack.determinism.test.ts
fulfillment-quality-checklist.test.ts
→ PASS (no hunt without analysis; mixed mock → only hot; without keys → 0)
```

## 4) SafeDeploy + smoke (prod)

| Step | Result |
|------|--------|
| SafeDeploy | **EXIT 0** (~224s); `atina-api` healthy; `web` recreated. Log: `docs/evidence/_tmp-safedeploy-lead-analysis-hunt-20261007.txt` |
| Smoke `lead-gen-retainer` @ construction | **PASS score=100 arts=6** (was 5 — analysis pack added). `elapsed=16s`. paymentId=`d8b87f29-b4e6-4fd1-bc77-89bd19fba75c` |
| Smoke CSV/MD | `lead-machine-analysis-hunt-smoke-20261007.csv` / `.md` |
| Analysis artifact | **PRESENT** `lead_gen_analysis` → `lead-gen-analysis-pack.md` (saved under `docs/evidence/_lead-machine-analysis-20261007/`) |
| Blind harvest? | **NO.** Apollo CONNECTED + analysis `huntReady=YES`, but gate: `LEAD_LIVE_HARVEST_ON_KICKOFF not enabled — analysis only`. Raw=0, hot=0, `leads_generated=0`. |

### Artifact list (live job)

| type | filename |
|------|----------|
| retainer_welcome | lead-gen-retainer-welcome.pdf |
| retainer_welcome_md | retainer_welcome_md.md |
| **lead_gen_analysis** | **lead-gen-analysis-pack.md** |
| lead_gen_report | lead-gen-kickoff-report.md |
| lead_gen_pipeline_workspace | lead-gen-pipeline-workspace.md |
| sla_onboarding_pack | lead-gen-retainer-sla-onboarding.md |

### Kickoff report excerpt (honesty)

- Phase A analysis: present (rules hot-v1)
- Hunt ready (analysis): YES
- Phase B gate: **NO HUNT** — `LEAD_LIVE_HARVEST_ON_KICKOFF not enabled — analysis only`
- Live HOT leads generated: **0**

## 5) What Marko must set for REAL hot hunt

1. `APOLLO_API_KEY` and/or `HUNTER_API_KEY` (real — not placeholders) — Apollo already CONNECTED on prod
2. `LEAD_DATABASE_ENABLED=true`
3. `LEAD_DATABASE_ROLLOUT_PHASE=F3` or `F4`
4. **`LEAD_LIVE_HARVEST_ON_KICKOFF=true`** ← currently missing on prod (analysis-only gate)
5. Optional: NeverBounce/ZeroBounce for `verified` email confidence
6. Ads (separate): `LINKEDIN_ADS_*` / `GOOGLE_ADS_*` + `MARKETING_ADS_LIVE_SYNC=true`

Without 2–4: analysis still ships; `leads_generated=0`; **no invented leads**; **no blind Apollo spend**.

# Lead machine — analysis THEN hot hunt (adversarial) — 2026-10-07

| Item | Value |
|------|-------|
| **Verdict** | **FIXED — was blind dump when flags on; now analysis→gate→hot filter** |
| **Branch** | `feat/phase10-outreach-send-enabled` |
| **Stripe** | No LIVE charges in this run |
| **Fake leads** | Forbidden — `leads_generated` = hot count only (0 allowed) |

## 1) Adversarial findings (BEFORE fix)

| Question | Honest answer |
|----------|---------------|
| Does kickoff always harvest blindly when flags on? | **YES (was).** If `LEAD_LIVE_HARVEST_ON_KICKOFF` + enrichment active → `enrichFromHuntContext({ verticalName })` then `leadsGenerated = contacts.length`. No ICP pack, no hot filter. |
| ICP/industry analysis BEFORE Apollo/Hunter? | **NO (was).** ICP was only a Week-1 human task string. Hunt used vertical display name as keywords. |
| Hot-lead scoring / filtering before counting? | **NO (was).** Raw enrichment rows counted. Demo CRM samples were labeled DEMO (honest) but live path was dump-N. |
| Or "dump N contacts"? | **YES (was)** for live path when keys+flag present. |

Determinism of ops pack (CRM stages / sequences / weekly / channel board) was real; honesty at `leads_generated=0` without keys was real. The lie was implying "smart hunt" while live harvest was unfiltered.

## 2) AFTER fix — Phase A → B → C

| Phase | Behavior |
|-------|----------|
| **A Analysis** | Always on kickoff: `buildLeadGenAnalysisPack` → ICP keywords, target titles, seniority tokens, excluded roles, score thresholds, channel readiness, `huntReady`. Artifact: `lead-gen-analysis-pack.md` (`lead_gen_analysis`). |
| **B Hunt gate** | Apollo/Hunter call **only if** `analysis.huntReady` AND `LEAD_LIVE_HARVEST_ON_KICKOFF` AND enrichment active (LEAD_DATABASE + phase + keys). Search uses ICP `searchKeywords`, not blind dump. |
| **C Hot filter** | `filterHotLeads` / `hot-v1`: require non-junk email; decision-maker title; exclude intern/junior/…; industry keyword or ICP-search provenance; score ≥ 60. Count = hot only. |

Code: `lead-gen-analysis-hunt.ts` → wired in `runLeadGenKickoff` + `retainer.handler` + quality checklist (`lead_gen_analysis_before_hunt`).

## 3) Unit tests

```
lead-gen-analysis-hunt.test.ts
lead-gen-channel-honesty.test.ts
lead-gen-ops-pack.determinism.test.ts
fulfillment-quality-checklist.test.ts
→ PASS (no hunt without analysis; mixed mock enrichment → only hot; without keys → 0)
```

## 4) SafeDeploy + smoke

| Step | Result |
|------|--------|
| SafeDeploy | _(filled after deploy)_ |
| Smoke `lead-gen-retainer` @ construction | _(filled after smoke)_ |
| Analysis artifact on job | _(filled)_ |
| Blind harvest | _(filled — expect gate/hot honesty, not raw dump)_ |

## 5) What Marko must set for REAL hot hunt

1. `APOLLO_API_KEY` and/or `HUNTER_API_KEY` (real keys — not placeholders)
2. `LEAD_DATABASE_ENABLED=true`
3. `LEAD_DATABASE_ROLLOUT_PHASE=F3` or `F4`
4. `LEAD_LIVE_HARVEST_ON_KICKOFF=true` (costs API credits)
5. Optional email verify: NeverBounce/ZeroBounce + phase that enables verify
6. Ads live pull is separate: `LINKEDIN_ADS_*` / `GOOGLE_ADS_*` + `MARKETING_ADS_LIVE_SYNC=true`

Without 1–4: analysis pack still ships; `leads_generated=0`; no invented leads.

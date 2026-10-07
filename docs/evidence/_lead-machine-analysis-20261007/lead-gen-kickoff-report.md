# Lead Gen — Kickoff Pack

Client: Client
Vertical: Construction
Mode: Channels CONNECTED — hunt gated or no hot leads yet (leads_generated = 0)

## Channel connection status (honest)
- linkedin: **NOT CONNECTED** — LINKEDIN_ADS_* incomplete or missing (CONFIGURATION REQUIRED)
- google_ads: **NOT CONNECTED** — GOOGLE_ADS_* incomplete or missing
- meta_ads: **NOT CONNECTED** — META_ADS_* incomplete or missing
- apollo: **CONNECTED** — APOLLO_API_KEY configured
- email: **CONNECTED** — Outbound email transport configured

## Analysis → hunt (not blind dump)
- Phase A analysis: **present** (rules hot-v1)
- Hunt ready (analysis): YES
- Phase B gate: NO HUNT — LEAD_LIVE_HARVEST_ON_KICKOFF not enabled — analysis only
- Raw enrichment rows: 0
- Hot after Phase C filter: 0 (rejected 0)
- Search keywords used: `građevina smb local business automation construction građevina smb market local lead generation digital adoption pain points`

## Kickoff results
- Live HOT leads generated: 0 (never invented; never raw dump count)
- Sample CRM leads seeded (demo, not live harvest): 8
- Estimated pipeline value (live only): €0
- Workspace: 7f38a80b-9fc4-4adb-ab8e-d729427b973e
- Titanis planning run: a5ba1e3c-dc01-40cd-813b-987afde05a51 (planning only — not a harvest success metric)

## What you received now
- ICP analysis pack (Phase A — always)
- Pipeline workspace (CRM stages, sequence templates, weekly plan, channel board)
- Outreach workspace in portal + actionable week-1 tasks
- CRM pipeline seed for Construction
- This kickoff report with channel honesty
- Onboarding ticket for first outreach week

## Next 30 days
1. Discover local leads (client-hunter)
2. Score leads (lead-scoring)
3. CRM capture (crm)
4. Outreach sequence (outreach)
5. Follow-up (follow-up-automation)
6. Billing (billing)

## Outreach hooks (planning — not auto-sent to LinkedIn/Ads)
- Turnkey delivery for Građevina — no platform resale
- CRM + automations tailored to your niche
- Lead gen and follow-up in one package

## Connecting live channels (deterministic — analysis then hot hunt)
1. Google Ads spend sync: GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_CUSTOMER_ID + MARKETING_ADS_LIVE_SYNC=true
2. LinkedIn Ads: LINKEDIN_ADS_ACCESS_TOKEN + LINKEDIN_ADS_ACCOUNT_ID + MARKETING_ADS_LIVE_SYNC=true
3. Meta Ads: META_ADS_ACCESS_TOKEN + META_ADS_AD_ACCOUNT_ID + MARKETING_ADS_LIVE_SYNC=true
4. Apollo / Hunter hot hunt on kickoff: APOLLO_API_KEY (or HUNTER_API_KEY), LEAD_DATABASE_ENABLED=true, LEAD_DATABASE_ROLLOUT_PHASE=F4 (or F3+), LEAD_LIVE_HARVEST_ON_KICKOFF=true
5. Without those flags, mode stays kickoff_pack_only / channels_ready and leads_generated=0 — analysis pack still ships


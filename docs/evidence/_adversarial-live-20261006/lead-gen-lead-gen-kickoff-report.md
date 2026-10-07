# Lead Gen — Kickoff Pack

Client: Client
Vertical: Finance
Mode: Channels CONNECTED — harvest adapter has not pulled contacts yet (leads_generated = 0)

## Channel connection status (honest)
- linkedin: **NOT CONNECTED** — LINKEDIN_ADS_* incomplete or missing (CONFIGURATION REQUIRED)
- google_ads: **NOT CONNECTED** — GOOGLE_ADS_* incomplete or missing
- meta_ads: **NOT CONNECTED** — META_ADS_* incomplete or missing
- apollo: **CONNECTED** — APOLLO_API_KEY configured
- email: **CONNECTED** — Outbound email transport configured

## Kickoff results
- Live leads generated: 0 (never invented by Titanis)
- Sample CRM leads seeded (demo, not live harvest): 8
- Estimated pipeline value (live only): €0
- Workspace: 7f38a80b-9fc4-4adb-ab8e-d729427b973e
- Titanis planning run: 7a1e582d-d3ff-4d55-ba50-0d749ded9806 (planning only — not a harvest success metric)

## What you received now
- Pipeline workspace (CRM stages, sequence templates, weekly plan, channel board)
- Outreach workspace in portal + actionable week-1 tasks
- CRM pipeline seed for Finance
- This kickoff report with channel honesty
- Onboarding ticket for first outreach week

## Next 30 days
1. Client KYC packet (compliance)
2. CRM onboarding ledger (crm)
3. Quote + invoice (billing)
4. Reconcile payment (automation)
5. Notify unlock (notifications)
6. Exception queue (tasks)

## Outreach hooks (planning — not auto-sent to LinkedIn/Ads)
- Reconciliation that matches payment references
- Dual-control payment confirm → unlock
- KYC packet before kickoff, not after

## Connecting live channels
1. Google Ads: set GOOGLE_ADS_* + MARKETING_ADS_LIVE_SYNC=true
2. LinkedIn Ads/Marketing: set LINKEDIN_ADS_ACCESS_TOKEN + LINKEDIN_ADS_ACCOUNT_ID + MARKETING_ADS_LIVE_SYNC=true (CONFIGURATION REQUIRED until keys)
3. Apollo enrichment: set APOLLO_API_KEY


# Quick Setup — Go-Live Checklist

_Client — Healthcare_


## Problems this package addresses

Package setup-quick × industry healthcare — 10 concrete problems (target 5–10):

1. Healthcare teams lose time on manual client onboarding and scattered billing
2. Front-desk overload on intake and rescheduling
3. Referral leakage between clinics and specialists
4. Compliance fear blocking useful automation
5. Patient intake forms leak PHI into generic CRM fields
6. Appointment no-show rate without reminder automation
7. No unified client portal login
8. Billing and notifications not in one place
9. Missing downloadable onboarding documentation
10. No workspace project to track delivery

These map to checkout OmniTrix claims and must appear in the delivered pack — not marketing-only copy.

## Kickoff scope & owners

Client — Healthcare (healthcare) — quick setup tier.

• Value thesis: End-to-end delivery for Healthcare: CRM, automations, lead gen, and AI support — no platform resale, only finished output.
• Modules to activate: crm, automation, notifications, compliance, billing
• Domain focus: HIPAA, PHI, patient intake, clinical scheduling
• Owners: client admin (access), Omni fulfillment (config), finance (payment confirm)

Day 1 checklist:
• ☐ Access list collected
• ☐ Brand/legal name confirmed
• ☐ Industry category locked (healthcare) for vertical pack
• ☐ Success metric agreed (e.g. first paid delivery < 7 days)
• ☐ PHI-safe CRM field map approved
• ☐ Intake form + reminder path live

## Portal & auth

1. Create client portal user; verify login + password reset email
2. Confirm admin vs client role separation
3. Smoke-test session expiry and logout
4. Bookmark dashboard URL for handoff
5. Document recovery contacts if MFA/email delivery fails

Acceptance: client can log in without Omni assistance (Milestone M1).
KPI (Healthcare): Patient intake completion rate

## Payments & notifications

• Manual bank-transfer reference flow tested end-to-end
• Admin confirm → fulfillment notification observed
• Invoice / receipt email path verified
• Contact form delivers to support inbox
• Failed-notify path surfaces in admin ops inbox

Day 2 checklist: ☐ payment notify ☐ invoice ☐ contact form ☐ failure alert ☐ client download path

## CRM seed & industry templates

Quick setup seeds labeled DEMO / industry-template CRM rows for Healthcare so the team can practice stages without inventing live leads.

• Domain focus: HIPAA, PHI, patient intake, clinical scheduling, BAA, ehr
• DEMO_SAMPLE tags must remain visible until replaced with a real export
• Primary account row kept for the buying contact
• Workflow nuances: Intake → eligibility check → schedule → reminder → visit close; Clinical owner required before any referral outreach

Checklist: ☐ open CRM ☐ identify DEMO rows ☐ advance one sample lead ☐ decide import vs stay-on-samples
Milestone: first Healthcare stage practice complete before Day 5 hypercare ends.

## Launch & SLA

1. DNS/HTTPS smoke (or hosted path) green
2. Record go-live timestamp
3. Share dashboard + this checklist PDF
4. Agree 5-business-day hypercare window
5. Schedule Day 5 check-in for open issues

Healthcare compliance reminders:
• HIPAA/PHI handling: encryption at rest + access audit trail
• Business Associate Agreement (BAA) path documented for vendors
• Patient intake consent + retention schedule reviewed

Industry hooks to mention on handoff: PHI-safe intake + reminder automation; Referral follow-up without leaking clinical notes; Front-desk overload reduced with portal booking

Go-live acceptance: ☐ smoke green ☐ client login ☐ payment path ☐ hypercare calendar invite

## Day-5 hypercare & acceptance

Hypercare window for Client (Healthcare) — close these items before marking setup done:
1. Owner can download this PDF from Deliveries without Omni help
2. Billing invoice / payment history visible to entitled users
3. Notifications bell shows the welcome / fulfillment notice
4. KPI snapshot started: Patient intake completion rate; Appointment show rate / no-show %; Referral-to-scheduled conversion
5. Risk watchlist logged: Patient intake forms leak PHI into generic CRM fields; Appointment no-show rate without reminder automation

Day-5 checklist:
• ☐ Open issues listed with owners
• ☐ DEMO CRM cleanup decision recorded
• ☐ Setup milestones: PHI-safe CRM field map approved; Intake form + reminder path live; BAA vendor list attached to go-live pack
• ☐ Upsell path noted (full onboarding / audit) only if requested

Acceptance: hypercare calendar invite sent; no invented live metrics.

## Owner runbook & escalation

Day-to-day runbook for Client operators in Healthcare:
1. Login → Notifications → Billing → Deliveries (download this PDF + markdown pack)
2. Confirm any bank-transfer payment from Admin only when reference matches
3. Open a support ticket with payment/order ID if fulfillment artifacts are missing
4. Escalate Healthcare compliance questions using: HIPAA/PHI handling: encryption at rest + access audit trail; Business Associate Agreement (BAA) path documented for vendors
5. Revisit discovery prompts when scope changes: Where is PHI stored today (EHR, forms, email, spreadsheets)?; How are referrals handed off from front desk to clinicians?

Honesty boundaries (do not oversell):
• Portal entitlements + setup PDF are COMPLETE for this package
• External ads / Apollo / LinkedIn APIs remain NOT CONNECTED unless separately wired
• Custom domain DNS stays with the client registrar
• Integration notes for later packages: Never put PHI in webhook payloads — use opaque patient refs; Separate clinical schedule sync from marketing CRM stages

Modules referenced: crm, automation, notifications, compliance, billing
Keywords / positioning: healthcare, patient intake, HIPAA, clinical scheduling, PHI

Checklist: ☐ operators named ☐ escalation email known ☐ Deliveries download verified ☐ no invented lead counts

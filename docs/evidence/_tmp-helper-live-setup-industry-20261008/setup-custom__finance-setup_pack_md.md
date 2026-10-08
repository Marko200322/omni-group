# Custom Production Deploy

_Client — Finance_


## Problems this package addresses

Package setup-custom × industry finance — 10 concrete problems (target 5–10):

1. Finance needs production-grade deploy without rebuilding the stack
2. Slow cash collection and unclear payment status
3. Manual reconciliation eating analyst hours
4. Compliance friction delaying client onboarding
5. Bank transfers without unique payment references
6. Reconciliation lag creates false “paid” states
7. No deploy manifest for ops teams
8. Module sprawl across environments
9. CRM not seeded for go-live
10. Enterprise handoff PDF missing

These map to checkout OmniTrix claims and must appear in the delivered pack — not marketing-only copy.

## Kickoff scope & owners

Client — Finance (finance) — custom setup tier.

• Value thesis: End-to-end delivery for Finance: CRM, automations, lead gen, and AI support — no platform resale, only finished output.
• Modules to activate: billing, crm, compliance, notifications, automation
• Domain focus: KYC, AML, reconciliation, audit trail
• Owners: client admin (access), Omni fulfillment (config), finance (payment confirm)

Day 1 checklist:
• ☐ Access list collected
• ☐ Brand/legal name confirmed
• ☐ Industry category locked (finance) for vertical pack
• ☐ Success metric agreed (e.g. first paid delivery < 7 days)
• ☐ Unique payment reference flow live
• ☐ Dual-control confirm path documented

## Infrastructure

Production deploy prep for Client (Finance) — client-executable until Omni-managed infra is contracted:
1. Provision VPS/Docker prod stack with TLS terminator
2. Firewall: only 80/443 (+ SSH allowlist)
3. Automated backups + restore drill documented
4. Monitoring hooks (uptime + error rate) with alert contacts
5. Staging parity checklist signed before prod promote
6. Label env with vertical=finance / category=finance

Domain focus: KYC, AML, reconciliation, audit trail
Milestone M1: staging parity checklist signed before prod promote.
Checklist: ☐ host sized ☐ TLS path ☐ backup cron ☐ alert contacts ☐ SSH allowlist

## Security hardening

• Secrets rotation; no default admin passwords
• Rate limits on auth and public APIs
• Audit log review cadence (weekly for first month)
• Dependency/image patch window defined
• Least-privilege service accounts for deploy + backups
• KYC/AML onboarding checklist with evidence locations
• Segregation of duties: billing confirm ≠ fulfillment operator
• Immutable audit trail for payment confirm and privilege changes
• Reconciliation cadence (daily/weekly) with exception owners

Operational risks to log for Finance:
• Bank transfers without unique payment references
• Reconciliation lag creates false “paid” states
• Same operator confirms payment and releases artifacts

Day 0 go-live security checklist: ☐ secrets ☐ TLS ☐ backups ☐ alerts ☐ least privilege ☐ compliance notes

## SLA, ops & handoff

• Uptime target 99.5% measured monthly
• Incident contact matrix + rollback procedure
• Runbook + env template + deploy script access for client ops
• Honesty: domainConfigured / sslProvisioned stay false until client completes DNS/TLS
• Vertical modules: billing, crm, compliance, notifications, automation
• Domain tokens: KYC, AML, reconciliation, audit trail
• Integration notes: Idempotency-Key required on payment-confirm retries; Ledger export must include payment_reference + amount + currency

Acceptance: production deploy manifest attached; restore drill date recorded; KPI owners named.
Checklist: ☐ runbook executable ☐ PENDING_* statuses honest ☐ rollback owner ☐ restore drill date

## 90-day optimization checklist

1. Week 2: review error budgets
2. Week 4: automation ROI snapshot
3. Day 60: capacity / cost review
4. Day 90: SLA report + next-quarter backlog
5. Track: Unique payment reference flow live
6. Track: Dual-control confirm path documented
7. Track: First reconciliation dry-run signed

Finance KPIs:
• Days sales outstanding (DSO)
• Reconciliation exception rate
• Payment confirm → artifact unlock latency
• KYC packet completion rate

• ☐ Research complete (TAM + competition in research_data)
• ☐ Artifacts generated (module, landing, workflow, outreach, quality pack)
• ☐ Dynamic pricing quote valid for verticalSlug
• ☐ CRM pipeline and lead source defined
• ☐ Outreach draft reviewed before send (domain warmup)
• ☐ Smoke test / owner sign-off before client delivery
• ☐ Segregation of duties documented
• ☐ Reconciliation dry-run signed

Discovery prompts to revisit: How do you reconcile bank transfers to invoices today?; Who can both confirm payment and release deliverables?; What KYC evidence is required before kickoff?

Day 90 acceptance: ☐ SLA report ☐ cost review ☐ backlog prioritized ☐ no invented uptime claims

## Client-executable runbook & honesty

This custom deploy pack for Client is COMPLETE as a runbook — not a claim that Omni already configured DNS/SSL.

1. Download production-deploy manifest from Deliveries
2. Complete PENDING_CLIENT DNS/TLS steps at the registrar
3. Confirm backups + restore drill date in writing
4. Apply Finance compliance items: KYC/AML onboarding checklist with evidence locations; Segregation of duties: billing confirm ≠ fulfillment operator
5. Open a support ticket with payment ID if any artifact is missing

Honesty boundaries:
• sslProvisioned / domainConfigured must remain false until client work is done
• External ads / Apollo / LinkedIn stay NOT CONNECTED unless separately wired
• Do not invent live lead or uptime metrics in handoff emails

Keywords: finance, KYC, AML, reconciliation, audit trail
Checklist: ☐ manifest downloaded ☐ PENDING items owned ☐ restore drill dated ☐ escalation path tested

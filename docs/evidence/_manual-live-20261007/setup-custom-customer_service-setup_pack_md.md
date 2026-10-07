# Custom Production Deploy

_Client — Customer Service_


## Kickoff scope & owners

Client — Customer Service (customer_service) — custom setup tier.

• Value thesis: End-to-end delivery for Customer Service: CRM, automations, lead gen, and AI support — no platform resale, only finished output.
• Modules to activate: support-avatar, ai-rag, crm, follow-up, notifications
• Domain focus: ticket SLA, CSAT, deflection rate, knowledge base
• Owners: client admin (access), Omni fulfillment (config), finance (payment confirm)

Day 1 checklist:
• ☐ Access list collected
• ☐ Brand/legal name confirmed
• ☐ Industry category locked (customer_service) for vertical pack
• ☐ Success metric agreed (e.g. first paid delivery < 7 days)
• ☐ Ticket SLA clocks live
• ☐ KB seed articles published

## Infrastructure

Production deploy prep for Client (Customer Service) — client-executable until Omni-managed infra is contracted:
1. Provision VPS/Docker prod stack with TLS terminator
2. Firewall: only 80/443 (+ SSH allowlist)
3. Automated backups + restore drill documented
4. Monitoring hooks (uptime + error rate) with alert contacts
5. Staging parity checklist signed before prod promote
6. Label env with vertical=customer_service / category=customer_service

Domain focus: ticket SLA, CSAT, deflection rate, knowledge base
Milestone M1: staging parity checklist signed before prod promote.
Checklist: ☐ host sized ☐ TLS path ☐ backup cron ☐ alert contacts ☐ SSH allowlist

## Security hardening

• Secrets rotation; no default admin passwords
• Rate limits on auth and public APIs
• Audit log review cadence (weekly for first month)
• Dependency/image patch window defined
• Least-privilege service accounts for deploy + backups
• Customer PII retention for tickets documented
• Escalation tiers and after-hours coverage defined
• Refund / complaint handling policy linked

Operational risks to log for Customer Service:
• SLA breaches without owner alerts
• Knowledge base stale → repeat tickets
• Escalations lost between tiers

Day 0 go-live security checklist: ☐ secrets ☐ TLS ☐ backups ☐ alerts ☐ least privilege ☐ compliance notes

## SLA, ops & handoff

• Uptime target 99.5% measured monthly
• Incident contact matrix + rollback procedure
• Runbook + env template + deploy script access for client ops
• Honesty: domainConfigured / sslProvisioned stay false until client completes DNS/TLS
• Vertical modules: support-avatar, ai-rag, crm, follow-up, notifications
• Domain tokens: ticket SLA, CSAT, deflection rate, knowledge base
• Integration notes: Ticket ID correlates CRM + billing + portal; KB article suggestions from ticket topic tags

Acceptance: production deploy manifest attached; restore drill date recorded; KPI owners named.
Checklist: ☐ runbook executable ☐ PENDING_* statuses honest ☐ rollback owner ☐ restore drill date

## 90-day optimization checklist

1. Week 2: review error budgets
2. Week 4: automation ROI snapshot
3. Day 60: capacity / cost review
4. Day 90: SLA report + next-quarter backlog
5. Track: Ticket SLA clocks live
6. Track: KB seed articles published
7. Track: Escalation tier map signed

Customer Service KPIs:
• First response SLA
• CSAT
• Deflection rate
• Reopen rate

• ☐ Research complete (TAM + competition in research_data)
• ☐ Artifacts generated (module, landing, workflow, outreach, quality pack)
• ☐ Dynamic pricing quote valid for verticalSlug
• ☐ CRM pipeline and lead source defined
• ☐ Outreach draft reviewed before send (domain warmup)
• ☐ Smoke test / owner sign-off before client delivery

Discovery prompts to revisit: What channels are in scope (email, chat, phone)?; What is the current CSAT and top ticket drivers?; How are refunds approved?

Day 90 acceptance: ☐ SLA report ☐ cost review ☐ backlog prioritized ☐ no invented uptime claims

## Client-executable runbook & honesty

This custom deploy pack for Client is COMPLETE as a runbook — not a claim that Omni already configured DNS/SSL.

1. Download production-deploy manifest from Deliveries
2. Complete PENDING_CLIENT DNS/TLS steps at the registrar
3. Confirm backups + restore drill date in writing
4. Apply Customer Service compliance items: Customer PII retention for tickets documented; Escalation tiers and after-hours coverage defined
5. Open a support ticket with payment ID if any artifact is missing

Honesty boundaries:
• sslProvisioned / domainConfigured must remain false until client work is done
• External ads / Apollo / LinkedIn stay NOT CONNECTED unless separately wired
• Do not invent live lead or uptime metrics in handoff emails

Keywords: customer support, help desk, customer success, live chat, customer service
Checklist: ☐ manifest downloaded ☐ PENDING items owned ☐ restore drill dated ☐ escalation path tested

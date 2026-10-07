# Custom Production Deploy

_Client — Admin Support_


## Kickoff scope & owners

Client — Admin Support (admin_support) — custom setup tier.

• Value thesis: End-to-end delivery for Admin Support: CRM, automations, lead gen, and AI support — no platform resale, only finished output.
• Modules to activate: automation, crm, tasks, notifications, client-hunter
• Domain focus: virtual assistant, inbox triage, calendar management, SOP checklist
• Owners: client admin (access), Omni fulfillment (config), finance (payment confirm)

Day 1 checklist:
• ☐ Access list collected
• ☐ Brand/legal name confirmed
• ☐ Industry category locked (admin_support) for vertical pack
• ☐ Success metric agreed (e.g. first paid delivery < 7 days)
• ☐ Inbox triage live
• ☐ Calendar ownership mapped

## Infrastructure

Production deploy prep for Client (Admin Support) — client-executable until Omni-managed infra is contracted:
1. Provision VPS/Docker prod stack with TLS terminator
2. Firewall: only 80/443 (+ SSH allowlist)
3. Automated backups + restore drill documented
4. Monitoring hooks (uptime + error rate) with alert contacts
5. Staging parity checklist signed before prod promote
6. Label env with vertical=admin_support / category=admin_support

Domain focus: virtual assistant, inbox triage, calendar management, SOP checklist
Milestone M1: staging parity checklist signed before prod promote.
Checklist: ☐ host sized ☐ TLS path ☐ backup cron ☐ alert contacts ☐ SSH allowlist

## Security hardening

• Secrets rotation; no default admin passwords
• Rate limits on auth and public APIs
• Audit log review cadence (weekly for first month)
• Dependency/image patch window defined
• Least-privilege service accounts for deploy + backups
• PII access limited to assigned VA roles
• Client credential vault policy (no shared passwords in chat)
• Outbound email send-as authorization documented

Operational risks to log for Admin Support:
• Inbox backlog without triage SLA
• Calendar double-books across timezones
• SOPs drift when VA turnover happens

Day 0 go-live security checklist: ☐ secrets ☐ TLS ☐ backups ☐ alerts ☐ least privilege ☐ compliance notes

## SLA, ops & handoff

• Uptime target 99.5% measured monthly
• Incident contact matrix + rollback procedure
• Runbook + env template + deploy script access for client ops
• Honesty: domainConfigured / sslProvisioned stay false until client completes DNS/TLS
• Vertical modules: automation, crm, tasks, notifications, client-hunter
• Domain tokens: virtual assistant, inbox triage, calendar management, SOP checklist
• Integration notes: Tag tasks with client + source channel; Calendar webhooks for conflict detection

Acceptance: production deploy manifest attached; restore drill date recorded; KPI owners named.
Checklist: ☐ runbook executable ☐ PENDING_* statuses honest ☐ rollback owner ☐ restore drill date

## 90-day optimization checklist

1. Week 2: review error budgets
2. Week 4: automation ROI snapshot
3. Day 60: capacity / cost review
4. Day 90: SLA report + next-quarter backlog
5. Track: Inbox triage live
6. Track: Calendar ownership mapped
7. Track: SOP pack signed

Admin Support KPIs:
• Inbox first-response time
• Task completion SLA %
• Calendar conflict rate

• ☐ Research complete (TAM + competition in research_data)
• ☐ Artifacts generated (module, landing, workflow, outreach, quality pack)
• ☐ Dynamic pricing quote valid for verticalSlug
• ☐ CRM pipeline and lead source defined
• ☐ Outreach draft reviewed before send (domain warmup)
• ☐ Smoke test / owner sign-off before client delivery

Discovery prompts to revisit: Which inboxes and tools must the VA own day-one?; What is the escalation path for VIP clients?; Where do SOPs live today?

Day 90 acceptance: ☐ SLA report ☐ cost review ☐ backlog prioritized ☐ no invented uptime claims

## Client-executable runbook & honesty

This custom deploy pack for Client is COMPLETE as a runbook — not a claim that Omni already configured DNS/SSL.

1. Download production-deploy manifest from Deliveries
2. Complete PENDING_CLIENT DNS/TLS steps at the registrar
3. Confirm backups + restore drill date in writing
4. Apply Admin Support compliance items: PII access limited to assigned VA roles; Client credential vault policy (no shared passwords in chat)
5. Open a support ticket with payment ID if any artifact is missing

Honesty boundaries:
• sslProvisioned / domainConfigured must remain false until client work is done
• External ads / Apollo / LinkedIn stay NOT CONNECTED unless separately wired
• Do not invent live lead or uptime metrics in handoff emails

Keywords: virtual assistant, admin support, data entry, executive assistant
Checklist: ☐ manifest downloaded ☐ PENDING items owned ☐ restore drill dated ☐ escalation path tested

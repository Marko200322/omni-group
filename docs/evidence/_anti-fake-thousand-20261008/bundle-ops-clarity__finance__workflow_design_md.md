# Workflow Design & SOP Pack

_Client — Finance_


## Problems this package addresses

Package workflow-design × industry finance — 10 concrete problems (target 5–10):

1. Finance processes live in people’s heads, not documented workflows
2. Slow cash collection and unclear payment status
3. Manual reconciliation eating analyst hours
4. Compliance friction delaying client onboarding
5. KYC/AML onboarding friction
6. Reconciliation that matches payment references
7. SOP gaps between roles
8. Role confusion on handoffs
9. KPIs not tied to automation
10. No process map PDF

These map to checkout OmniTrix claims and must appear in the delivered pack — not marketing-only copy.

## Process map overview

Client (Finance) end-to-end flow:
1. Client KYC packet → record
2. CRM onboarding ledger → create-contact
3. Quote + invoice → invoice
4. Reconcile payment → run
5. Notify unlock → send
6. Exception queue → create

Value proposition this workflow protects: End-to-end delivery for Finance: CRM, automations, lead gen, and AI support — no platform resale, only finished output.

Finance workflow nuances:
• Quote → KYC → invoice → reconcile → unlock → review
• No artifact release until reconciliation Pass or dual control
• Exception queue for unmatched references

RACI (default): Responsible = module operator; Accountable = client admin; Consulted = Omni fulfillment; Informed = finance on paid events.

## Process step 1: Client KYC packet

Action: record
Primary module: compliance
Owner role: Growth / ops lead
SLA: respond or advance stage within 4 business hours

Finance nuance:
• Quote → KYC → invoice → reconcile → unlock → review
• No artifact release until reconciliation Pass or dual control

SOP snippet:
1. Trigger condition documented in CRM or automation rule
2. Required inputs validated (contact, source, consent)
3. Execute record via compliance
4. Log outcome + next stage; escalate exceptions to human queue

Tools available in this vertical: billing, crm, compliance, notifications, automation
Domain tokens: KYC, AML, reconciliation

## Process step 2: CRM onboarding ledger

Action: create-contact
Primary module: crm
Owner role: Specialist + reviewer
SLA: respond or advance stage within 1 business day

Finance nuance:
• Quote → KYC → invoice → reconcile → unlock → review
• No artifact release until reconciliation Pass or dual control

SOP snippet:
1. Trigger condition documented in CRM or automation rule
2. Required inputs validated (contact, source, consent)
3. Execute create-contact via crm
4. Log outcome + next stage; escalate exceptions to human queue

Tools available in this vertical: billing, crm, compliance, notifications, automation
Domain tokens: KYC, AML, reconciliation

## Process step 3: Quote + invoice

Action: invoice
Primary module: billing
Owner role: Specialist + reviewer
SLA: respond or advance stage within 1 business day

Finance nuance:
• Quote → KYC → invoice → reconcile → unlock → review
• No artifact release until reconciliation Pass or dual control

SOP snippet:
1. Trigger condition documented in CRM or automation rule
2. Required inputs validated (contact, source, consent)
3. Execute invoice via billing
4. Log outcome + next stage; escalate exceptions to human queue

Tools available in this vertical: billing, crm, compliance, notifications, automation
Domain tokens: KYC, AML, reconciliation

## Process step 4: Reconcile payment

Action: run
Primary module: automation
Owner role: Specialist + reviewer
SLA: respond or advance stage within 1 business day

Finance nuance:
• Quote → KYC → invoice → reconcile → unlock → review
• No artifact release until reconciliation Pass or dual control

SOP snippet:
1. Trigger condition documented in CRM or automation rule
2. Required inputs validated (contact, source, consent)
3. Execute run via automation
4. Log outcome + next stage; escalate exceptions to human queue

Tools available in this vertical: billing, crm, compliance, notifications, automation
Domain tokens: KYC, AML, reconciliation

## Automations, KPIs & rollout checklist

Automations to enable after manual dry-run:
• Client KYC packet: auto-record with human override
• CRM onboarding ledger: auto-create-contact with human override
• Quote + invoice: auto-invoice with human override
• Reconcile payment: auto-run with human override
• Notify unlock: auto-send with human override
• Exception queue: auto-create with human override

Finance KPI set:
• Days sales outstanding (DSO)
• Reconciliation exception rate
• Payment confirm → artifact unlock latency
• KYC packet completion rate

Operational risks to watch:
• Bank transfers without unique payment references
• Reconciliation lag creates false “paid” states
• Same operator confirms payment and releases artifacts

Rollout checklist:
• ☐ Day 1: map stages in CRM
• ☐ Day 3: dry-run with sample lead
• ☐ Week 2: enable first automation
• ☐ Week 4: KPI review + SOP sign-off
• ☐ Milestone: Unique payment reference flow live
• ☐ Milestone: Dual-control confirm path documented
• ☐ Milestone: First reconciliation dry-run signed
• ☐ Gate: Research complete (TAM + competition in research_data)
• ☐ Gate: Artifacts generated (module, landing, workflow, outreach, quality pack)
• ☐ Gate: Dynamic pricing quote valid for verticalSlug
• ☐ Gate: CRM pipeline and lead source defined
• ☐ Gate: Outreach draft reviewed before send (domain warmup)
• ☐ Gate: Smoke test / owner sign-off before client delivery
• ☐ Gate: Segregation of duties documented
• ☐ Gate: Reconciliation dry-run signed
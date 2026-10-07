# Workflow Design & SOP Pack

_Client — AI & Data_


## Process map overview

Client (AI & Data) end-to-end flow:
1. Market discover → discover
2. AI memory seed → remember
3. Lead score → score
4. CRM → create-contact
5. Outreach → sequence
6. Analytics → track

Value proposition this workflow protects: End-to-end delivery for AI & Data: CRM, automations, lead gen, and AI support — no platform resale, only finished output.

AI & Data workflow nuances:
• Ingest → embed → retrieve → generate → review → ship

RACI (default): Responsible = module operator; Accountable = client admin; Consulted = Omni fulfillment; Informed = finance on paid events.

## Process step 1: Market discover

Action: discover
Primary module: client-hunter
Owner role: Growth / ops lead
SLA: respond or advance stage within 4 business hours

AI & Data nuance:
• Ingest → embed → retrieve → generate → review → ship

SOP snippet:
1. Trigger condition documented in CRM or automation rule
2. Required inputs validated (contact, source, consent)
3. Execute discover via client-hunter
4. Log outcome + next stage; escalate exceptions to human queue

Tools available in this vertical: ai-rag, craftor, client-hunter, crm, analytics
Domain tokens: model evaluation, RAG pipeline, data lineage

## Process step 2: AI memory seed

Action: remember
Primary module: ai-memory
Owner role: Specialist + reviewer
SLA: respond or advance stage within 1 business day

AI & Data nuance:
• Ingest → embed → retrieve → generate → review → ship

SOP snippet:
1. Trigger condition documented in CRM or automation rule
2. Required inputs validated (contact, source, consent)
3. Execute remember via ai-memory
4. Log outcome + next stage; escalate exceptions to human queue

Tools available in this vertical: ai-rag, craftor, client-hunter, crm, analytics
Domain tokens: model evaluation, RAG pipeline, data lineage

## Process step 3: Lead score

Action: score
Primary module: lead-scoring
Owner role: Specialist + reviewer
SLA: respond or advance stage within 1 business day

AI & Data nuance:
• Ingest → embed → retrieve → generate → review → ship

SOP snippet:
1. Trigger condition documented in CRM or automation rule
2. Required inputs validated (contact, source, consent)
3. Execute score via lead-scoring
4. Log outcome + next stage; escalate exceptions to human queue

Tools available in this vertical: ai-rag, craftor, client-hunter, crm, analytics
Domain tokens: model evaluation, RAG pipeline, data lineage

## Process step 4: CRM

Action: create-contact
Primary module: crm
Owner role: Specialist + reviewer
SLA: respond or advance stage within 1 business day

AI & Data nuance:
• Ingest → embed → retrieve → generate → review → ship

SOP snippet:
1. Trigger condition documented in CRM or automation rule
2. Required inputs validated (contact, source, consent)
3. Execute create-contact via crm
4. Log outcome + next stage; escalate exceptions to human queue

Tools available in this vertical: ai-rag, craftor, client-hunter, crm, analytics
Domain tokens: model evaluation, RAG pipeline, data lineage

## Automations, KPIs & rollout checklist

Automations to enable after manual dry-run:
• Market discover: auto-discover with human override
• AI memory seed: auto-remember with human override
• Lead score: auto-score with human override
• CRM: auto-create-contact with human override
• Outreach: auto-sequence with human override
• Analytics: auto-track with human override

AI & Data KPI set:
• Eval pass rate
• Hallucination / escalation rate
• RAG retrieval precision@k

Operational risks to watch:
• Hallucinations shipped without human review
• Stale embeddings after source updates
• Unclear ownership of model quality gates

Rollout checklist:
• ☐ Day 1: map stages in CRM
• ☐ Day 3: dry-run with sample lead
• ☐ Week 2: enable first automation
• ☐ Week 4: KPI review + SOP sign-off
• ☐ Milestone: Eval suite baseline
• ☐ Milestone: RAG corpus indexed
• ☐ Milestone: Human review queue live
• ☐ Gate: Research complete (TAM + competition in research_data)
• ☐ Gate: Artifacts generated (module, landing, workflow, outreach, quality pack)
• ☐ Gate: Dynamic pricing quote valid for verticalSlug
• ☐ Gate: CRM pipeline and lead source defined
• ☐ Gate: Outreach draft reviewed before send (domain warmup)
• ☐ Gate: Smoke test / owner sign-off before client delivery

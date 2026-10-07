# Technical & Digital Readiness Audit

_Client — AI & Data_


## Executive summary

Client operates in AI & Data (ai_data). This audit evaluates stack readiness, security posture, conversion funnel integrity, and operational automation maturity against AI & Data peer benchmarks.

AI & Data-specific audit lenses:
• Eval rigor
• Data lineage
• Human override coverage

Headline findings (deterministic baseline — refine with live discovery notes):
• Primary value thesis: End-to-end delivery for AI & Data: CRM, automations, lead gen, and AI support — no platform resale, only finished output.
• Recommended core modules: ai-rag, craftor, client-hunter, crm, analytics
• Top research lenses: LLM adoption SMB; data pipeline demand; AI automation ROI
• Domain tokens in scope: model evaluation, RAG pipeline, data lineage, prompt governance
• 90-day outcome target: portal live, CRM pipeline seeded, first automation closed-loop, measurable lead response SLA

Risk posture (preliminary) for AI & Data: Medium until auth, backup, and payment-confirm paths are evidence-checked. Priority risks:
• Hallucinations shipped without human review
• Stale embeddings after source updates
• Unclear ownership of model quality gates

## Current state assessment

Industry focus areas for AI & Data:
• LLM adoption SMB — score current maturity (1–5) and evidence location
• data pipeline demand — score current maturity (1–5) and evidence location
• AI automation ROI — score current maturity (1–5) and evidence location
• RAG use cases — score current maturity (1–5) and evidence location

Capability scorecard (fill during kickoff):
• Identity & access (SSO/MFA, admin least-privilege)
• CRM hygiene (stages, owners, SLA clocks)
• Outbound/inbound attribution
• Billing / fulfillment handoff reliability
• Content & SEO basics for acquisition pages
• Eval rigor — evidence note
• Data lineage — evidence note

Quality gates used as acceptance bar:
• Research complete (TAM + competition in research_data)
• Artifacts generated (module, landing, workflow, outreach, quality pack)
• Dynamic pricing quote valid for verticalSlug
• CRM pipeline and lead source defined
• Outreach draft reviewed before send (domain warmup)
• Smoke test / owner sign-off before client delivery

## Security & compliance

Checklist for AI & Data — mark each item Pass / Fail / N/A with evidence:
1. TLS everywhere (no mixed content); HSTS where applicable
2. Secrets not in client bundles; rotation cadence documented
3. Auth: password reset, session expiry, role separation for admin vs client
4. Backup: encrypted at rest, restore drill within last 90 days
5. Audit log for payment confirm and privilege changes
6. Rate limits / abuse controls on public forms and APIs
7. Dependency and image patch policy for production hosts
8. Training/eval data provenance recorded
9. PII redaction before model context
10. Prompt/version change log retained

Milestone: complete this checklist before any production DNS cutover (Phase 1).

## Recommended stack & integrations

For Client in AI & Data, prioritize:
• Modules: ai-rag, craftor, client-hunter, crm, analytics
• Primary offers: Custom integration (€5919); Vertical solution (€2350); AI support retainer (€2052); Workflow design (€2945)
• Keywords / positioning: artificial intelligence, machine learning, data science, LLM, ai & data, ai data
• Version prompts + retrieval configs with deploy tags
• Log every AI decision with input hash (no raw PII)

Integration order (avoid big-bang):
1. Portal auth + notifications
2. CRM pipeline + lead source tags
3. Payment confirm → fulfillment webhook
4. Outreach / follow-up only after CRM stages are stable

## 90-day roadmap

Phase 1 — Days 1–30 (foundations)
• Kickoff + access inventory
• Portal/auth smoke tests
• Security checklist baseline (AI & Data compliance items)
• Eval suite baseline

Phase 2 — Days 31–60 (revenue path)
• Market discover: discover (client-hunter)
• AI memory seed: remember (ai-memory)
• Lead score: score (lead-scoring)
• CRM: create-contact (crm)

Phase 3 — Days 61–90 (scale & measure)
• Outreach: sequence
• Analytics: track
• KPI review (AI & Data): Eval pass rate; Hallucination / escalation rate; RAG retrieval precision@k
• Acceptance: owner sign-off against quality gates

Milestones:
1. M1 Go-live checklist green
2. M2 First closed automation loop
3. M3 ROI dashboard reviewed with client
4. M4 Eval suite baseline
5. M5 RAG corpus indexed
6. M6 Human review queue live

## ROI estimate & acceptance checklist

Conservative model for AI & Data assumes 15–25% operational improvement and reduced admin hours from automation within 90 days. Track weekly KPIs:
• Eval pass rate
• Hallucination / escalation rate
• RAG retrieval precision@k

Acceptance checklist (purchase justification):
• ☐ Executive summary names client + AI & Data
• ☐ Security checklist completed with evidence notes
• ☐ Industry compliance items covered: model evaluation, RAG pipeline, data lineage
• ☐ Stack recommendations map to activated modules
• ☐ 90-day roadmap has dated phases + milestones
• ☐ ROI metrics owners assigned
• ☐ Outreach hooks validated: AI agent for your niche | RAG over client documentation

## Discovery agenda & evidence requests

Kickoff discovery for Client (AI & Data) — capture answers with owner + evidence links:
1. Which workflows need human-in-the-loop vs auto?
2. What is the source-of-truth corpus?
3. How are model failures detected today?

Evidence pack to attach before Phase 2:
• Current CRM export or stage screenshot
• Auth / admin role matrix (who can confirm payments)
• Public site URL + analytics property IDs (if any)
• Domain risk notes for: Hallucinations shipped without human review; Stale embeddings after source updates
• Sales pains to validate: AI demos that fail in production; No eval harness; Data quality blocking automation

Milestone: discovery notes filed in kickoff ticket within 5 business days.

## Competitive & positioning notes

AI & Data positioning for Client against peer SMB benchmarks:
• Value thesis: End-to-end delivery for AI & Data: CRM, automations, lead gen, and AI support — no platform resale, only finished output.
• Keywords to own: artificial intelligence, machine learning, data science, LLM, ai & data, ai data
• Outreach hooks: AI agent for your niche; RAG over client documentation; Automated research and reporting
• Distinctive tokens to keep in client copy: model evaluation, RAG pipeline, data lineage, prompt governance, hallucination rate

Competitive checklist:
• ☐ List 3 local/regional peers and their primary CTA
• ☐ Note pricing transparency (menu / package / quote-only)
• ☐ Capture review volume + response SLA on Google/Facebook if present
• ☐ Map peer gaps to AI & Data lenses: Eval rigor; Data lineage; Human override coverage

Acceptance: positioning one-pager reviewed with owner before paid ads or outbound.

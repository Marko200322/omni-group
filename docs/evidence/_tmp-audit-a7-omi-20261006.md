# A7 OMI/AI — [OMI](7869f26b-0b35-4e87-a744-60d35219caf5)

**Classification: D — Real AI + Omni data** (not E)

## Evidence
- Browser → Next BFF → Atina avatar → `completeOmiLlmTurn` → `AiClient.chatCompletions`
- Omni data = static deliverable catalog + recommend + sanitized pageContext; NOT live orders/invoices/projects
- Security: injection hard-rules, CSRF, Redis budgets (~$5/day default), rate limits, handoff to CRM
- Gaps: no agent tools; greeting overpromises portal account data; degraded fallback if AI unconfigured

## Not E because
No live per-customer billing/project reads; no executable tools in chat loop.

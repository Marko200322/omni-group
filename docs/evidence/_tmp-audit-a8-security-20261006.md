# A8 Security — [Security](354d2df9-bc0a-46ef-81b9-c715805c45bd)

## Critical
1. Recall webhook accepts traffic when secret unset
2. Stolen admin JWT/API key on `api.*` bypasses Next CSRF → autonomy/outreach mutations

## High
- API keys always mapped to orgRole `owner`
- SESSION_SECRET compromise = full takeover (tokens in cookie)
- Autonomy GETs / Outreach send without requireAdmin on direct API
- Local `.env.vps.*` on disk (gitignored)

## Positive
CSRF on BFF, invoice IDOR filters, shop reprice, Stripe constructEvent when secret set, admin BFF gates.

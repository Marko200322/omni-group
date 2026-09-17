# Omni Double-Agent Outreach Engine — Vodič za podešavanje

Autonomni B2B skaut + pravni supervizor za **Omni Group Tech**, namenjen self-hosted n8n-u.

Podrazumevani režim je **samo draft/audit** (`OUTREACH_ENABLED=false`). Ne uključuj live slanje dok legal/ops ne potvrde. Auto-postovanje na Reddit/HN krši većinu ToS-a — ovaj tok pronalazi javno indeksirane postove i stavlja u red **odobrena draft** poruke (ili email na review inbox).

## Šta dobijaš

| Fajl | Uloga |
|------|--------|
| `src/system-prompts.ts` | Promptovi za Agent 1 + Agent 2 + JSON šeme |
| `src/guardrail-validator.ts` | Determinističke provere činjenica / cena / SLA |
| `src/fallback-truth.ts` | Offline katalog (17 paketa) |
| `data/fixtures/sample-lead.json` | Fixture lead za lokalni dry-run bez Tavily |
| `n8n-production-workflow.json` | Workflow spreman za import u n8n |
| `docker-compose.n8n.yml` | n8n + povezivanje env varijabli |
| `.env.example` | Env šablon (stub + live sekcije) |

Prodajni SKU-ovi su **17 deliverable paketa** (npr. `integration`, `setup-quick`). Moduli (Atina/Astra/Titan) su samo kontekst pozicioniranja.

---

## A) Lokalni stub režim (bez Tavily / OpenAI / Resend)

Koristi ovo dok nemaš live ključeve ili dok testiraš guardrails.

### 1. Env

```bash
cd tools/outreach-engine
cp .env.example .env
```

U `.env` ostavi:

```env
OUTREACH_STUB_MODE=true
OUTREACH_ENABLED=false
OUTREACH_MODE=draft
TAVILY_API_KEY=
OPENAI_API_KEY=
RESEND_API_KEY=
CHECKOUT_BASE_URL=https://omnigrouptech.com/pricing
MY_WEBSITE_API_URL=https://omnigrouptech.com
ATINA_API_URL=https://api.omnigrouptech.com
# ili lokalni Atina: ATINA_API_URL=http://127.0.0.1:3000
```

### 2. Guardrail testovi (bez n8n)

```bash
npm install
npm run test:guardrails
npm run check
npm run validate-draft
```

`validate-draft` proverava otrovan draft protiv `fallback-truth` (očekuje REJECT).

### 3. Fixture lead

`data/fixtures/sample-lead.json` — jedan B2B lead o API/integrations. U n8n:

1. Importuj workflow, ostavi **Inactive**
2. Cron → **Manual** / Test workflow
3. Privremeno **disable** Tavily node ili zameni Code node-om koji radi `return [{ json: require('./data/fixtures/sample-lead.json') }]` (zalepi sadržaj fixture-a)
4. Deliverables API: ako padne, normalize već ima **fallback katalog**
5. Agent1/Agent2: za pun stub bez OpenAI, privremeno Code nodovi sa fiksnim JSON-om (Scout → `integration`, Supervisor → `APPROVED`) — ili preskoči i radi samo `npm run test:guardrails`

### 4. Šta stub **ne** radi

- Ne traži Tavily / OpenAI / Resend
- Ne šalje email (`OUTREACH_ENABLED=false`)
- Ne spaja Slack/Lusha — to je platforma, ne ovaj paket

---

## B) Self-host n8n (kad imaš ključeve)

### 1. Preduslovi

- Docker + Docker Compose
- Ključevi: Tavily, OpenAI (Agent 1+2), opciono Resend
- Omni API-ji (live ili lokal):
  - `{ATINA_API_URL}/api/v1/billing/deliverables`
  - `{MY_WEBSITE_API_URL}/api/atina/billing/industry-catalog` (opciono)

### 2. Env (live sekcija)

```env
OUTREACH_STUB_MODE=false
OUTREACH_ENABLED=false
OUTREACH_MODE=draft
TAVILY_API_KEY=tvly-...
OPENAI_API_KEY=sk-...
CHECKOUT_BASE_URL=https://omnigrouptech.com/pricing
DISPATCH_FROM_EMAIL=outreach@omnigrouptech.com
DISPATCH_REVIEW_INBOX=you@omnigrouptech.com
N8N_ENCRYPTION_KEY=<openssl rand -hex 32>
N8N_BASIC_AUTH_PASSWORD=<jaka-lozinka>
WEBHOOK_URL=http://localhost:5678/
```

### 3. Docker

```bash
cd tools/outreach-engine
docker compose -f docker-compose.n8n.yml --env-file .env up -d
```

Otvori `http://localhost:5678` → basic auth.

### 4. Credentials u n8n

**Ne** lepi ključeve u JSON nodova.

1. **OpenAI Header Auth** — `Authorization: Bearer <OPENAI_API_KEY>`
2. **Resend Header Auth** — samo za email mode

### 5. Import

1. Workflows → Import → `n8n-production-workflow.json`
2. Remap credentials → ostavi **Inactive** dok dry-run ne prođe

```
Cron → Env → Tavily → Deliverables API → PII normalizacija
  → Split → Delay → Agent1 → score → Agent2 → Guardrail
       ├─ APPROVED → (email samo ako OUTREACH_ENABLED) → Audit
       └─ REJECT → Reject log
```

### 6. Dry-run checklist

1. Manual trigger + jedan lead (Tavily ili fixture)
2. Agent1 → poznat `recommendedPackageId` iz kataloga
3. Agent2 + Guardrail → APPROVED / REWRITTEN
4. Otrovan draft (`money-back` + `buy.stripe.com`) → REJECTED
5. Audit u `data/` ili n8n executions
6. Tek onda `OUTREACH_MODE=email` + `DISPATCH_REVIEW_INBOX` (ne cold public)

---

## Plaćanja / MoR

- Agenti **nikad** ne izmišljaju Stripe/Paddle/IBAN linkove
- Zvanično: `https://omnigrouptech.com/pricing?package=<deliverableId>`
- Guardrail odbija checkout čiji origin ≠ `CHECKOUT_BASE_URL`

## Security checklist

- [ ] Nema API ključeva u workflow JSON-u
- [ ] Basic auth + encryption key
- [ ] `OUTREACH_ENABLED=false` dok nije odobreno
- [ ] PII redakcija pre LLM
- [ ] Nema auto-posta na Reddit/HN

## Ops

- Cron default **20 min**; delay **240–1080s** po leadu
- Fallback katalog: `src/fallback-truth.ts` + inline u normalize nodu
- Live platforma (Snov/Instantly/Slack) je odvojena — ovde samo draft engine

## Linkovi

- Pricing: https://omnigrouptech.com/pricing  
- Terms: https://omnigrouptech.com/legal/terms  
- Refund: https://omnigrouptech.com/legal/refund  

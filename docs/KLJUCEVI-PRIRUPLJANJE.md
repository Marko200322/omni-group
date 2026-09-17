# Prikupljanje ključeva — brzi vodič

**Glavni fajl (popuni ovde):** [`atina-platform/atina/KLJUCEVI-POPUNI.local.txt`](../atina-platform/atina/KLJUCEVI-POPUNI.local.txt)

**Prod deploy (već delimično popunjeno):** `deploy-secrets.local/deploy.config.json` — Resend, OpenRouter, ElevenLabs, IBAN.

**Posle popune:**

```powershell
.\scripts\apply-integration-keys.ps1
.\scripts\deploy-from-local-secrets.ps1
```

---

## Prioritet M0–M1 (novac + leadovi)

| Prioritet | Ključ | Gde nabaviti | ~Trošak/mes |
|-----------|-------|--------------|-------------|
| P0 | DNS `api.omnigrouptech.com` | Registrar (A → `5.189.184.103`) | €0 (domen već imaš) |
| P1 | `RESEND_API_KEY` | [resend.com](https://resend.com) → API Keys | €0 (free tier) |
| P1 | `CONTACT_EMAIL_FROM/TO` | Resend → verifikuj `omnigrouptech.com` | €0 |
| P2 | `CONTACT_CRM_INGRESS_EMAIL/PASSWORD` | Tvoj admin na prod | €0 |
| P3 | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | @BotFather | €0 |
| P3 | `SLACK_WEBHOOK_URL` | Slack → Incoming Webhook | €0 |
| P4 | `AI_KEY` / `OPENROUTER_API_KEY` | [openrouter.ai](https://openrouter.ai/keys) | €5–30 |
| P5 | `ELEVENLABS_API_KEY` | [elevenlabs.io](https://elevenlabs.io) | €0–22 |

**Ne treba odmah:** Stripe, HeyGen, D-ID, Apollo/Hunter (M4), scraper (M2).

---

## External AI stack (M4/M5) — ključevi + svrha

Popuni u `KLJUCEVI-POPUNI.local.txt` sekciju **11. EXTERNAL AI STACK**, pa:

```powershell
.\scripts\apply-integration-keys.ps1
```

| Sektor | Alati | Env | ~€/mes | Faza |
|--------|-------|-----|--------|------|
| Prodaja & Lead Gen | Clay, Salesforge | `CLAY_API_KEY`, `SALESFORGE_API_KEY` | 200–400 | M4 |
| Podrška | Intercom / Sierra | `INTERCOM_API_KEY`, `SIERRA_API_KEY` | 100–300 | M4 |
| Automatizacija | Make / n8n | `MAKE_*` / `N8N_*` (+ webhook/URL) | 20–100 | M4 |
| Finansije | Ramp / Vic.ai | `RAMP_API_KEY`, `VIC_AI_API_KEY` | 100–250 | M5 |
| Marketing | Jasper / Predis | `JASPER_API_KEY`, `PREDIS_API_KEY` | 60–150 | M5 |
| Kodiranje | Devin / Replit Agent | `DEVIN_API_KEY`, `REPLIT_AGENT_API_KEY` | 100–500 | M5 |
| Video/glas | HeyGen / ElevenLabs | već postoji | 50–150 | M4/M6 |
| Agenti | CrewAI / LangChain | `CREWAI_*`, `LANGCHAIN_*` | 30–100 | M5 |

**Ukupno:** ops ~€500–1200 + izvršni ~€200–800 — nije obavezno sve odjednom; status bez curenja tajni: `GET /api/v1/billing/factory-phase/status` → `externalAiStack`.

---

## Mapa: fajl → env

| Ključ u KLJUCEVI | Ide u |
|------------------|--------|
| HEYGEN, DID, SLACK, STRIPE | `atina-platform/atina/.env` via `apply-integration-keys.ps1` |
| RESEND, CRM ingress, Slack contact | `deploy.config.json` + web `.env.local` / prod env |
| TELEGRAM, AI_KEY | Atina `.env` + deploy |

---

## Bezbednost

- **NE commituj** `KLJUCEVI-POPUNI.local.txt` ni `deploy-secrets.local/`
- Ako si slučajno podelio ključ — rotiraj u dashboard-u provajdera

# STATUS-KANON — jedna lista za ceo projekat

**Datum:** 2026-09-17 (P1 zatvoren 19:57)  
**Pravilo vlasnika:** firma + Stripe **live** + PayPal/Wise/Kriptoman = **P2 (NA KRAJU)**. Sve ostalo ispod.

**Održavanje:** posle svake sesije ažuriraj ovaj fajl + pokreni `.\scripts\audit-empty-keys.ps1` + `.\scripts\audit-prod-autonomous.ps1`.

**Indeks (ne dupliraj stavke drugde):**

| Dokument | Uloga |
|----------|--------|
| **Ovaj fajl** | Jedina lista stavki P0–P3 + LIVE |
| [`generated/EMPTY-KEYS.md`](./generated/EMPTY-KEYS.md) | Auto: prazni vs popunjeni ključevi |
| [`ADMIN-JEDNA-LISTA.md`](./ADMIN-JEDNA-LISTA.md) | Kratki admin pregled → link ovde |
| [`REPO-STATUS-NOW.md`](./REPO-STATUS-NOW.md) | Snapshot LIVE slojeva |
| [`OMNI-PHASE-1-8-STATUS.md`](./OMNI-PHASE-1-8-STATUS.md) | Problem Hunter tehnički backlog |
| [`FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md) | F4 product backlog |
| [`FAZA-6-BACKLOG.md`](./FAZA-6-BACKLOG.md) | K8s / Faza 6 epic |

**Status vrednosti:** `DONE` · `READY` · `TI` · `BLOCKED` · `DEFERRED` · `CANCELLED` · `N/A`

---

## LIVE — potvrđeno (ne diraj)

| ID | Šta | Dokaz |
|----|-----|-------|
| LIVE-01 | Site + API · M6 · full · €250 | https://omnigrouptech.com |
| LIVE-02 | Fulfillment **850/850** | `docs/evidence/fulfillment-matrix-prod-m6-20260902.csv` |
| LIVE-03 | Stripe **TEST** + prices + webhook | prod VPS |
| LIVE-04 | Instantly + Resend + Hunter + OpenRouter + Apify | SET |
| LIVE-05 | Apollo · NeverBounce · ZeroBounce · Snov · D-ID · HeyGen · Cartesia | SET |
| LIVE-06 | SMTP enabled · invoice PDF path | Resend attach + SMTP fallback |
| LIVE-07 | Zoom **join URL** (support/sales/marketing) | KLJUCEVI sekcija 10 |
| LIVE-08 | GitHub `main` protection · VPS backup | DONE |
| LIVE-09 | Rollback owner | [`ROLLBACK-OWNER.md`](./ROLLBACK-OWNER.md) · Marko Kosic |
| LIVE-10 | Email DNS: Resend DKIM + SPF na `send.` | SET |
| LIVE-11 | n8n outreach stub + guardrails | PASS, **nije live send** |
| LIVE-12 | Legal stranice u kodu | terms/privacy/refund/impressum/cookies |
| LIVE-13 | Redizajn UI | **CANCELLED** — vidi P3-C01 |

---

## P0 — Pre „sve spremno“ (ti: DNS / UI / E2E)

| ID | Stavka | Status | Owner | Blokira | Runbook / skripta |
|----|--------|--------|-------|---------|-------------------|
| P0-01 | **DMARC** TXT u Spaceship | DONE | Agent | cold outbound | Spaceship API 2026-09-20 · `_dmarc` TXT verified |
| P0-02 | Resend Domains → **Verify** (send-only) | DONE | Agent | email deliverability | API: receiving disabled; DKIM+SPF DNS OK; sending enabled |
| P0-03 | Instantly warmup + env flag | DONE | Agent | cold outbound | `warmupComplete=true` na prod; Instantly nalog **expired** (402) — upgrade plan pre stvarnog cold send-a |
| P0-04 | **Slack** webhook — kontakt form | DONE | Agent | notify | SET + deploy 2026-09-20 · webhook test OK |
| P0-05 | **Slack** webhook — ops (uplate/fulfillment) | DONE | Agent | notify | SET + deploy 2026-09-20 · webhook test OK |
| P0-06 | **Mystery shopper** + 1 Confirm → PDF u inboxu | DONE | Agent | invoice E2E dokaz | Gmail IMAP: `INV-202609-0879.pdf` + fulfillment 2026-09-17 |
| P0-07 | **Legal counsel** sign-off | TI | Ti | formalni go-live | stranice već u kodu |

**P0 progress:** 6 / 7 DONE (preostaje P0-07 legal)

---

## P1 — Deploy queue (agent zatvorio)

| ID | Stavka | Status | Owner | Blokira | Napomena |
|----|--------|--------|-------|---------|----------|
| P1-01 | Paketi × industrije (`package-industry-problems`) | DONE | JA | — | commit `c9f32d9` |
| P1-02 | Maintenance tier-i + Stripe checkout linija | DONE | JA | — | testovi prolaze |
| P1-03 | BFF `package-context` + `DeliverableQuotePanel` | DONE | JA | — | prod 2026-09-17 |
| P1-04 | `InvoiceHistoryPanel` + BFF `/billing/invoices` | DONE | JA | — | prod 2026-09-17 |
| P1-05 | **Problem Hunter** modul (API MVP) | DONE | JA | — | `/api/v1/problem-hunter/*` |
| P1-06 | Migracija **`037_problem_hunter.sql`** na prod VPS | DONE | JA | — | applied 2026-09-17 17:56 UTC |
| P1-07 | **Git commit + push** svih P1 izmena | DONE | JA | — | `c9f32d9` → origin |
| P1-08 | **Deploy** na prod | DONE | JA | — | SafeDeploy + migrate rebuild |

**P1 progress:** 8 / 8 DONE

**Dashboard:** https://omnigrouptech.com/dev/status (admin login)

---

## P2 — NA KRAJU (posle P0 + P1)

| ID | Stavka | Status | Owner | Napomena |
|----|--------|--------|-------|----------|
| P2-01 | LLC / firma — `companyLegalName`, TaxId, Address | DEFERRED | Ti | deploy.config prazno |
| P2-02 | Stripe **LIVE** + kartica smoke | DEFERRED | Ti | test SET |
| P2-03 | PayPal API | DEFERRED | Ti | ključevi prazni |
| P2-04 | Wise API | DEFERRED | Ti | ključevi prazni |
| P2-05 | Kriptoman API | DEFERRED | Ti | ključevi prazni |
| P2-06 | `FINANCE_URL` aggregator | N/A | — | namerno prazan |

**Redosled P2:** P2-01 → P2-02 → P2-03..05

---

## P3 — Opciono / kasnije

### P3-A · Enrich / outbound (ključevi)

| ID | Stavka | Status | Kada |
|----|--------|--------|------|
| P3-A01 | `LUSHA_API_KEY` | DEFERRED | enrich telefon |
| P3-A02 | `TAVILY_API_KEY` | DEFERRED | Problem Hunter web_search + n8n |
| P3-A03 | `ZOOMINFO_API_KEY` | DEFERRED | lead baze |
| P3-A04 | Cold outbound send **ON** | BLOCKED | posle P0-01, P0-03 |
| P3-A05 | Live **n8n** workflow import | DEFERRED | `tools/outreach-engine/` |
| P3-A06 | Ads budžet €200–300 | DEFERRED | marketing odluka |

### P3-B · Integracije (M4/M5+ external AI stack)

Clay · Salesforge · Intercom · Sierra · Make · n8n API · Ramp · Vic.ai · Jasper · Predis · Devin · Replit Agent · CrewAI · LangChain — svi **DEFERRED**. Puna lista EMPTY: [`generated/EMPTY-KEYS.md`](./generated/EMPTY-KEYS.md).

### P3-C · Video / avatar advanced

| ID | Stavka | Status |
|----|--------|--------|
| P3-C01 | Zoom OAuth API (`ZOOM_ACCOUNT_ID`…) | DEFERRED — join linkovi već rade |
| P3-C02 | Live call avatar (Recall, HeyGen Live, Deepgram…) | DEFERRED |

### P3-D · Infra / ops

| ID | Stavka | Status |
|----|--------|--------|
| P3-D01 | Staging VPS | DEFERRED |
| P3-D02 | UptimeRobot monitoring | DEFERRED |
| P3-D03 | Plausible analytics | DEFERRED |
| P3-D04 | GitHub CI **required checks** na `main` | DEFERRED — branch protection DONE |
| P3-D05 | DMARC `p=quarantine` (posle monitor faze) | DEFERRED |
| P3-D06 | Nest TypeORM prod | **N/A** — Nest nije u live Docker |

### P3-E · Product backlog (detalji u linked docovima)

| ID | Stavka | Status | Doc |
|----|--------|--------|-----|
| P3-E01 | Problem Hunter cross-source dedup (Faza 7) | DONE | company+category + text prefix · 2026-09-17 |
| P3-E02 | F4-6 AI / email / upload proširenja | DEFERRED | [`FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md) |
| P3-E03 | Faza 6 K8s / observability / vector DB / GPU | DEFERRED | [`FAZA-6-BACKLOG.md`](./FAZA-6-BACKLOG.md) |
| P3-E04 | Nivo 3 vision / PDF aligned review | DEFERRED | [`NIVO-3-MASTER-CHECKLIST.md`](../NIVO-3-MASTER-CHECKLIST.md) |
| P3-E05 | YouTube/Celery pipeline prod ključevi | DEFERRED | [`tools/youtube-pipeline/RUNBOOK.md`](../tools/youtube-pipeline/RUNBOOK.md) |
| P3-E06 | Ručno odobrenje cena (ako ≠ M6 anchor) | DEFERRED | `GET /api/v1/billing/catalog-quality` |

### P3-F · Repo higijena

| ID | Stavka | Status |
|----|--------|--------|
| P3-F01 | Obriši `scripts/_tmp_nb_profile*` (temp) | DONE | 2026-09-17 |
| P3-F02 | Disk C: ≥5 GB za pun [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md); **`apps/omnigroup-web`** osim **`-SkipOmnigroupWeb`**; posle servisa **`npm run smoke:all`**) | DEFERRED — lokalno |
| P3-F03 | CEO checklist zastareli `[ ]` → uskladiti | DONE | kanon banner u CHECKLIST-CEO · 2026-09-17 |

### P3-G · Otkazano

| ID | Stavka | Status | Napomena |
|----|--------|--------|----------|
| P3-G01 | **Redizajn UI** (GPT slike, preview) | **CANCELLED** | folder obrisan 2026-09-17 |

---

## Safety locks (namerno OFF)

| Lock | Vrednost |
|------|----------|
| Stripe mode | **test** |
| Cold outbound send | **OFF** (`OUTREACH_SEND_ENABLED=false` na prod) |
| `factoryPhaseAuto` | **false** |
| `AUTONOMY_AUTO_DEPLOY` | **false** |
| `PHASE` | **v2** (ne K8s) |
| Lead rollout | **F3** (F5 ne forsirati) |

---

## Brzi redosled rada

```
P1 DONE (2026-09-17)  →  P0 (ti: DNS/UI/E2E inbox)  →  P2 (firma + live plaćanja)
P3 — paralelno, po potrebi, nikad ne blokira prod
```

**Engineering audit:** Phases 1–9 → `docs/engineering/master-audit.md` (fix faza tek posle odobrenja).

---

## Napomena: CHECKLIST-CEO-SISTEM.md

Istorijski checkboxi mogu biti zastareli. **Kanonski status = ovaj fajl.**

| CEO stavka | Kanonski status |
|------------|-----------------|
| Rollback owner | **DONE** → LIVE-09 |
| Stripe/PayPal/Wise live | **P2** |
| GitHub prv push / Resend lokal / agregatori | verovatno **DONE** na prod — proveri pre `[x]` |
| Staging deploy | **P3-D01** |

---

*Poslednja izmena: 2026-09-17 — inicijalni STATUS-KANON.*

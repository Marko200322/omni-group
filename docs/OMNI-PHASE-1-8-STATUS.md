# Omni Master Prompt — Faze 1–8 status

**Datum:** 2026-09-17  
**Kanonska lista:** [`STATUS-KANON.md`](./STATUS-KANON.md)  
**Pravilo:** firma / Stripe live / payment API = **P2 NA KRAJU**.

## Faza 1 — Repository audit

**COMPLETE** — vidi audit u chat + `REPO-STATUS-NOW.md`.

## Faza 2 — Architecture

**COMPLETE** — Problem Hunter = novi modul `problem-hunter` (proširenje Client Hunter-a, bez duplikata).

## Faza 3 — Data models

**COMPLETE** — migracija `037_problem_hunter.sql`:
- `problem_hunter_sources`
- `problem_hunter_companies`
- `problem_hunter_signals`
- `problem_hunter_search_runs`
- `problem_hunter_search_cache`

**TI:** pokreni migracije na prod VPS pre korišćenja API-ja.

## Faza 4 — Source connector framework

**COMPLETE**
- `lib/source-connectors/types.ts`
- `manual_import` (enabled)
- `web_search` (Tavily kad je `TAVILY_API_KEY` SET)
- `registry.ts`

## Faza 5 — Problem Hunter MVP

**COMPLETE** (code)
- `POST /api/v1/problem-hunter/search/run` (admin)
- `GET /api/v1/problem-hunter/signals`
- `GET /api/v1/problem-hunter/status`

**TI:** Tavily key + migracija + deploy.

## Faza 6 — Normalization + evidence

**COMPLETE**
- `problem-normalizer.ts` — FACT / INFERENCE / UNKNOWN polja

## Faza 7 — Company resolution + dedup

**PARTIAL**
- `company-resolver.ts` + `identity_hash` unique per user
- **MISSING:** cross-source duplicate signal merge (duplicate_of column ready)

## Faza 8 — Lead scoring sa objašnjenjem

**COMPLETE**
- `signal-scoring-engine.ts` — score 0–100 + `reasons[]`
- Per-signal na insert; legacy `lead-scoring` ecosystem modul ne diran

## Katalog i cene (M6)

**COMPLETE** (backend + frontend sync)
- Cene usklađene sa kvalitetom (retaineri + integration)
- `GET /api/v1/billing/catalog-quality` (admin)
- `package-maintenance-tiers.ts` — Essential/Pro/Premium/Enterprise metadata

## Akcije — mapirano na STATUS-KANON

| Kanon ID | Šta |
|----------|-----|
| P1-05..06 | Deploy + migracija `037` |
| P3-A02 | Tavily → `TAVILY_API_KEY` |
| P0-01..07 | DMARC, Resend, Instantly, Slack, mystery shopper, legal |
| P2-01..05 | Firma, Stripe live, PayPal/Wise/Kriptoman |
| P3-E06 | Ručno odobrenje cena (`/billing/catalog-quality`) |

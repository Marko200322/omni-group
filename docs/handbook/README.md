# Omni Group — Priručnik projekta (handbook)

**Verzija:** 2026-11-03 · **Jezik:** srpski (latinica) · **Obim:** ceo monorepo (`/`)

Ovo je kompletna, tematski uređena dokumentacija projekta Omni Group. Postojeći dokumenti u `docs/` su pretežno *operativni* (checkliste, evidencije, Talas dnevnici); priručnik ih **ne zamenjuje**, već daje stabilan, čitljiv pregled sistema i poslovnog modela — ono što novi član tima, vlasnik ili agent treba da pročita pre nego što krene u `NIVO-*` checkliste.

> Pravilo: kad kod i priručnik odstupaju, **kod je izvor istine**. Svako poglavlje citira tačne putanje fajlova, pa se razlika lako proveri i ispravi.

## Sadržaj

| # | Dokument | Za koga | Šta odgovara |
|---|----------|---------|--------------|
| 01 | [`01-PREGLED-PROJEKTA.md`](./01-PREGLED-PROJEKTA.md) | svi | Šta je Omni Group, koje komponente postoje, rečnik pojmova (Atina ≠ atina ≠ atina-system) |
| 02 | [`02-ARHITEKTURA.md`](./02-ARHITEKTURA.md) | inženjeri | Kako komponente komuniciraju, portovi, baze, topologija u produkciji |
| 03 | [`03-PYTHON-FORGE-ASTRA.md`](./03-PYTHON-FORGE-ASTRA.md) | inženjeri | Python sloj: Forge petlja, Atina worker, Astra Flask, SQLite vault |
| 04 | [`04-ATINA-EXPRESS-SAAS.md`](./04-ATINA-EXPRESS-SAAS.md) | inženjeri | Glavni SaaS (Express/TypeScript): moduli, auth, billing, fulfillment, poslovi u pozadini |
| 05 | [`05-ATINA-SYSTEM-NEST.md`](./05-ATINA-SYSTEM-NEST.md) | inženjeri | NestJS API: entiteti, migracija, cron, `verify:ci` |
| 06 | [`06-OMNIGROUP-WEB.md`](./06-OMNIGROUP-WEB.md) | inženjeri, marketing | Next.js sajt + dashboard: stranice, BFF rute, sesija, katalozi cena |
| 07 | [`07-ALATI-YOUTUBE-NAPLATA.md`](./07-ALATI-YOUTUBE-NAPLATA.md) | inženjeri | YouTube/Celery pipeline i `sistem_naplate` skripte |
| 08 | [`08-API-REFERENCA.md`](./08-API-REFERENCA.md) | inženjeri, integratori | Svi HTTP interfejsi: 61 modul / 348 ruta Express, Nest, Flask, Next BFF, pipeline |
| 09 | [`09-MODEL-PODATAKA.md`](./09-MODEL-PODATAKA.md) | inženjeri | Postgres šeme (33 migracije), Nest entiteti, SQLite vault tabele |
| 10 | [`10-KONFIGURACIJA-I-ENV.md`](./10-KONFIGURACIJA-I-ENV.md) | inženjeri, ops | Env promenljive po komponenti, `env-aggregator.json`, tajne |
| 11 | [`11-RAZVOJ-I-TESTIRANJE.md`](./11-RAZVOJ-I-TESTIRANJE.md) | inženjeri, agenti | Lokalni start, Cloud Agent okruženje, testovi, CI, doc-gate pravila |
| 12 | [`12-DEPLOY-I-OPERACIJE.md`](./12-DEPLOY-I-OPERACIJE.md) | ops | Docker compose produkcija, Caddy, K8s, observability, backup |
| 13 | [`13-POSLOVNI-MODEL-I-PAKETI.md`](./13-POSLOVNI-MODEL-I-PAKETI.md) | vlasnik, prodaja | Šta se prodaje: 25 isporuka, planovi, motor cena, naplata, fulfillment |
| 14 | [`14-ANALIZA-TRZISTA-2026.md`](./14-ANALIZA-TRZISTA-2026.md) | vlasnik, prodaja | Istraživanje tržišta (Srbija/Balkan, DACH): cene, tražnja, konkurencija, izvori |
| 15 | [`15-PREDLOG-NOVIH-PAKETA.md`](./15-PREDLOG-NOVIH-PAKETA.md) | vlasnik, prodaja | Šta je promenjeno u katalogu v2 i zašto; preporučene komercijalne lestvice |

## Kako čitati

- **Prvi dan u projektu:** 01 → 02 → 11 (pokreni lokalno) → 08 (klikni po API-ju).
- **Prodaja / vlasnik:** 13 → 14 → 15, pa `/pricing` na sajtu (uporedi brojke iz tabela).
- **Operativa / deploy:** 10 → 12 → postojeći runbook-i u [`../README.md`](../README.md) (sekcija 3).

## Odnos prema ostaloj dokumentaciji

| Postojeći dokument | Uloga | Priručnik upućuje |
|---|---|---|
| [`../../README.md`](../../README.md), [`../../SYSTEM-MAP.md`](../../SYSTEM-MAP.md) | Ulazna tačka monorepa i mapa sistema | 01, 02 |
| [`../README.md`](../README.md) | Navigacija po `docs/` (runbook-i, checkliste) | svuda gde treba operativni korak |
| [`../FULFILLMENT-17-PACKAGE-CHECKLIST.md`](../FULFILLMENT-17-PACKAGE-CHECKLIST.md) | Istorijska checklista 17 paketa (katalog v1) | 13, 15 (katalog v2 = 25 paketa) |
| [`../API-CONTRACTS-INDEX.md`](../API-CONTRACTS-INDEX.md) | Kratak indeks ugovora API-ja | 08 (potpun inventar) |
| [`../MESECNI-PLAN-ULAGANJA-M0-M6.md`](../MESECNI-PLAN-ULAGANJA-M0-M6.md), [`../MARKETING-REVENUE-PHASED-CHECKLIST.md`](../MARKETING-REVENUE-PHASED-CHECKLIST.md) | Faze M0–M6 go-to-market | 13, 15 |

## Održavanje priručnika

1. Svaka izmena kataloga isporuka (`atina-platform/atina/src/modules/billing/lib/deliverable-catalog.ts` + ogledalo u `apps/omnigroup-web/src/lib/deliverable-catalog.ts`) → ažuriraj tabelu u 13.
2. Nova HTTP ruta → ažuriraj 08 (modul + broj ruta).
3. Nova migracija → ažuriraj 09.
4. Svaki novi `docs/**/*.md` mora biti registrovan u `apps/omnigroup-web/src/app/dev/docs/page.tsx` (lokalni audit `scripts/check-dev-docs-coverage.ps1`), vidi 11.

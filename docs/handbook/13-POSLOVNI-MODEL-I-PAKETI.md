# 13 — Poslovni model i paketi (katalog v2)

**Deo priručnika:** [`README.md`](./README.md) · Prethodno: [`12-DEPLOY-I-OPERACIJE.md`](./12-DEPLOY-I-OPERACIJE.md) · Sledeće: [`14-ANALIZA-TRZISTA-2026.md`](./14-ANALIZA-TRZISTA-2026.md)

## Model u jednoj rečenici

Omni Group prodaje **isporuke** u evrima (jednokratne i mesečne), proizvodi ih automatizovano na Atina platformi, naplaćuje ručnom uplatom (M0) ili kartično/kripto kad se provajderi uključe, a svaku uplatu deli na naknadu, poreske rezerve, rezervu za resurse, reinvest i neto vlasnika.

Izvor istine: `atina-platform/atina/src/modules/billing/lib/deliverable-catalog.ts` (ogledalo `apps/omnigroup-web/src/lib/deliverable-catalog.ts`). Istorijska checklista 17 paketa (v1): [`../FULFILLMENT-17-PACKAGE-CHECKLIST.md`](../FULFILLMENT-17-PACKAGE-CHECKLIST.md). Šta je novo u v2 i zašto: [`15-PREDLOG-NOVIH-PAKETA.md`](./15-PREDLOG-NOVIH-PAKETA.md).

## Katalog isporuka — 25 paketa

Kolona „Sidro” je `anchorEur` iz koda; cena koju klijent vidi je dinamička ponuda (sledeća sekcija). Kolona „Prihvatanje” je iz `deliverable-acceptance-contract.ts`; „Handler” iz `deliverable-handlers/`. Zvezdica (*) označava pakete dodate u v2 (2026-11-03).

### Implementacija

| ID | Naziv (SR) | Naplata | Sidro € | Prihvatanje | Handler |
|----|------------|---------|---------|-------------|---------|
| `setup-quick` | Brzo podešavanje | jednokratno | 390 | status, PDF, setup projekat, portal moduli (notifications, billing) | `setup` |
| `setup-full` | Pun onboarding | jednokratno | 1290 | + CRM seed, CSV šablon migracije, plan obuke, automatizacije | `setup` |
| `setup-custom` | Custom deploy | jednokratno | 3900 | + produkcioni deploy manifest | `setup` |
| `custom-software` | Softver po meri | jednokratno | 4900 | greenfield projekat (Product Factory), handoff PDF, test gate | `custom-software` |

### Konsalting

| ID | Naziv (SR) | Naplata | Sidro € | Prihvatanje | Handler |
|----|------------|---------|---------|-------------|---------|
| `audit` | AI i tehnički audit (repozicioniran u v2) | jednokratno | 490 | status, PDF (security, stack, AI-readiness, roadmap, ROI; uračunava se u prvi projekat) | `consulting-doc` |
| `ai-pilot` * | AI pilot projekat (30 dana) | jednokratno | 990 | status, PDF (`ai-pilot-30-day-plan.pdf`: obim, KPI baseline, go/no-go) | `consulting-doc` |
| `billing-automation` * | Automatizacija fakturisanja i naplate | jednokratno | 690 | status, PDF vodič, `integration-config.json` + webhooks | `consulting-doc` |
| `compliance-pack` * | GDPR + e-faktura compliance paket | jednokratno | 290 | status, PDF (privacy notice, DPA, retention, e-faktura checklista) | `consulting-doc` |
| `integration` | Integracija po meri | jednokratno | 1190 | status, PDF, integration config + webhooks | `consulting-doc` |
| `workflow-design` | Dizajn workflow-a | jednokratno | 790 | status, PDF SOP paket | `consulting-doc` |

### Retaineri (podrška)

| ID | Naziv (SR) | Naplata | Sidro € | Prihvatanje | Handler |
|----|------------|---------|---------|-------------|---------|
| `support-priority` | Prioritetna podrška | mesečno | 199 | status, PDF, support automatizacija (SLA 24 h, triage) | `retainer` |
| `support-dedicated` | Dedicated podrška | mesečno | 490 | status, PDF, SLA 8 h + video sastanci, health check, Slack | `retainer` |
| `website-care` * | Održavanje sajta | mesečno | 89 | status, PDF, support automatizacija (SLA 48 h; hosting, update, backup, 2 izmene) | `retainer` |

### Rast (growth)

| ID | Naziv (SR) | Naplata | Sidro € | Prihvatanje | Handler |
|----|------------|---------|---------|-------------|---------|
| `landing` | Landing + copy | jednokratno | 890 | status, objavljen URL `/sites/{slug}` | `website` |
| `website-business` | Poslovni sajt (5–10 str.) | jednokratno | 2490 | status, URL, Product Factory projekat, ≥5 strana | `website` |
| `website-ecommerce` | E-commerce sajt | jednokratno | 3900 | status, URL, katalog ≥4 proizvoda, shop narudžbine (manual + Stripe) | `website` |
| `white-label-setup` | White-label pakovanje | jednokratno | 1990 | status, PDF, white-label landing objavljen | `vertical-growth` |
| `sales-enablement` | Sales enablement | jednokratno | 1290 | status, PDF (demo skripte, FAQ, onboarding) | `vertical-growth` |
| `lead-list` * | Verifikovana lista lead-ova (do 200) | jednokratno | 290 | status, PDF izveštaj, lead-gen kickoff (client-hunter + scraper), bez CRM seed-a | `retainer` |
| `seo-geo-retainer` * | SEO + AI pretraga (GEO) retainer | mesečno | 390 | status, PDF (brief-ovi, tehničke ispravke, lokalni listinzi, izveštaj vidljivosti) | `retainer` |
| `video-pipeline-retainer` * | Content + video pipeline retainer | mesečno | 290 | status, PDF (plan sadržaja; OmniTube modul aktiviran) | `retainer` |

### Vertikale (mesečni paketi rešenja)

| ID | Naziv (SR) | Naplata | Sidro € | Prihvatanje | Handler |
|----|------------|---------|---------|-------------|---------|
| `vertical-package` | Vertikalni paket rešenja | mesečno | 179 | status, PDF, CRM seed, moduli crm/automation/support-avatar/billing | `vertical-growth` |
| `lead-gen-retainer` | Lead gen retainer | mesečno | 349 | status, PDF, Titanis kickoff, CRM seed, moduli; mesečno ponavljanje | `retainer` + scheduler |
| `ai-support-retainer` | AI podrška retainer | mesečno | 249 | status, PDF, avatar + RAG + sastanci, moduli | `retainer` |
| `ai-receptionist` * | AI recepcioner + zakazivanje | mesečno | 299 | status, PDF, avatar + RAG + sastanci, moduli support-avatar/ai-rag/automation | `retainer` |

## Kako se računa cena koju klijent vidi

Formula (`dynamic-pricing.engine.ts`, ogledalo `apps/omnigroup-web/src/lib/dynamic-pricing.ts`):

```text
tržišna vrednost = sidro × tier × industrijski indeks × REGION × TAM faktor × faktor konkurencije × faktor intenziteta
cena             = max(tržišna vrednost, pod troška, sidro × tier × REGION × 0.65) + naknada provajdera
```

| Ulaz | Vrednosti | Efekat |
|------|-----------|--------|
| Tier | budget 0.75 · standard 1 · premium 1.35 · regulated 1.65 · nonprofit 0.6 | Množi sidro |
| Industrijski indeks | `CATEGORY_MARKET_INDEX` (npr. healthcare 1.45, nonprofit 0.72) | Množi |
| **Region** (v2) | `balkan` 0.8 · `eu` 1 · `dach` 1.8 · `global` 1 (podrazumevano `eu`) | Množi i vrednost i donju granicu sidra |
| Intenzitet tržišta (0–100) | Iz njega se izvode TAM i konkurencija | TAM faktor 0.75–2.2; konkurencija smanjuje do `competitionDiscountMax` |
| Provajder plaćanja | manual 0 %, Kriptoman 1.5 %, Stripe 2.9 % + 0.25 €, PayPal po konfiguraciji | Dodaje naknadu |
| Godišnja naplata | pod `sidro × 10 × tier × region × 0.6` | Popust ~2 meseca |

### Indikativne cene po regionu (manual, standard tier, intenzitet 55)

Vrednosti izračunate motorom 2026-11-03 sa podrazumevanom konfiguracijom i intenzitetom 55 (podrazumevana vrednost klizača na `/pricing`; TAM ≈ 116 k, konkurencija 57) — pri tim ulazima motor daje ≈ 1.96 × sidro. API poziv bez `marketIntensity` koristi 50 i daje ≈ 1.65 × sidro (npr. `audit` 647 / 809 / 1455 € za Balkan / EU / DACH). Zaokruženo na ceo evro; mesečni paketi označeni „/mes”.

| ID | Balkan € | EU € | DACH € |
|----|----------|------|--------|
| `setup-quick` | 610 | 763 | 1373 |
| `setup-full` | 2019 | 2524 | 4542 |
| `setup-custom` | 6103 | 7629 | 13733 |
| `custom-software` | 7668 | 9586 | 17254 |
| `audit` | 767 | 959 | 1725 |
| `ai-pilot` | 1549 | 1937 | 3486 |
| `billing-automation` | 1080 | 1350 | 2430 |
| `compliance-pack` | 454 | 567 | 1021 |
| `integration` | 1862 | 2328 | 4190 |
| `workflow-design` | 1236 | 1545 | 2782 |
| `support-priority` /mes | 311 | 389 | 701 |
| `support-dedicated` /mes | 767 | 959 | 1725 |
| `website-care` /mes | 139 | 174 | 313 |
| `landing` | 1393 | 1741 | 3134 |
| `website-business` | 3897 | 4871 | 8768 |
| `website-ecommerce` | 6103 | 7629 | 13733 |
| `white-label-setup` | 3114 | 3893 | 7007 |
| `sales-enablement` | 2019 | 2524 | 4542 |
| `lead-list` | 454 | 567 | 1021 |
| `seo-geo-retainer` /mes | 610 | 763 | 1373 |
| `video-pipeline-retainer` /mes | 454 | 567 | 1021 |
| `vertical-package` /mes | 280 | 350 | 630 |
| `lead-gen-retainer` /mes | 546 | 683 | 1229 |
| `ai-support-retainer` /mes | 390 | 487 | 877 |
| `ai-receptionist` /mes | 468 | 585 | 1053 |

**Napomena za vlasnika:** podrazumevani TAM faktor „naduvava” cenu ~2× iznad sidra. To je u redu za EU/DACH, ali za Balkan ciljane cene iz analize tržišta (npr. audit 250–490 €, website-care 50–150 €) dostižu se tek sa nižim intenzitetom tržišta ili tier `budget`. Preporuka za kalibraciju je u [`15-PREDLOG-NOVIH-PAKETA.md`](./15-PREDLOG-NOVIH-PAKETA.md) (sekcija „Kalibracija”). Sidra su namerno ostavljena blizu ciljane Balkan cene da bi `× 0.8 × budget 0.75` dalo realan donji prag.

## Planovi pretplate (interni / bundlovani)

| Slug | Naziv | Mesečno € (DB) | Godišnje € | `BASE_PLAN_PRICES` | Implicitna isporuka |
|------|-------|----------------|------------|---------------------|---------------------|
| `starter` | Business / Poslovni | 39 | 390 | 49 / 490 | `setup-quick` |
| `pro` | Growth / Rast (popular) | 99 | 990 | 129 / 1290 | `setup-full` |
| `enterprise` | Partner | 249 | 2490 | 299 / 2990 | `setup-custom` |

Limiti (seed): starter 50 taskova/mes, 1 član, 1 GB; pro 500 taskova, 10 članova, 25 GB; enterprise neograničeno, 500 GB, svi moduli. Checkout koristi `BASE_PLAN_PRICES × tier × indeks` ako je zadata industrija, inače DB cenu — **poznata nedoslednost**, odluka vlasnika (opcije: izjednačiti DB na 49/129/299 novom migracijom, ili spustiti `BASE_PLAN_PRICES`). Nema API-ja za upgrade/downgrade: promena plana = novi checkout.

## Naplata i raspodela prihoda

| Korak | Komponenta |
|-------|------------|
| Ponuda | `POST /api/v1/billing/quote` (server uvek računa ponovo pri checkout-u) |
| Checkout | `POST /payments/manual/deliverable-checkout` (IBAN + proforma PDF) ili Stripe/Kriptoman/PayPal |
| Potvrda | admin `POST /payments/manual/confirm/:id` ili webhook |
| Raspodela | `revenue_allocations`: naknada provajdera → rezerva za porez → rezerva za resurse → reinvest sistema (20 %) → neto vlasnika |
| Fulfillment | job → handler → QA → odobrenje → artefakti u `/dashboard` |
| Ponavljanje | retaineri kroz `RetainerSchedulerService` (~30 dana) |

Faktura: Atina proforma (`invoice-pdf.service.ts`); u Srbiji konačna faktura ide kroz SEF (ručno dok se ne automatizuje — predmet paketa `billing-automation`). Za DACH B2B: reverse charge napomena, 14–30 dana valuta.

## Ciljni segmenti i pozicioniranje

| Segment | Šta kupuje prvo | Lestvica |
|---------|-----------------|----------|
| Mikro/mali biznis Srbija i region (frizeri, ordinacije, agencije, zanatlije, e-commerce) | `audit` ili `compliance-pack` → `ai-receptionist` / `website-business` + `website-care` | 290 → 299/mes |
| Mala firma 3–15 ljudi (regionalno i EU) | `ai-pilot` → `setup-full` → `vertical-package` ili `lead-gen-retainer` | 990 → 1290 → 179–349/mes |
| DACH SME (nearshore, DSGVO) | `audit` (uračunat) → `ai-pilot` → `integration` / `billing-automation` + `support-priority` | DACH multiplikator 1.8 |
| Agencije / partneri | `white-label-setup` → `sales-enablement` → provizija na retainere | 1990 + 1290 |
| Izvoznici koji love DACH klijente | `lead-list` → `lead-gen-retainer` (German job hunt, 25 jezika outreach-a) | 290 → 349/mes |

Kanali: kontakt forma → CRM (M1), avatari za prodaju (`video-meetings/sales/*`), autonomni outreach po vertikalama, hunting stack (job boards DACH + RS Infostud), lead baze (Apollo/Hunter) od faze F1.

## Ko šta održava

| Promena | Fajlovi | Testovi |
|---------|---------|---------|
| Cena/naziv isporuke | oba `deliverable-catalog.ts`, `marketing-catalog.ts` (ako je na `/services`) | `dynamic-pricing.test.ts` |
| Novi paket | katalog ×2, contract, checklist, handler `ids`, e2e `$allIds` | registry, checklist, dynamic-pricing |
| Region multiplikator | oba `market-pricing.ts` | `dynamic-pricing.test.ts` (region test) |
| Plan pretplate | seed + nova migracija + `category-pricing.ts` ×2 + `marketing-plans.ts` | plan-deliverable-map testovi |
| Naknade provajdera | `config/index.ts` (`pricing.paymentProviders`) + web `dynamic-pricing.ts` | dynamic-pricing |

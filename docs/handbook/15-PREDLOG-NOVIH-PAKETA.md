# 15 — Predlog novih paketa i šta je implementirano (katalog v2)

**Deo priručnika:** [`README.md`](./README.md) · Prethodno: [`14-ANALIZA-TRZISTA-2026.md`](./14-ANALIZA-TRZISTA-2026.md)

Ovo poglavlje povezuje analizu tržišta (14) sa katalogom u kodu (13): šta je promenjeno 2026-11-03, zašto, šta je svesno ostavljeno za odluku vlasnika i kojim redom dalje.

## 1. Šta je bilo pre (v1, 17 paketa) i gde nije pogađalo tržište

| Nalaz iz analize | Stanje u v1 | Posledica |
|---|---|---|
| Najprodavaniji ulaz je **plaćeni audit uračunat u projekat** (ProvenAI 497 €, Happy Media 300 €, modernagents Probelauf) | `audit` 690 €, čisto „technical audit”, bez AI/ROI ugla i bez uračunavanja | Previsoka i pogrešno uokvirena ulazna stepenica |
| **Pilot fiksne cene** je standard pre retainera (DACH 1 980–3 500 €, Srbija 500–1 200 €) | nije postojao; najbliže `workflow-design` 790 € (samo dokumentacija) | Skok sa audita na `setup-full` 1 290 € bez „probe” |
| **AI recepcioner sa zakazivanjem** = najveći ROI uz najmanju usvojenost (speed-to-lead 14 %, ROI 320 %) | `ai-support-retainer` (avatar + sastanci) bez zakazivanja/kvalifikacije lead-ova | Nedostajao bestseler „Reception” stepenice |
| **Održavanje sajta** se u Srbiji prodaje 50–150 €/mes, u DACH 150–400 € | `support-priority` 199 € (previše za mikro klijenta koji je kupio landing) | Sajt isporučen → nema jeftinog mesečnog nastavka |
| **SEO/GEO retainer** je najbrže rastuća kategorija (+66 %) i lokalno se već prodaje 450–880 € | nije postojao | Propušten prihod posle svakog sajta |
| **Content/video** je #1 što MSP kupuje; OmniTube pipeline postoji u kodu | `omnitube` modul bez prodajnog paketa | Tehnologija bez SKU-a |
| **Verifikovana lista kontakata** ima trošak 10–100 €, prodaje se 150–750 € | samo `lead-gen-retainer` 349 €/mes (velika obaveza) | Nema jeftinog „probaj outbound” proizvoda |
| **E-faktura (SEF, ZUGFeRD 2027/28) i GDPR/SCC** stvaraju obaveznu tražnju | `sistem-naplate` modul i `gdpr` modul postoje, ali bez paketa | Regulatorna tražnja nije monetizovana |
| **DACH plaća 2–3×** više, ali v1 je imao jednu cenu za sve | nije bilo regionalne dimenzije u motoru cena | Ili preskupo za Balkan ili prejeftino za DACH |
| `/services` je prikazivao **ručno upisane niže cene** (setup-quick 290 € vs 390 € sidro) | drift između marketinga i naplate | Klijent vidi jednu cenu, plaća drugu |

## 2. Šta je implementirano (v2)

### 2.1 Osam novih paketa + repozicioniran audit

| ID | Stepenica iz analize | Sidro € | Zašto baš toliko |
|---|---|---|---|
| `audit` (izmenjen) | Ulaz: „AI Opportunity Audit”, uračunava se u prvi projekat | 690 → **490** | Balkan ciljana 250–490 €; motor sa `balkan × budget` daje ≈ 450 €; DACH ×1.8 ≈ 960–1 700 € što pogađa nemačke audite 1 000–1 500 € |
| `ai-pilot` | Pilot (jedan use case, 30 dana, KPI baseline, go/no-go PDF) | **990** | Između srpskog 500–1 200 € i TSMONDO 1 980 € (DACH ×1.8 ≈ 1 780–3 500 €) |
| `ai-receptionist` | Stepenica 2 „Reception” | **299/mes** | Srpski voice agenti 249–529 €/mes; DACH ≈ 540–1 050 €/mes, ispod moinAI 750 € a sa glasom i zakazivanjem |
| `website-care` | Dodatak: održavanje sajta (hosting, update, backup, 2 izmene, SLA 48 h) | **89/mes** | Happy Media 90 €; DACH ×1.8 ≈ 160 € u opsegu 150–400 € |
| `seo-geo-retainer` | Dodatak: SEO + GEO (brief-ovi, tehnika, lokalni listinzi, izveštaj) | **390/mes** | Srbija 450–880 € standard; DACH ≈ 700–1 370 € naspram medijane 1 120 € |
| `video-pipeline-retainer` | Dodatak: content + video kroz OmniTube | **290/mes** | Srbija 250–750 €; globalno 800 $ za 4 videa |
| `lead-list` | Dodatak: do 200 verifikovanih B2B lead-ova + outreach sekvenca | **290** | Trošak 10–100 €; tržište 150–400 € Balkan / 300–750 € DACH |
| `billing-automation` | Dodatak: fakture, podsetnici, reconcilijacija, SEF/ZUGFeRD spremnost, webhooks, SOP | **690** | Balkan 500–1 500 €; DACH 2 000–5 000 € (×1.8 ≈ 1 240–2 430 €) |
| `compliance-pack` | Dodatak: privacy notice, DPA/AV-Vertrag, retention, e-faktura checklista | **290** | Balkan 200–400 €; DACH 500–1 500 €; Divine (HR) AI Act paket 2 000 € |

Svaki novi paket ima: unos u **oba** kataloga, acceptance contract, QA evaluator, handler (`consulting-doc` za dokumente, `retainer` za mesečne i lead-list), AI generator sa fallback šablonom gde je PDF, test u registry/checklist/pricing suitama i mesto u `scripts/e2e-fulfillment-all-packages.ps1`. Detalji isporuke: [`13-POSLOVNI-MODEL-I-PAKETI.md`](./13-POSLOVNI-MODEL-I-PAKETI.md).

### 2.2 Regionalna dimenzija cene (`marketRegion`)

`MarketRegion = 'balkan' | 'eu' | 'dach' | 'global'`, multiplikatori 0.8 / 1 / 1.8 / 1 (`lib/market-pricing.ts` u Atini i webu). Ulazi u `QuoteInput`, DTO (`billing.dto.ts`, `payments.module.ts`), kontrolere, `payments.service.ts` (checkout ponovo računa sa regionom) i `/pricing` (select „Target market region”, prikaz faktora u breakdown-u). Podrazumevano `eu` = nepromenjeno ponašanje za postojeće pozive.

Zašto 1.8 za DACH, a ne 2.5–3: analiza preporučuje da Omni cene budu 55–70 % nemačkih agencija (nearshore prednost bez „offshore” percepcije); 1.8 × motor (≈ 1.96 × sidro) već daje 3.5 × sidro, što je tačno taj opseg. Balkan 0.8 drži cene na nivou lokalnih produktizovanih ponuda.

### 2.3 `/services` i dodaci planova izvedeni iz kataloga

`marketing-catalog.ts` sada gradi stavke preko `serviceFromCatalog(id, …)` (cena = sidro iz kataloga), a `marketing-plans.ts` dodatke preko `addonFromCatalog`. Nova kategorija „AI automation” (audit „Start here”, ai-pilot „Popular”, ai-receptionist, billing-automation, compliance-pack) je prva na stranici. Drift cena između `/services` i naplate više nije moguć bez promene kataloga.

## 3. Preporučene prodajne lestvice (kako to prezentovati klijentu)

Katalog ostaje „à la carte” (svaki paket se kupuje zasebno), a lestvice su **prodajni skript**, ne novi SKU-ovi:

| Lestvica | Paketi | Ukupno Balkan (sidro) | Ukupno DACH (motor ≈) |
|---|---|---|---|
| **Start** (mikro klijent) | `audit` → `landing` ili `website-business` + `website-care` | 490 + 890–2 490 + 89/mes | 1 725 + 3 134–8 768 + 313/mes |
| **Reception** (očekivani bestseler) | `audit` → `ai-receptionist` + `website-care` (+ `compliance-pack`) | 490 + 299/mes + 89/mes (+ 290) | 1 725 + 1 053/mes + 313/mes (+ 1 021) |
| **Pilot → Platform** | `audit` → `ai-pilot` → `setup-full` → `vertical-package` ili `support-priority` | 490 + 990 + 1 290 + 179–199/mes | 1 725 + 3 486 + 4 542 + 630–701/mes |
| **Pipeline** (B2B / izvoznici) | `lead-list` → `lead-gen-retainer` (+ `sales-enablement`) | 290 + 349/mes (+ 1 290) | 1 021 + 1 229/mes (+ 4 542) |
| **Growth** (posle sajta) | `seo-geo-retainer` + `video-pipeline-retainer` | 680/mes | 2 394/mes |
| **Compliance / finance** | `compliance-pack` + `billing-automation` | 980 | 3 451 |
| **Partner** | `white-label-setup` + `sales-enablement` + provizija | 3 280 | 11 549 |

Pravilo audita: iznos `audit`-a se priznaje kao popust na prvi sledeći jednokratni paket u 60 dana (Balkan) / 90 dana (DACH). Tehnički: admin pri potvrdi sledeće uplate umanjuje iznos u `payments.metadata.discount` — automatizacija je stavka backloga (sekcija 5).

## 4. Kalibracija motora cena (odluka vlasnika)

Sa podrazumevanom konfiguracijom (`PRICING_DEFAULT_TAM_USD`, intenzitet 55) motor daje ≈ 1.96 × sidro za EU. To znači:

| Region | Efektivni množilac sidra | Komentar |
|---|---|---|
| Balkan | ≈ 1.57× (0.8 × 1.96) | `audit` 767 €, `website-care` 139 €/mes — iznad lokalnih ciljeva (250–490 €, 50–150 €) |
| EU | ≈ 1.96× | prihvatljivo za zapadnu/severnu EU |
| DACH | ≈ 3.5× | pogađa 55–70 % nemačkih agencijskih cena |

Opcije (bira vlasnik; nijedna nije primenjena u kodu da se ne menja postojeća ekonomija bez odluke):

1. **Spustiti Balkan multiplikator na 0.55–0.6** — najjednostavnije, pogađa lokalne cene bez diranja TAM logike.
2. **Smanjiti `PRICING_DEFAULT_TAM_USD`** ili podrazumevani intenzitet na `/pricing` sa 55 na ~35 — spušta sve regione proporcionalno.
3. **Prikazivati „od” cenu = sidro × region** na `/services` (već tako), a motor koristiti samo za personalizovanu ponudu — klijent vidi konzervativnu cenu, konfigurator je gornja granica.
4. Ostaviti kako jeste i koristiti tier `budget` (0.75) u prodaji na Balkanu.

Preporuka: opcija 1 + 3. Izmena je jedan broj u oba `market-pricing.ts` fajla i test u `dynamic-pricing.test.ts`.

## 5. Šta nije implementirano (svesno) i backlog

| Stavka | Zašto nije sada | Procena promene |
|---|---|---|
| Self-serve SaaS planovi 29–349 €/mes sa limitima poruka/minuta | Zahteva usage metering (brojanje poruka/minuta po klijentu) koje ne postoji; planovi 39/99/249 ostaju interni | Nova tabela `usage_counters`, middleware u `video-meetings`/`ai-rag`, Stripe metered billing |
| Outcome cene (po održanom sastanku, po rešenju) | Potrebna verifikacija ishoda (kalendar webhook, ocena rešenja) | Modul `video-meetings` + `crm` event, mesečni obračun u `revenue-allocation` |
| Automatsko uračunavanje `audit`-a u sledeću kupovinu | Treba polje popusta u checkout-u i pravilo roka | `payments.service` + DTO + admin UI |
| Minuti/poruke sa prekoračenjem za `ai-receptionist` | Isto što i metering | kao prvi red |
| Ugovorni rokovi (3 meseca min., −10 % godišnje) | Motor ima godišnji pod, ali nema „3 meseca pa mesečno” | `retainer_schedule` + checkout opcija |
| Izjednačavanje planova 39/99/249 vs 49/129/299 | Poslovna odluka | nova migracija `034` + seed ili izmena `BASE_PLAN_PRICES` ×2 |
| Telefonija (pravi glasovni kanal) za `ai-receptionist` | Trenutno chat + avatar + zakazivanje; glas kroz TTS lanac bez SIP broja | integracija Vapi/Retell/sipgate, `COMMS_*` agregator |
| Garancija prvog meseca / povraćaj audita | Pravni tekst i ručni proces | sekcija u ugovoru (`contracts` modul) + admin refund |
| DE lokalizacija `/pricing` i PDF-ova | Tekstovi su EN/SR | `nameDe`, `descriptionDe` u katalogu, i18n na webu |

## 6. Mere uspeha (šta pratiti 90 dana posle objave)

| Metrika | Izvor | Cilj |
|---|---|---|
| Udeo `audit` u prvim kupovinama | `payments` + `deliverable_fulfillment_jobs.deliverable_id` | ≥ 50 % novih klijenata ulazi kroz audit |
| Konverzija audit → sledeći paket u 60/90 dana | isto, po `user_id` | ≥ 40 % |
| Udeo mesečnih paketa u prihodu | `revenue_allocations` po `billing` | ≥ 50 % MRR naspram jednokratnih |
| Prosečna vrednost po regionu | `payments.metadata.marketRegion` | DACH ≥ 2× Balkan |
| Churn retainera | `retainer_schedule` prekidi | < 10 %/mes |
| Vreme do prve isporuke | `deliverable_fulfillment_jobs.created_at → released_at` | < 48 h za dokumente, < 7 dana za sajtove |

## 7. Redosled sledećih koraka

1. Vlasnik bira kalibraciju iz sekcije 4 (jedan PR, dva fajla + test).
2. Objaviti `/services` i `/pricing` sa regionom; dodati DE kopiju za DACH kampanju.
3. Uključiti `audit` + `compliance-pack` u kontakt formu kao predložene „prve korake” (polje `service`).
4. Prvi 3 klijenta na `ai-receptionist` kao referentne studije (frizer/ordinacija/agencija), meriti zakazane termine.
5. Metering (poruke/minuti) kao preduslov za SaaS planove i usage naplatu (M3–M4).
6. Stripe + SEPA aktivacija za DACH (M6 u [`../MESECNI-PLAN-ULAGANJA-M0-M6.md`](../MESECNI-PLAN-ULAGANJA-M0-M6.md)).

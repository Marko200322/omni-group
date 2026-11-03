# 14 — Analiza tržišta 2026 (Srbija/Balkan i DACH)

**Deo priručnika:** [`README.md`](./README.md) · Prethodno: [`13-POSLOVNI-MODEL-I-PAKETI.md`](./13-POSLOVNI-MODEL-I-PAKETI.md) · Sledeće: [`15-PREDLOG-NOVIH-PAKETA.md`](./15-PREDLOG-NOVIH-PAKETA.md)

Istraživanje urađeno 2026-11-03 nad javno dostupnim cenovnicima, agregacijama i zvaničnom statistikom (izvori 2025–2026). Sve cene su neto (bez PDV-a). Konverzija ≈ 1 USD = 0.89 EUR. Cilj: proveriti da li katalog isporuka odgovara onome što MSP sektor stvarno kupuje i po kojoj ceni, i iz toga izvesti izmene kataloga (poglavlje 15).

## 1. Zaključci u 10 tačaka

1. **Tržište AI-automatizacije ima tri jasne cenovne trake:** mali biznis 1 300–4 500 € setup + 450–1 350 €/mes; srednji 4 500–18 000 € + 1 350–3 600 €/mes; enterprise iznad toga ([Taskip](https://taskip.net/ai-automation-agency-pricing/), [CloudMotiv](https://cloudmotiv.ai/ai-automation-agency-pricing-usa)). Medijana ulazne cene kod 204 AI agencija je 2 500 $ jednokratno, medijana čistog retainera 5 000 $/mes ([AgenticIndex, okt. 2026](https://getagenticindex.com/reports/2026-ai-agency-pricing)); drugi uzorak daje medijanu retainera 1 975 $/mes ([Cofounderbase](https://cofounderbase.com/ai-agency-prices/)).
2. **Nemačka plaća 2.5–4× više od Srbije za isti posao:** KI pilot 5 000–15 000 €, retaineri 1 500–4 000 €/mes ([Gottesleben](https://dominik-gottesleben.de/ki-agentur-kosten.html)); jedan n8n workflow sa operativom 1 980 € + 129 €/mes ([TSMONDO](https://tsmondo.de/ki/automatisierung/)) ili 3 000–5 000 € + 250 €/mes ([modernagents](https://modernagents.ai/de/n8n-agentur)). U Srbiji chatbot kreće od ~500 € + 79–299 €/mes, a „većina MSP plaća 450–900 €/mes” za chatbot + kvalifikaciju + CRM ([agenti.rs](https://agenti.rs/blog/ai-agenti-u-srbiji-ko-ih-pravi-cena), [Happy Media](https://happymedia.rs/blog-cena-ai-automatizacije)).
3. **Tražnja raste, ali je nezrela:** 17.2 % srpskih preduzeća (10+ zaposlenih) koristi AI u 2026, sa 10.1 % u 2025 ([RZS / Biznis.rs](https://biznis.rs/vesti/srbija/vestacku-inteligenciju-u-srbiji-koristi-tek-172-odsto-firmi/)); Nemačka 26 % (Eurostat 2025) naspram EU 19.95 % ([i6eal/Eurostat](https://i6eal.de/research-notes/files/i6eal-rn-2026-01-ssrn.pdf)); 44 % nemačkih MSP kaže da već koristi AI ([IONOS/YouGov 2026](https://www.ionos.de/newsroom/news/kmu-digitalisierung-mittelstand-investiert-mehr-in-ki-buerokratie-wird-zur-groessten-digitalisierungshuerde/)).
4. **Šta MSP stvarno kupuje:** marketing/sadržaj prvo, korisnička podrška drugo, administracija/knjigovodstvo treće ([Intuit 2026 AI Impact Report](https://digitalasset.intuit.com/render/content/dam/intuit/sbseg/en_us/Blog/Downloadable-assset/2026-ai-impact-report.pdf)). Korisnička podrška je #1 enterprise use case za agente, 80 % lidera podrške povećava budžet za agente u 2026 ([Gartner](https://emt.gartnerweb.com/ngw/globalassets/en/customer-service-support/documents/trends/the-current-state-of-agentic-ai-in-customer-service.pdf)).
5. **Najveći ROI uz najmanju usvojenost:** speed-to-lead (14 % usvojenost, 320 % medijan ROI) i automatizacija follow-up-a (27 %, 250 %) ([Automation Labz 2026](https://www.automationlabz.com/blog/state-of-operator-automation-2026)) — tačno ono što radi `ai-receptionist`.
6. **Pakovanje koje konvertuje:** plaćeni audit koji se 100 % uračunava u pilot, fiksna cena pilota, pa retainer 3 meseca + mesečno; hibrid baza + po održanom sastanku za outbound; naplata po rešenju za support botove (0.99–2.00 $/rešenje kod Intercom/Zendesk) ([Fin.ai](https://fin.ai/learn/per-resolution-vs-per-conversation-ai-pricing), [CX Foundation](https://cxfoundation.com/blog/outcome-based-pricing)).
7. **Nearshore ekonomija:** srpski ICT trošak rada 28.2 €/h naspram 58.5 €/h u Nemačkoj (Eurostat 2025) ([StepTo](https://stepto.net/software-outsourcing-cost-analysis)); srpske agencije 35–75 $/h, nemačke 100–180 €/h ([StepTo](https://stepto.net/serbia-software-development-report-2026), [appforge](https://appforge.hu/de/blog/entwicklungskosten-deutschland-vs-nearshore/)); 48 % nemačkih organizacija planira više nearshore isporuke ([Whitelane 2025](https://whitelane.com/germany-2025/)).
8. **Transparentnost je diferencijator:** samo 9 od 31 srpske AI firme objavljuje cene, samo 2 nude povraćaj ([agenti.rs](https://agenti.rs/blog/ai-agenti-u-srbiji-ko-ih-pravi-cena)); 37 % AI agencija globalno ne objavljuje cene ([AgenticIndex](https://getagenticindex.com/reports/2026-ai-agency-pricing)).
9. **Regulativa stvara tražnju:** SEF e-faktura obavezna u Srbiji od 2023 ([Sovos](https://sovos.com/vat/tax-rules/e-invoicing-serbia/)); Nemačka uvodi obaveznu izdavanje e-računa 2027/2028 ([BMF](https://www.bundesfinanzministerium.de/Content/DE/FAQ/e-rechnung.html)); Srbija nema EU adequacy odluku → DACH klijenti traže SCC/AV-Vertrag ([Digital Heroes](https://digitalheroesco.com/de/ratgeber/softwareentwicklung-outsourcing/)). To opravdava `billing-automation` i `compliance-pack`.
10. **Niko na Balkanu javno ne paketira** sajt + AI agent + outbound + automatizaciju naplate u jednu lestvicu — to je otvorena pozicija za Atinu.

## 2. Cenovni benchmark po kategoriji

### 2.1 AI automatizacija (setup + retainer)

| Segment / tržište | Setup | Mesečno | Izvor |
|---|---|---|---|
| Mali biznis (1–2 workflow-a), globalno | 1 500–5 000 $ | 500–1 500 $ | [Taskip](https://taskip.net/ai-automation-agency-pricing/) |
| Srednji (3–10 workflow-a) | 5 000–20 000 $ | 1 500–4 000 $ | isto |
| Nemačka: KI pilot 1 proces, 4–8 nedelja | 5 000–15 000 € | 200–1 500 € tekući; retaineri 1 500–4 000 € | [Gottesleben](https://dominik-gottesleben.de/ki-agentur-kosten.html) |
| Nemačka: quick audit / starter / knowledge agent / retainer | 497 € / od 1 497 € / 2 497 € | od 397 € | [ProvenAI](https://provenai.de/ki-betreuung-beratung/) |
| Nemačka: bundle automatizacije | 4 900–18 000 € | 89–799 € | [digitalisierung-direkt](https://digitalisierung-direkt.de/preise/) |
| Srbija: chatbot / više procesa / veći sistem | ~500 € / ~1 200 € / ~2 500 € | 79–299 € | [agenti.rs](https://agenti.rs/blog/ai-agenti-u-srbiji-ko-ih-pravi-cena) |
| Srbija: proces automatizacije | 300–500 € po procesu | — | isto |
| Srbija: MSP paketi | 300–1 500 € | Starter 200–350 / Growth 450–900 / Full AI Ops 1 200–2 500+ | [Happy Media](https://happymedia.rs/blog-cena-ai-automatizacije) |
| Hrvatska: chatbot / agent sa integracijama / jedan proces | 690–1 900 € / 2 400–8 500 € / 690–2 400 € | — | [AIS Tech](https://aistech.hr/cijene) |
| Hrvatska: mini automatizacija / FAQ bot / poslovna automatizacija | od 249 / 499 / 890 € | — | [CodeFusion](https://codefusion.hr/ai-automatizacija.html) |

### 2.2 Chatbotovi i AI podrška

| Ponuda | Cena | Izvor |
|---|---|---|
| Konfigurisana platforma | 500–2 000 $ + 300–1 500 $/mes | [Ynexgen](https://ynexgen.com/blog/chatbot-agency-pricing-vs-diy) |
| Lokalni biznis produktizovano: FAQ / booking / CRM+follow-up | 497 $ + 97 $/mes · 1 500 $ + 197 $/mes · 3 000–5 000 $ + 397 $/mes | [AI Tools Titan](https://aitoolstitan.com/ai-chatbot-setup-for-local-businesses/) |
| DACH SaaS (moinAI) | 750–2 500 €/mes, 3 meseca minimum | [moin.ai](https://www.moin.ai/preise) |
| Srbija SaaS | 29–249 €/mes; ~0.05 € po dodatnoj poruci | [agenti.rs](https://agenti.rs/blog/koliko-kosta-ai-chatbot-za-firmu-srbija) |

### 2.3 AI glasovni recepcioner

| Tržište | Cena | Izvor |
|---|---|---|
| US SaaS (Dialzara, Rosie, Goodcall) | 29–349 $/mes; 0.20–0.50 $/min; „done-for-you” od 1 500 $/mes | [Dialzara](https://dialzara.com/pricing), [Daber](https://daber.ai/ai-receptionist-pricing) |
| DACH SaaS (sipgate sona, fonio, RufLab, HalloPetra) | 69–399 €/mes za 500–3 600 min; prekoračenje 0.12–0.28 €/min | [RufLab poređenje](https://www.ruflab.com/blog/ki-telefonassistent-made-in-germany-anbieter-vergleich-2026), [ki-telefonassistent-test.de](https://ki-telefonassistent-test.de/) |
| Medicina DACH (Mediform, Doctolib) | 75 €/lokacija + 0.15 €/min; 192–229 €/lekar + setup od 399 € | [Mediform](https://mediform.io/faq/ki-telefonassistent-kosten), [Medizinio](https://medizinio.de/digitalisierung/telefonassistent-arztpraxis) |
| Srbija | 249–529 €/mes; Dedaldev od 1 000 € + 250 €/mes (300 min) | [agenti.rs](https://agenti.rs/blog/ai-agenti-u-srbiji-ko-ih-pravi-cena) |

Zaključak: SaaS sloj glasa je komoditizovan (70–200 €/mes u DACH); vrednost agencije je integracija (kalendar, CRM, PVS), DSGVO papirologija i tekuće održavanje promptova.

### 2.4 Sajtovi i landing stranice

| Tržište | Cena | Izvor |
|---|---|---|
| Nemačka: landing freelancer / agencija / sa CRO | 500–2 500 / 2 500–8 000 / 5 000–12 000 € | [Ice Age Media](https://www.iceagemedia.com/landingpage-erstellen-lassen) |
| Nemačka: one-pager / MSP sajt / shop | 1 500–7 000 / 3 500–12 000 / 8 000–32 000 € | [OA Webagentur](https://oawebagentur.de/preise/website) |
| Srbija: prezentacioni 5–10 strana | 800–2 500 €; shop 1 500–5 000 €; održavanje od 50 €/mes | [emit.rs](https://emit.rs/blog/koliko-kosta-izrada-sajta/) |
| Srbija: po tipu | vizit karta 200–500 €; mali biznis 500–1 050 €; WooCommerce 1 500–2 800 € | [RXN](https://rxnwebsolutions.com/cena-izrade-web-sajta-2026/) |
| Srbija: javni paketi (8 paketa, 4 agencije) | medijana ≈ 280 €; mesečno 30–80 € | [bezsajta.rs](https://bezsajta.rs/blog/koliko-kosta-izrada-sajta-srbija-2026/) |
| Srbija: produktizovano (Happy Media) | sajt od 600 €; održavanje 90/140/320 €/mes | [Happy Media cenovnik](https://happymedia.rs/cenovnik) |

### 2.5 Lead generisanje i outbound

| Model | Cena | Izvor |
|---|---|---|
| Cold e-mail retainer | 2 000–8 000 $/mes | [Cleverly](https://www.cleverly.co/blog/b2b-lead-generation-agency-cost) |
| Po kvalifikovanom lead-u / sastanku | 150–500 $ lead; SMB sastanak 150–500 $ | [Newlead](https://newlead.io/resources/what-b2b-lead-generation-costs), [OutboundPros](https://outboundpros.io/blog/b2b-appointment-setting-pricing-2026) |
| Hibrid | 2 000–4 000 $ baza + 150–400 $ po sastanku | [Newlead](https://newlead.io/resources/what-b2b-lead-generation-costs) |
| Lead baze (jedinični trošak) | Apollo ≈ 0.02 $/e-mail; realni trošak po upotrebljivom kontaktu 0.13–0.66 $ | [smirnovartem](https://smirnovartem.com/blog/b2b-contact-data-cost) |

Lista od 200–500 verifikovanih kontakata ima trošak reda 10–100 € i prodaje se 150–400 € (Balkan) / 300–750 € (DACH) — osnova paketa `lead-list`.

### 2.6 SEO, GEO, sadržaj, video

| Tržište | Cena | Izvor |
|---|---|---|
| Nemačka SEO (33 provajdera, 103 cene) | medijana 1 120 €/mes; audit 1 500 € | [Kontaktpfad](https://kontaktpfad.de/ratgeber/seo-kosten) |
| GEO/AEO (214 agencija) | medijana 6 850 $/mes, +66 % od 2024; starter 1 800–4 200 $ | [First Page Sage](https://firstpagesage.com/seo-blog/geo-aeo-pricing-statistics/) |
| Srbija SEO | 200–450 € ulaz; 450–880 € standard; audit 450–800 € | [S1 Digital](https://s1.digital/blog/cena-seo-optimizacije/), [Envie](https://envie.rs/seo-optimizacija-cena/) |
| Srbija produktizovano (SEO/GEO/YouTube/AI) | SEO 450/880; GEO 450/850; YouTube 350/750; AI sloj 200 €/mes | [Happy Media cenovnik](https://happymedia.rs/cenovnik) |
| YouTube automatizacija | 800 $/mes za 4 videa; 1 800–2 500 $ za 10 | [MAW Motion](https://mawmotionstudios.com/youtube-automation/), [WREDD](https://www.wredd.com/youtube-automation-service/) |

### 2.7 Satnice

| | Vrednost | Izvor |
|---|---|---|
| Srbija agencije po senioritetu | 25–35 / 35–45 / 50–65 / 65–85 $/h | [StepTo 2026](https://stepto.net/serbia-software-development-report-2026) |
| DACH freelancer medijana IT | 95 €/h; agencije 100–180 €/h | [appforge](https://appforge.hu/de/blog/entwicklungskosten-deutschland-vs-nearshore/) |
| Upwork n8n / AI agent / chatbot | 25 / 30 / 26 $/h medijana | [Upwork X-Ray](https://www.upworkxray.com/blog/ai-automation-freelance-rates-upwork) |

## 3. Signali tražnje

| Statistika | Vrednost | Izvor |
|---|---|---|
| EU preduzeća sa AI 2025 | 19.95 % (mala 17 %, srednja 30.4 %, velika 55 %) | [Eurostat](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Use_of_artificial_intelligence_in_enterprises) |
| Srbija 2026 | 17.2 % (mala 15.1 %, Beograd 20.4 %, ICT 53.9 %); samo 22.7 % firmi ima CRM, 27.2 % ERP; 85.8 % ima sajt; 28.8 % prodaje online | [Biznis.rs/RZS](https://biznis.rs/vesti/srbija/vestacku-inteligenciju-u-srbiji-koristi-tek-172-odsto-firmi/), [stat.gov.rs](https://stat.gov.rs/en-us/oblasti/upotreba-ikt/upotreba-ikt-preduzeca/) |
| Nemačka MSP 2026 | 44 % koristi AI; prioriteti: IT bezbednost 38 %, online vidljivost 35 %, AI 35 %; barijere birokratija 55 %, cena 52 % | [IONOS/YouGov](https://www.ionos.de/newsroom/news/kmu-digitalisierung-mittelstand-investiert-mehr-in-ki-buerokratie-wird-zur-groessten-digitalisierungshuerde/) |
| Nemačka (Bitkom, 604 firme) | 41 % koristi AI (2025: 17 %); 66 % planira širenje | [Bitkom Research](https://bitkom-research.de/studien/digitalisierung-der-wirtschaft-2026) |
| Gartner | 40 % enterprise aplikacija sa task agentima do kraja 2026; >40 % agentskih projekata biće otkazano do 2028 | [Gartner](https://www.gartner.com/en/newsroom/press-releases/2025-08-26-gartner-predicts-40-percent-of-enterprise-apps-will-feature-task-specific-ai-agents-by-2026-up-from-less-than-5-percent-in-2025) |
| Alati MSP-a | Make 29 %, Zapier 27 %, n8n 19 %; Vapi 24 %, Retell 17 % za glas | [CreativeGenius](https://creativegenius.ai/research/state-of-smb-ai-automation-2026) |
| Marketing timovi | 98 % koristi AI, 86 % agente, 80 % za kreiranje sadržaja | [HubSpot](https://www.hubspot.com/state-of-marketing) |

Rang usluga koje MSP kupuje (po težini dokaza): 1) marketing sadržaj i mediji; 2) korisnička podrška / AI agenti (instalirani chatbotovi <12 % malih firmi uprkos 73 % korišćenja ChatGPT-a → „done-for-you” jaz, [Bluehost](https://www.bluehost.com/content/dam/bluehost/pages/state-of-small-business-ai-confidence/home/Bluehost__AI__Market__Study61626.pdf)); 3) administracija i fakturisanje; 4) prodaja; 5) zakazivanje i speed-to-lead; 6) workflow alati; 7) AI SEO/GEO; 8) „AI zaposleni” (visoko interesovanje, nisko skaliranje); 9) CRM čišćenje (bundlovati uz konkretan workflow).

## 4. Obrasci pakovanja koji konvertuju

| Obrazac | Dokaz | Izvor |
|---|---|---|
| Plaćeni audit uračunat u izgradnju | 497 € sa povraćajem (ProvenAI); 4 500–7 500 $ sa POC-om 100 % uračunat u pilot (Tavoko) | [ProvenAI](https://provenai.de/ki-betreuung-beratung/), [Tavoko](https://tavoko.com/ai-opportunity-audit) |
| Fiksni pilot / Probelauf | od 2 500 € uračunato, refundirano ako savetuju protiv automatizacije | [modernagents](https://modernagents.ai/de/n8n-agentur) |
| Setup + retainer (monitoring 40 %, optimizacija 35 %, širenje 25 %) | dominantna MSP struktura | [A8gent](https://a8gent.com/blog/ai-automation-agency-pricing-guide) |
| Usage: minuti/poruke sa prekoračenjem | 0.12–0.28 €/min DACH; 0.05 €/poruka Srbija | [Medizinio](https://medizinio.de/digitalisierung/telefonassistent-arztpraxis), [agenti.rs](https://agenti.rs/blog/koliko-kosta-ai-chatbot-za-firmu-srbija) |
| Outcome: po rešenju / po sastanku | 0.99–2.00 $ po rešenju; 150–500 $ po sastanku | [Fin.ai](https://fin.ai/learn/per-resolution-vs-per-conversation-ai-pricing), [OutboundPros](https://outboundpros.io/blog/b2b-appointment-setting-pricing-2026) |
| Trajanje ugovora | 3–6 meseci minimum; mesečno +15–25 %; godišnje −10–15 % | [DollarPocket](https://www.dollarpocket.com/marketing-agency-pricing-study-report/) |
| Garancije | garantuj isporuku SOW-a, nikad rangiranje; audit sa povraćajem | [Striveloom](https://striveloom.com/blog/agency-money-back-guarantee) |
| Uslovi plaćanja | 50 % avans, retainer unapred, 5–10 % popust za kvartal | [DollarPocket](https://www.dollarpocket.com/marketing-agency-pricing-study-report/) |

## 5. Specifičnosti Srbije i DACH

| Tema | Srbija | Nemačka / DACH |
|---|---|---|
| Budžet malog biznisa | digitalni marketing 400–800 €/mes ([Webkraft](https://webkraft.rs/blog/koliko-kosta-digitalni-marketing-2026/)); AI automatizacija 450–900 €/mes + 300–1 500 € setup | KMU AI pilot 5–15 k €; 70 % narudžbina ispod 30 k € ([Gottesleben](https://dominik-gottesleben.de/ki-agentur-kosten.html)) |
| PDV | 20 %; prag 8 mil. RSD; usluge van Srbije oslobođene ([Eurofast](https://eurofast.eu/wp-content/uploads/2025/02/SerbiaTaxCard_2025-1.pdf)) | 19 %; B2B iz Srbije = reverse charge, napomena „Steuerschuldnerschaft des Leistungsempfängers” ([Eurofiscalis](https://www.eurofiscalis.com/en/invoicing-in-germany/)) |
| E-faktura | SEF obavezan B2B od 2023, UBL 2.1, 10 g. arhiva ([Sovos](https://sovos.com/vat/tax-rules/e-invoicing-serbia/)) | XRechnung/ZUGFeRD obaveza izdavanja 2027/2028; PDF od srpskog dobavljača prihvatljiv ([BMF](https://www.bundesfinanzministerium.de/Content/DE/FAQ/e-rechnung.html)) |
| Plaćanje | bankovni transfer, IPS/DinaCard jeftiniji od kartica ([NBS](https://www.nbs.rs/export/sites/NBS_site/documents-eng/publikacije/wp_bulletin/wp_bulletin_03_25_1.pdf)) | 14–30 dana „ohne Abzug”; SEPA mandat; 2 % Skonto ([Rechnungskit](https://rechnungskit.de/en/guides/payment-terms)) |
| Kripto | nije zakonsko sredstvo plaćanja; B2B razmena preko licencirane menjačnice uz klauzulu; 15 % porez na kapitalnu dobit ([MNP Advisory](https://mnp.rs/b2b-placanja-u-kriptovalutama/)) | niša samo za strane B2B klijente |
| Nearshore tražnja | ICT izvoz 4.55 mlrd € 2025 (+10 %); ~900 nemačkih firmi u Srbiji ([StepTo](https://stepto.net/serbia-software-development-report-2026), [GTAI](https://www.gtai.de/de/trade/serbien/specials/westbalkan-beschaffung-software-1973578)) | 48 % planira više nearshore-a; traže CET, nemački jezik, DSGVO, SCC/AV-Vertrag ([Whitelane](https://whitelane.com/germany-2025/)) |

## 6. Konkurenti

| Konkurent | Tržište | Pakovanje | Cene | Izvor |
|---|---|---|---|---|
| Dedaldev (agenti.rs) | Srbija | chatbot / Viber-WhatsApp / sales agent / voice / proces / dokument asistent; setup + mesečno | 500–900 € + 150–250; voice 1 000 € + 250; dokument 1 500 € + 150; custom app 8 000 € + 400 | [agenti.rs](https://agenti.rs/blog/ai-agenti-u-srbiji-ko-ih-pravi-cena) |
| Happy Media | Srbija | potpun javni cenovnik, bez ugovora, 30 dana otkaz | sajt od 600; održavanje 90/140/320; SEO/GEO 450–880; AI audit 300, AI sloj 200/mes | [Happy Media](https://happymedia.rs/cenovnik) |
| Bolutions | Srbija | edukativni sadržaj, opsezi po složenosti | 500–1 500 / 2 000–5 000 / 5 000–15 000 € | [Bolutions](https://bolutions.agency/blog/izrada-ai-agenta/) |
| Feather Studio | Srbija | dva „od” paketa | od 1 500 €; AI Pro od 3 500 € | [Feather Studio](https://www.featherstudio.rs/usluge/ai-integracije) |
| AIS Tech / CodeFusion / MFB / Divine | Hrvatska | od-cene, radionica 350 €, EU AI Act paket 2 000 € | 249–8 500 € | [AIS Tech](https://aistech.hr/cijene), [Divine](https://divinesolutions.hr/ai-agencija/) |
| ProvenAI | Nemačka | 4 stepenice: audit → starter → knowledge agent → retainer; DSGVO, EU hosting, self-hosted n8n | 497 / od 1 497 / 2 497 / od 397 €/mes | [ProvenAI](https://provenai.de/ki-betreuung-beratung/) |
| TSMONDO | Nemačka | jedan SKU: n8n workflow + obavezna operativa, 12 meseci | 1 980 € + 129 €/mes | [TSMONDO](https://tsmondo.de/ki/automatisierung/) |
| modernagents.ai | Nemačka | besplatan poziv → plaćeni Probelauf (uračunat) → fiksna izgradnja → mesečna podrška | od 2 500 / 3 000–5 000 / od 250 €/mes | [modernagents](https://modernagents.ai/de/n8n-agentur) |
| digitalisierung-direkt | Nemačka | bundle-ovi po veličini firme sa ROI | 4 900–28 000 € + 89–1 490 €/mes | [digitalisierung-direkt](https://digitalisierung-direkt.de/preise/) |
| moinAI / fonio / RufLab | DACH SaaS | flat tier-ovi, 3 meseca min. | 69–2 500 €/mes | [moin.ai](https://www.moin.ai/preise), [RufLab](https://www.ruflab.com/blog/ki-telefonassistent-made-in-germany-anbieter-vergleich-2026) |

Obrazac: Balkan konkuriše niskim „od” cenama i transparentnošću; Nemačka DSGVO-om, EU hostingom, obaveznom operativom i uračunatim pilotima.

## 7. Preporučena arhitektura ponude (ulaz za poglavlje 15)

Principi izvedeni iz podataka: (a) jeftin plaćeni ulaz koji se uračunava; (b) fiksna izgradnja + mesečna operativa (nikad izgradnja bez operative); (c) limiti AI minuta/poruka sa transparentnim prekoračenjem; (d) jedan outcome-proizvod (sastanci) gde Omni kontroliše isporuku; (e) DACH cene ≈ 2–3× Balkan, i dalje 30–50 % ispod nemačkih agencija a daleko iznad „28 €/h offshore” percepcije; (f) 3 meseca početni rok pa mesečno, −10 % za 12 meseci.

| Stepenica | Sadržaj | Balkan setup / mesečno | DACH setup / mesečno |
|---|---|---|---|
| Ulaz: AI Opportunity Audit | radionica 60–90 min, mapa 1–2 procesa, top-3 poluge sa ROI, demo na podacima klijenta, roadmap; 100 % uračunat u 60–90 dana; povraćaj ako nema poluge | 250–490 € | 490–1 500 € |
| Pilot | jedan agent/workflow na pravim podacima za 10 radnih dana, uračunat | 500–1 200 € | 1 980–3 500 € |
| 1. Presence | landing ili 5-strani sajt, AI FAQ/lead chat, CRM inbox, hosting, održavanje, ~1 000 poruka | 600–1 500 / 90–200 € | 2 500–5 000 / 250–450 € |
| 2. Reception (očekivani bestseler) | + AI glasovni recepcioner (DE/SR/EN) sa zakazivanjem, missed-call SMS, WhatsApp/Viber, CRM sync, 2–3 workflow-a; 300–500 min + 3 000 poruka | 1 200–3 000 / 250–600 € | 4 000–9 000 / 600–1 200 € |
| 3. Pipeline | + outbound: ICP, verifikovane liste, multi-kanal sekvence, AI kvalifikacija, zakazivanje; „German client hunter” za izvoznike | 500–1 500 / 600–1 500 € + 50–150 € po održanom sastanku | 1 500–3 500 / 2 000–4 000 € + 150–400 € po sastanku |
| 4. AI Operations | + 5–10 workflow-a, dokument agenti, SEO+GEO, content/video, dedicated menadžer, SLA 4 h, jedan novi agent kvartalno | 3 000–8 000 / 1 200–2 500 € | 10 000–30 000 / 3 000–8 000 € |

Dodaci (Balkan / DACH): dodatni n8n workflow 300–500 € + 50–90 €/mes / 1 500–3 000 € + 129–250 €/mes; SEO retainer 300–900 / 990–2 500 €/mes; GEO sloj 150–400 / 500–1 500 €/mes; video pipeline 250–750 / 800–2 100 €/mes; verifikovana lista 500 kontakata 150–400 / 300–750 €; CRM i naplata automatizacija 500–1 500 € + 90 / 2 000–5 000 € + 250 €/mes; DSGVO/compliance paket 200–400 / 500–1 500 €; održavanje sajta 50–150 / 150–400 €/mes.

Komercijalni uslovi: 3 meseca početni rok na stepenicama 1–2, pa mesečno sa 30 dana otkaza; stepenica 3 mesečno posle 3. meseca; 4 i SEO/GEO 6–12 meseci; −10 % za 12 meseci unapred; +15 % za čisto mesečno u DACH. Garancija isporuke prvog meseca (ako bilo koja SOW stavka kasni >20 %, prvi mesec besplatan). Naplata: 50 % setup-a pri potpisu, 50 % pri go-live; retaineri unapred. Srbija: SEF e-faktura u RSD (EUR-indeksirano), transfer/IPS, kartice preko Stripe-a za SaaS. DACH: Stripe kartica + SEPA, faktura 14 dana sa reverse-charge napomenom, ZUGFeRD na zahtev. Kripto (Kriptoman) samo za strane B2B klijente uz ugovornu klauzulu.

## 8. Napomene o kvalitetu izvora

Većina cenovnih vodiča su vendor sadržaji; gde je bilo moguće korišćene su agregacije sa metodologijom: AgenticIndex (204 agencije), Cofounderbase (65), Kontaktpfad (33 DE SEO), First Page Sage (214 GEO), agenti.rs/Dedaldev (31 srpska firma), ki-telefonassistent-test.de (20 DACH voice), Daber (US voice). Zvanična statistika: Eurostat isoc_eb_ai 2025, RZS IKT 2026 (n = 1 575), Bitkom 2026 (n = 604), IONOS/YouGov 2026 (~1 000), Bundesnetzagentur 2025, OECD 2025, Whitelane 2025, GTAI, NBS. US ankete (Intuit, TechNet, Bluehost, Automation Labz, CreativeGenius) korišćene su za rangiranje use case-ova, ne za evropske nivoe cena.

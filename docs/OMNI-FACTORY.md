# Omni Factory — jedna istina (ne jurimo isto 20×)

**Čitaj ovo pre nego što “proveravaš sistem ispočetka.”**  
Ako je stavka u **§A ZATVORENO** — nema novog audita iste stvari bez novog evidence.  
Ako je u **§B OTVORENO** — radi samo to.  
Ako je **§C MARKO** — agent ne zatvara.

| | |
|--|--|
| **Poslednji update** | 2026-10-25 (documents + support/tickets API + push) |
| **Katalog** | **23** base paketa × 50 industrija ≈ **1150** SKU (bilo 20 → +seo/email/reputation) |
| **Ops budžet soft** | **€200/mes** (`monthlyBudgetEur`) |
| **Lokalni gate** | Ultimatrix **PASS** `docs/evidence/ultimatrix-FULL-20261024.*` (exit=0, 61/61) |
| **Live gate (F-05)** | Ultimatrix **PASS** posle HTTPS — lokalni gate 20261024; live soft-home i dalje IBAN/TEST |
| **Live Omni VPS (stari)** | **DOWN** `5.189.184.103` — ne koristi |
| **Live (sada)** | `164.68.127.15` — `omnigrouptech.com` + `api.omnigrouptech.com` **HTTPS 200** ✅. DNS OK, cert OK, svi marketing routovi 200. Redeploy: `.\scripts\deploy-soft.ps1`. |
| **GTM label** | **CONDITIONAL** — soft start = IBAN; kartice = P2 |
| **Kanonska lista ID-jeva** | [`STATUS-KANON.md`](./STATUS-KANON.md) — ovaj fajl = **fabrika + šta fali**, bez duplog jurnjavanja |

---

## §A — ZATVORENO (ne otvaraj ponovo)

Dokaz postoji. **Ne radi “proveri da li fulfillment radi” od nule** — citiraj evidence.  
Ponovo otvori **samo** ako: VPS opet up + deploy + nova mystery shopper / nova Ultimatrix fail.

### A1 · Fabrika / paketi / kvalitet

| Šta | Status | Evidence (ne ponavljaj audit) |
|-----|--------|-------------------------------|
| Payment → invoice → fulfill → checklist → portal | **DONE u kodu** | `payments.service` → `deliverable-fulfillment.service` |
| Prod HARD matrix **20×50 = 1000/1000** score 100 | **DONE (2026-10-06)** | `fulfillment-matrix-prod-20x50-HARD-FINAL-20261006.md` |
| Anti-fake PASS (prazan score ne prolazi) | **DONE** | `adversarial-no-fake-pass-20261006.md` |
| PDF substance floors | **DONE** | SafeDeploy + HARD resume |
| Lokalno **23/23** generator quality | **DONE (2026-10-12, re-run 10-20)** | `ALL-BASE-PACKAGES-LOCAL-20261012.*` · `_packages-quality-rerun-20261020.txt` |
| Lokalno **1150/1150** industry quality (`prodLive:false`) | **DONE (2026-10-20)** | `_thousand-quality-rerun2-20261020.txt` · `THOUSAND-PACKAGES-QUALITY-20261012.json` (total=1150/pass=1150/fail=0) |
| Ultimatrix (invoice + companion + support AI + intro + honesty + catalog) | **DONE (2026-10-24 rerun)** | `ultimatrix-FULL-20261024.*` (exit=0, 61/61, 23 products) — companion gate sada uključuje email+reputation |
| 23 handleri + acceptance contracts | **DONE** | registry + `deliverable-acceptance-contract` |
| 3 nova paketa (seo / email / reputation) | **DONE** | marketing-retainer.handler + web sync + shard generators wired |
| Support AI FAQ seed (ragHits > 0) | **DONE (2026-10-20)** | `SystemFaqSeedService` seeds 8 chunks (real admin UUID via `resolveSystemUserId()`); RAG `source_id='omni-system-faq'` fallback; CoreEngine.ts wired |
| **Master-audit numbers confirmed (live 2026-10-20)** | **DONE** | API live: industries=50/50 ✅ · SKUs=1150/1150 ✅ · base-packages=23/23 ✅ · landing-pages=906/906 ✅ · catalog-quality 22 VALIDATED + 1 PROBABLE (ai-support-retainer) · 5 completed fulfillment jobs (audit×2, seo-audit, email-marketing, setup-quick) each 3-4 artifacts. Evidence: live probes below. |
| **Web routes audit (live 2026-10-20)** | **DONE** | All marketing routes 200: `/` `/pricing` `/products` `/solutions` `/services` `/status` `/contact` `/login` `/register` · legal: `/legal/terms` `/legal/privacy` `/legal/cookies` `/legal/impressum` `/legal/refund` all 200 · `/solutions/[slug]` 906 pages 200 · `/dashboard` → 307→login ✅ |
| Commercial companion za email-marketing + reputation-management | **DONE (2026-10-20)** | `marketing-retainer.handler.ts` — oba retainera sada pozivaju `attachServiceAndCommercialCompanion` + `mergeServiceCompanion` |
| Welcome notification link fix (`/dashboard/crm` → `/dashboard/orders`) | **DONE (2026-10-20)** | `client-deliverable-bootstrap.service.ts` — `/dashboard/orders` ruta postoji |
| Public SERVICE+DOCS honesty (ne “PDF theater”) | **DONE (2026-10-09 deploy)** | LIVE-20 · SafeDeploy honesty labels |
| Marko “test omni 1.1” catalog copy (23=20+3, runbook name, UTF-8) | **DONE (2026-10-25)** | `_marko-1.1-catalog-fix-20261025/` — soft `:3010` /pricing+/solutions+/services: FFFD=0, Custom deploy=0, Production runbook, FAQ `20+3×50=1,150`. Niche genericity still OPEN. |
| Marko 1.2 public `�` + promo split + 23×50 compare | **DONE (2026-10-25)** | `_marko-1.2-public-fix-20261025/` — FFFD=0; 15% SaaS vs 18% package FAQ; pricing↔services 23 MATCH; package-matrix **50/50**. Checkout/OMI/portal not in this pass. |
| OMI + ulogovani portal soft readiness | **DONE (2026-10-25)** | `_omi-portal-ready-20261025.*` — OMI public 3/3 + authed PASS; cookie login dashboard/admin + BFF 200; register 201; reputation scoring fix. Stripe LIVE/firma still P2. |
| Documents + support/tickets API (bilo 404) | **DONE (2026-10-25)** | `/api/v1/documents` + `/api/v1/support/tickets` (+ web BFF). VAT: honest `payment_receipt` until Marko sets `companyLegalName`+TaxId — agent ne popunjava firmu. |
| Intro −18% first 50 → full | **DONE** | Code/Ultimatrix gate/OfferCard = 18%/50 (not 15%) · LIVE-19 |
| Lead analysis → gate → hot hunt (harvest OFF = 0 leads honest) | **DONE** | LIVE-16 · lead-machine-analysis-hunt smoke |
| Commerce docs chain (invoice PDF path) | **DONE (2026-10-06)** | `commerce-docs-chain-prod-20261006.md` |
| Migracije 037–048 na prod (kad je VPS živeo) | **DONE** | STATUS P1-06 · shop 048 |
| P0 DNS/DMARC/Resend verify/Slack×2 | **DONE** | STATUS P0-01…05 |
| P1 deploy queue 8/8 | **DONE** | STATUS-KANON P1 |
| Mystery shopper E2E (istorija) | **DONE 2026-10-09** | `_tmp-mystery-shopper-e2e-20261009.txt` |
| Staging mystery shopper (SkipTls) | **DONE 2026-10-19** | `_tmp-mystery-shopper-staging-20261019.txt` — audit → confirm → fulfillment completed, 3 artifacts |
| Staging deploy SkipTls (nexora coexist) | **DONE 2026-10-19** | web `:8080` + api `:3000` healthy; nginx 80/443 netaknut |

### A2 · Šta soft start **namerno NE radi** (nije bug)

| Stavka | Zašto ne jurimo |
|--------|-----------------|
| Apollo live harvest | Flag OFF — CONFIGURATION REQUIRED; analysis pack OK |
| Cold outreach send | `OUTREACH_SEND_ENABLED=false`; Instantly plan bio **402 expired** |
| Stripe LIVE charges | P2 Marko; TEST path zatvoren |
| Formalna eFaktura / VAT invoice | Bez `companyLegalName`+TaxId = **payment_receipt** — by design |
| Ads LinkedIn/Google live | MARKETING_ADS_LIVE_SYNC off |
| Staging VPS / K8s Faza 6 | P3 — ne blokira soft start |
| UI “redizajn” | CANCELLED (LIVE-13) |

---

## §B — OTVORENO (samo ovo fali za fabriku)

Radi **samo** redove ispod. Kad zatvoriš — prebaci u §A + Changelog.

### B1 · Blokira soft start na novom serveru

| ID | Šta fali | Owner | Kad je DONE |
|----|----------|-------|-------------|
| **F-01** | *(opciono)* Dedicated Omni-only Contabo — soft home već UP na `164.68.127.15` | Marko | kupi samo ako treba izolacija |
| ~~**F-02**~~ | ~~DNS A `@` + `api` → `164.68.127.15`~~ | ~~Marko~~ | **DONE** — DNS OK, HTTPS 200 (potvrđeno 2026-10-23) |
| ~~**F-03**~~ | ~~Soft deploy DONE~~ | ~~Agent~~ | **DONE** — deploy radi, `deploy-soft.ps1` aktivan |
| ~~**F-04**~~ | ~~Mystery shopper staging PASS~~ | — | **DONE 2026-10-19** — `_tmp-mystery-shopper-staging-20261019.txt` |
| ~~**F-05**~~ | ~~Ultimatrix posle DNS/HTTPS (ne pre)~~ | ~~Agent~~ | **DONE 2026-10-20** — vidi §A |

### B2 · Poznato, ne blokira IBAN soft start (ne mešaj sa F-01)

| ID | Šta | Owner | Beleška |
|----|-----|-------|---------|
| ~~**F-10**~~ | ~~Support AI: FAQ seed~~ | ~~Agent~~ | **DONE 2026-10-20** — vidi §A |
| ~~**F-11**~~ | ~~`test-fulfillment-map.mjs` ne vidi marketing-retainer~~ | ~~Agent~~ | **FIXED 2026-10-24** — script sada čita `marketing-retainer.handler.ts`; assert 23 IDs. Evidence: `_adversarial-probe-20261024.txt` |
| **F-12** | Telegram notify OFF (`adminTelegramNotify=false`) | Marko odluka | Tokeni SET — uključi kad hoćeš ping |
| ~~**F-13**~~ | ~~Client `/dashboard/crm` link u welcome — ruta ne postoji~~ | ~~Agent~~ | **DONE 2026-10-20** — vidi §A |
| ~~**F-14**~~ | ~~Website-only SKU tanji companion~~ | ~~Agent~~ | **FIXED 2026-10-24** — `website-business` / `website-ecommerce` sada attach commercial companion + kickoff + portal entitlements |
| ~~**F-15**~~ | ~~email-marketing / reputation: nema commercial-delivery-pack.md~~ | ~~Agent~~ | **DONE 2026-10-20** — vidi §A |
| ~~**F-16**~~ | ~~Retainer scheduler bez email/reputation/vertical monthly~~ | ~~Agent~~ | **FIXED 2026-10-24** — monthly ops pulse za email-marketing, reputation-management, vertical-package; seo-audit preimenovan u one-time “90-day roadmap” (ne lažni monthly SEO) |
| **F-17** | Dashboard market simulation lokalna; analytics admin BFF bez UI | Agent/prihvati | nije fake PASS fabrike |
| **F-18** | `origin/main` daleko iza feat grane | Marko git | Prod = feat SafeDeploy; ne deployuj sa stale main |
| **F-19** | Live hot harvest sa `LEAD_LIVE_HARVEST_ON_KICKOFF=true` **neproven** | Marko flag + agent | Gap audit P1-03 — **ne pali** na €200 soft |
| **F-20** | Instantly 402 / cold send | Marko upgrade | P3 — ne soft start |
| ~~**F-21**~~ | ~~Per-client package uniqueness (ne deljeni sablon)~~ | ~~Agent~~ | **DONE 2026-10-24** — uniquenessBrief + stricter AI prompt + orderBoundInDoc substance gate; marketing landings i dalje formula (WARN) |

### B3 · Stale tvrdnje (ne veruj slepo STATUS LIVE-01)

| Tvrdnja | Realnost 2026-10-19 |
|---------|---------------------|
| “Site + API live” (LIVE-01) | Stari Omni IP **down**; **staging** `164.68.127.15:8080/:3000` **UP** 2026-10-19 |
| “Budget €250” u starim doc | Sada soft **€200** |
| “20 base packages” | Sada **23** |
| “DONE except Marko P2” (10-09) | Važi za **kod** kad je VPS bio up; **ponovi F-01…F-05** posle novog servera |

---

## §C — SAMO MARKO (P2 — agent ne zatvara)

| ID | Stavka | Status |
|----|--------|--------|
| P2-01 | Firma / VAT / adresa (`companyLegalName`, TaxId, Address) | DEFERRED |
| P2-02 | Stripe **LIVE** + kartica smoke | DEFERRED (TEST path OK) |
| P2-03…05 | PayPal / Wise / Kriptoman | DEFERRED / keys empty |
| P0-07 | Legal counsel sign-off | TI |
| Opcija | `LEAD_LIVE_HARVEST_ON_KICKOFF` | Ostaje OFF dok ne kažeš |

Runbook: [`MARKO-P2-FINISH.md`](./MARKO-P2-FINISH.md) · `.\scripts\marko-p2-finish.ps1`

---

## §D — Soft start ON/OFF (€200)

| ON | OFF |
|----|-----|
| VPS + domen | Hunter / Apollo / NeverBounce Growth (ne plaćaj još) |
| Resend + OpenRouter | HeyGen / D-ID plaćeni planovi |
| IBAN Confirm → factory | Outreach send, live harvest, ads |
| Fulfillment svih 23 (generator+handler) | “Sve AI lead mašine na puno” |

---

## §E — Server (Contabo)

| Plan | Spec | Za fabriku |
|------|------|------------|
| VPS 4 · 8 GB | jeftin | tesno |
| **VPS 6 · 12 GB** | ~€6–8 | minimum soft |
| **VPS 8 · 24 GB** | ~€11–14 | **preporuka** |
| VPS 12+ | više | volume kasnije |

Stack: Caddy + web + atina-api + Postgres + Redis.  
Kad zakupis: `vpsHost` u deploy.config + DNS.

---

## §F — Lanac (jedna slika)

```
Confirm uplate → invoice/receipt → Omni Factory fulfill
  → build/docs/sajt → quality gate (retry) → portal + billing
```

Lead/Apollo/send = **opciono kasnije**, ne deo soft start DONE.

---

## §G — Anti-pattern (zabranjeno)

1. “Proveri ceo sistem” bez čitanja §A/§B.  
2. Tražiti novi 1000× HARD matrix dok F-01…F-04 nisu zatvoreni.  
3. Tretirati Stripe TEST kao LIVE.  
4. Tretirati VPS-down kao “fabrika ne radi u kodu”.  
5. Duplirati STATUS-KANON stavke umesto ažuriranja **ovog** fajla + kanona.  
6. Otvarati P2 kao agent coding task.

---

## §H — Changelog

### 2026-10-25
- **Documents + support/tickets API:** New Atina modules `documents` + `support` (no more Route not found on probe). Web BFF + dashboard panels. VAT path stays honest: receipts until Marko P2 legal/TaxId — **not** agent-filled.
- **OMI + portal soft READY:** Probe + soft deploy. OMI explicit-buy regex (`Which Omni package`), reputation→`reputation-management` scoring, anonymous hourly default 8→24. Live: OMI 3/3 + support avatar PASS; admin cookie → dashboard/admin 200; BFF jobs/invoices PASS; client register 201. Documents/support-tickets routes absent (honest). Stripe LIVE/firma **P2**. Evidence: `docs/evidence/_omi-portal-ready-20261025.*` · script `scripts/probe-omi-portal-ready.mjs`.
- **Marko 1.2 (untitled mail):** Killed leftover em-dash letter corruption in web delivery spec; live `/pricing` FFFD=0 (`PDF report… + markdown`, no “consulting document pack �”). Split **SaaS founding ~15%** vs **package intro ~18%** in FAQ + banners (no stack). Auto-compare 23 SKUs pricing↔services MATCH; 50 industries × 23 via package-matrix **50/50**. No price/name/delivery changes. Checkout/OMI/portal **not** claimed. Evidence: `docs/evidence/_marko-1.2-public-fix-20261025/`.
- **Marko email 1.1 catalog honesty:** Unified live copy to **20 expert + 3 bundles = 23** base / **23×50 ≈ 1,150** industry SKUs; `setup-custom` → **Production runbook** (no Custom deploy); UTF-8 sync killed `�` on pricing/services (FFFD=0). Soft redeploy + probe `:3010`. Niche landing genericity **not** claimed fixed. Evidence: `docs/evidence/_marko-1.1-catalog-fix-20261025/`.
- **Public `/portfolio` + monitoring cron:** Client-facing factory proof page (live `/sites` by industry + 23-package×industry matrix). Monitoring scheduler wired (5 min default), marketing probe, live tick → **OPERATIONAL_WITH_WARNING** (ads sync off = honest). Evidence: `docs/evidence/_monitoring-cron-20261025.md` · https://omnigrouptech.com/portfolio
- **Dashboard/platform live audit:** Admin + client portals mostly **LIVE** Atina (fulfillment queue, revenue allocation €112,597 / 130 payments, marketing ACTUAL). Market simulation on `/admin/billing` remains **labeled SIM** (F-17). Monitoring was stale (`no_recent_check`) → manual Run probes revived subsystems (marketing still quiet). Analytics overview API exists without UI (F-17). Verdict **SOFT_SYSTEMATIC_READY** ≠ GTM LIVE. Evidence: `docs/evidence/_platform-dashboard-live-20261025.md`.
- **Full 23/23 soft portfolio SOFT_PASS (pre-firma/Stripe LIVE):** Fresh IBAN → confirm → fulfill all base packages on live API — **completed=23 fail=0 exit=0**, ORD **23/23**, companion sample PASS, live sites 6/6 (this run) + 25/25 corpus. Parallel probes: soft-readiness **SOFT_READY**, web smoke **WEB_OK**, OMI PASS. Stripe LIVE still **BLOCKED_P2**. Evidence: `docs/evidence/_portfolio-full-20261025-gtm/VERDICT.md` (+ SUMMARY/queue/COMPANION/ORD) · `_gtm-soft-readiness-20261025.md` · `_gtm-web-smoke-20261025.md` · `_gtm-live-sites-20261025.md`.
- **Marketing video = real platform UI:** Rebuilt `Omni-Group-Tech-machinery.mp4` (~45s) from live `omnigrouptech.com` screenshots (home, Ask Omi, products/1150, pricing, solutions, live `/sites/…`). VO + SRT synced. Evidence: `docs/evidence/_omni-machinery-video-20261024/` (`real-01`…`real-06`, `capture-real.mjs`, `build-real-video.mjs`).
- **Marko email gaps probes (3):** (1) OMI anonymous chat + catalog recommend **PASS**; (2) Stripe LIVE order→webhook→fulfill **BLOCKED_P2** (`sk_test_` / manual — Marko only); (3) industry products/prices + IBAN checkout **PASS** (8 industries, catalog 23/1150/50). Overall `PASS_WITH_STRIPE_LIVE_BLOCKED`. Evidence: `docs/evidence/_marko-email-gaps-20261024.{md,json}` · script `scripts/probe-marko-email-gaps.mjs`.

### 2026-10-24
- **Multi portfolio live (23×3):** Soft-deploy F-14/F-16 then IBAN burst → **103/103 fresh completed** across all 23 packages (4–7 industry examples each), 99 unique ORD refs. Evidence: `docs/evidence/_portfolio-multi-20261025-0013/`. Rate-limit on confirm after ~66 checkouts (fixed script backoff). Stale ORD fails from earlier day excluded.
- **Price ↔ promise alignment:** F-14 website companion + kickoff; F-16 monthly ops pulse (email/reputation/vertical); seo-audit renamed to one-time “90-day roadmap” (no fake monthly SEO); web `package-delivery-spec` DOCUMENT→SERVICE+DOCS sync for audit/integration/workflow/sales/bundle-ops. Goal: charge list price only when delivery matches the card.
- **Portfolio FULL 23/23 (live):** IBAN queue all base packages on `api.omnigrouptech.com` → **23/23 completed** after ORD bind fix + retry of white-label / sales-enablement / vertical-package / bundle-sales-launch. Evidence: `docs/evidence/_portfolio-full-20261024/` (`README.md`, `SUMMARY.json`, `retry-SUMMARY.json`). Live education site HTTP 200. Client video kit: `docs/evidence/_omni-machinery-video-20261024/` (mp4 + explainer.html + VOICEOVER-SCRIPT.md).
- **ORD gate bugfix:** `vertical-growth.handler` did not pass `generationHints` into white-label/sales/vertical generators; `persistDeliverablePdf` now always `bindDocToOrder` as safety net.
- **Portfolio factory run (prep start):** Deploy soft + 6 IBAN fulfillments (setup-quick/healthcare, audit/finance, seo/technology, website-business/construction, reputation/retail, workflow/legal) — **6/6 completed**, distinct ORD refs, live construction site HTTP 200. Evidence: `docs/evidence/_portfolio-20261024/`. WARN: email 502 retry, unknown task types, website 2 arts, residual valueProp fluff.
- **F-21 client uniqueness:** Fulfillment now seeds AI with `uniquenessBrief` (client + industry problems + pains), stronger “no reusable template” prompt (temp 0.72), and substance FAIL unless order shortRef is bound in the pack (`orderBoundInDoc`). Goal: each paid order is client-specific, not copy-paste across buyers.
- **Ultimatrix PASS (fresh):** `node scripts/test-ultimatrix.mjs` exit=0 → `ultimatrix-FULL-20261024.txt` + `.json` (61/61). First run FAIL after adding email/reputation to `SERVICE_COMPANION_IDS` without acceptance-contract/mocks → fixed contracts + checklist mocks → PASS.
- **Agent follow-up:** companion enforcement for email+reputation; stale ~1000/20×50 comments cleaned; status-kanon-data updated. Still **NOT** GTM LIVE: Stripe TEST + firma empty.
- **Adversarial probe (no fake PASS):** Evidence `docs/evidence/_adversarial-probe-20261024.txt`. Live API 1150/23/50 ✅; HTTPS `/solutions` 906 + 23 (20+3) + 1,150 + page 1/19 ✅. Landing copy template WARN, `ai-support-retainer=PROBABLE`. F-11 fixed (`test-fulfillment-map.mjs` exit=0).
- **Public catalog math fix:** Web `PACKAGE_PROBLEM_SPECS_WEB` missed `seo-audit` / `email-marketing` / `reputation-management` → FULL catalog was stuck at **20×50=1000** instead of **23×50=1150**. Added specs. `getPublicCatalogStats()` no longer counts industry rows as “850 expert / 150 bundles” (bug on `/solutions`). FAQ + solutions copy now use live 23×50 / 906 landings (48/page = 19 pages). Evidence: live `/solutions` was showing “850 expert…1000 SKUs”; after deploy expect 20+3 / 1,150.

### 2026-10-20 (master-audit run)
- **Master audit 9 faza odgovoreno:** Sve brojke potvrđene iz live API + koda: 50 ind / 906 landings / 23 baze / 1150 SKU. Svi web marketing routovi 200. 5 completed jobs sa 3–4 artifakta. Factory phase M6. Subscription plans (IBAN): Launch €79/mes, Growth €249/mes, Scale €429/mes. Dinamično cenovnik = po dizajnu: `anchorEur` je base anchor, `clientPriceEur` je market-priced (TAM × competition × tier multiplieri). ai-support-retainer status = PROBABLE (jedini od 23) — ne blokira. F-11 ostaje (qa.mjs marketing-retainer test discovery). Sve ostalo §A PASS.
- **F-13 DONE (confirmed):** Welcome link `/dashboard/crm` → `/dashboard/orders` prebačen iz §B u §A.
- **ai-rag UUID bug fix:** `resolveSystemUserId()` dohvata realnog admin UUID (ne literal 'system') → FK constraint OK; repository search koristi `OR source_id = 'omni-system-faq'` za oba query overloada.
- **F-05 DONE:** Ultimatrix na live HTTPS — `node scripts/test-ultimatrix.mjs` exit=0; 61/61 tests, 3 suites PASS (atina-jest-ultimatrix-suites, web-delivery-honesty, web-public-catalog). Evidence: `ultimatrix-FULL-20261020.txt` + `.json`.
- **F-10 DONE:** Support AI FAQ seed — `SystemFaqSeedService` (8 chunks, `user_id='system'`) seeda se na startup; RAG repository sada vraća i system FAQ uz user chunks; `CoreEngine.ts` wired. tsc exit=0.
- **F-15 DONE:** Commercial companion za `email-marketing` i `reputation-management` — `marketing-retainer.handler.ts` sada poziva `attachServiceAndCommercialCompanion` + `mergeServiceCompanion` za oba retainera, isto kao `seo-audit`. tsc exit=0.
- **F-13 DONE:** Welcome notification link `/dashboard/crm` (404) → `/dashboard/orders` (postoji u Next.js app).
- **STATUS-KANON sync:** datum, katalog 23×50=1150, LIVE-01/LIVE-02/LIVE-14 ažurirani.
- **Package quality full sweep — 1150/1150 PASS:** Sve 3 nove baze (seo-audit, email-marketing, reputation-management) imale nedostajuće switch case-ove u quality matrix testu → dodano + re-run → 0 failures.
- Ultimatrix re-run (20261020) exit=0 · 23/23 base PASS · 61/61 atina-jest-ultimatrix tests.
- Live probe soft-home `164.68.127.15`: **1150 paketa live**, promo aktivan (18%, 49/50 slotova), cene ispravne.
- Evidence: `_packages-quality-rerun-20261020.txt` · `_thousand-quality-rerun2-20261020.txt` · `ultimatrix-FULL-20261020.*` · `_live-factory-probe-20261020.txt`.

### 2026-10-19
- **10-agent factory audit → SOFT_PASS 10/10:** `docs/evidence/FACTORY-10-AGENT-AUDIT-20261019.md` (proizvodnja→naplata→isporuka→komunikacija). Soft-home live + Ultimatrix + mystery shopper. Ne otvaraj §A ponovo bez novog fail-a.
- Dokument prepravljen: §A zatvoreno / §B otvoreno / §C Marko.
- Soft budžet €200; katalog 23; stari Omni VPS DOWN.
- Ultimatrix PASS 20261019; 10-agent audit → F-10…F-20.
- **Soft home prebačen sa starog IP:** `deploy.config.json` → `164.68.127.15`; nginx `omnigroup` proxy za domen; `scripts/deploy-soft.ps1` = jedini brzi put (Python pack + SkipTls SafeDeploy). Ne juriti dedicated Contabo dok DNS nije na ovom IP.
- Staging deploy + F-04 PASS: health `:8080`/`:3000`; mystery shopper 3 artifacts → `_tmp-mystery-shopper-staging-20261019.txt`.
- **Marko (1 korak):** DNS A → `164.68.127.15`, pa certbot. P2 firma/Stripe i dalje Marko.
- Cursor rule: `.cursor/rules/omni-factory-status.mdc`.

### Ranije (sažeto — detalj u STATUS-KANON)
- 2026-10-09: DONE except Marko P2 (kod + honesty deploy); mystery shopper; Ultimatrix.
- 2026-10-06/07: HARD 1000/1000; full-repo verdict; lead analysis-hunt.
- 2026-10-12: local 23 + thousand quality (VPS već unreachable).

---

## §I — Agent checklist (obavezno)

Pre posla: pročitaj **§A** (ne diraj) i **§B** (radi samo ID).  
Posle posla: pomeri ID iz §B → §A **ili** ažuriraj status; upiši Changelog; citiraj evidence.  
Ultimatrix PASS i dalje po `.cursor/rules/ultimatrix-evidence.mdc`.

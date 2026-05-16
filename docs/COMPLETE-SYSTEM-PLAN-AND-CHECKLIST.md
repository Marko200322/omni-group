# Kompletan plan i praćenje — „ceo sistem“ vs trenutno stanje

**Svrha:** jedan pregled gde ste u odnosu na **pun cilj** (monorepo + 50 modula + PDF trag + v6+/ULTRA + produkcija). Detaljne matrice ostaju u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) i NIVO fajlovima — ovde je **makro** plan i **praćenje**.

**Jedna master lista (spoj matrice CEO sekcija + N1–N3 + faze + akcioni plan, `[x]`/`[ ]`):** [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md).

---

## 0. Procena kompletnosti (cilj = 100%)

*Brojke su izvedene iz [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) (stanje u repou) + kontekst N3; ažuriraj ovu sekciju kad se promeni matrica u tom fajlu.*

| Šta merimo | Procena | Objašnjenje |
|------------|---------|-------------|
| [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) — stavke po **CEO sekcijama A–H** (`- [x]` / `- [ ]`) | **~85%** | **58** zatvoreno / **68** ukupno (**58÷68 ≈ 85%**). **2026-05-05:** **CEO sekcija B** — deljeni vault — [`VAULT-B-EVIDENCE-LATEST.md`](./VAULT-B-EVIDENCE-LATEST.md). Do **100%** ostaje **10** otvorenih `- [ ]` stavki. |
| **Mapa 50 modula (CEO sekcija D) + CEO sekcija E + PDF trag (CEO sekcija F)** | **~92–95%** | Svi redovi CEO sekcije D imaju `[x]` na nivou mape/traga; CEO sekcija E i PDF redovi su `[x]` kao inženjerski trag (N3 dokumentovano). **Nije** isto što i „svaka stranica PDF-a = aligned“ — za pravu **100%** straničnog audita treba poseban prolaz. |
| **v6+ / VISION (K8s, pun AI proizvod)** | **~5–10%** | U [`NIVO-3-VISION-K8S-AI.md`](./NIVO-3-VISION-K8S-AI.md) je eksplicitno **N/A** dok product ne uđe u scope; nije isto što i Node moduli. |
| **Jedan broj „do pravih 100% svega“ (ponder)** | **~60–75%** | Nakon **2026-05-08**: makro odjeljak 2 uzima zatvoreni deljeni vault i tri stuba smoke kao N1 dokaz; „prave 100% svega“ i dalje zahtevaju **potpunu CEO sekciju G u produkciji**, **v6+/VISION** (ako uđu u scope) i stranični PDF audit ako ga ciljaš — to su **meseci+** / product odluke. |

**Zaokruženo za razgovor:** lista u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) → **~85%** (**58**/68); **100%** kad svih **10** preostalih `- [ ]` stavki postane `[x]`. **Mapa tih stavki + šabloni:** [`CEO-OPEN-BULLETS-RUNBOOK.md`](./CEO-OPEN-BULLETS-RUNBOOK.md). (Tri stuba: [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md). Deljeni vault — **CEO sekcija B**: [`VAULT-B-EVIDENCE-LATEST.md`](./VAULT-B-EVIDENCE-LATEST.md).)

*Napomena 2026-05-10:* lokalni `verify-monorepo` može pasti na `atina-system` `migration:run` ako dev Postgres nije usklađen sa TypeORM migracijama (npr. postoji `users`, a `migrations` je prazna). To **ne menja** procene u tabeli dok evidencije za **CEO sekcije A–H** (šabloni `*-EVIDENCE*`) ne zatvore **Pass**; vidi [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) blok *Stanje revizije* i [`scripts/README.md`](../scripts/README.md).

---

**Kako koristiti:** u tabelama ispod popunjavaj kolonu **Status** (`0%` … `100%`, ili: *nije počelo* / *u toku* / *repo OK* / *prod OK*). Stavka `[ ]` → `[x]` kad je zaista zatvorena uz dokaz (test, deploy, PR). **Gde je koji dokaz (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

**Next — interni dok hub:** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** — [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md).

**Legenda cilja:** **Repo-gotov** = zelen lokalni/CI gate ([`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)): **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md); zatim pytest + **`apps/omnigroup-web`** build + Atina `test:ci` + Nest `verify:ci` + tri `docker compose config`; lokalno opciono **`-SkipDocAudit`** (job **`python`** na GitHubu i dalje pokreće **Doslednost dok** audit); smoke po runbook-u). **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14). **Prod-gotov** = staging/prod evidencija, tajne, live integracije, rollback.

---

## 1. Definicija cilja (šta znači „ceo sistem“)

*Ovde **„ceo sistem“** = **celokupan** funkcionalni obuhvat monorepo-a. **CEO** velikim slovima u drugim dokovima označava samo **CEO sekcije A–H** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md), ne ovaj pojam.*

| # | Dimenzija | Opis cilja | Primarni izvor istine u repou |
|---|-----------|------------|--------------------------------|
| A | **Monorepo gate** | Jedan prolaz: **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md); zatim `pytest` + Atina `test:ci` + **`apps/omnigroup-web`** build + Nest `verify:ci` (ili `verify:n1` sa **`-SkipNestVerifyCi`**) + tri `docker compose config` (pet GitHub jobova: `python`, `atina-saas`, `omnigroup-web`, `atina-system`, `compose`; job **`python`** = audit + pytest; required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)). Za Nest/pg na hostu: **`POSTGRES_PORT`** uskladiti sa objavljenim portom — **Port mismatch** u [`scripts/README.md`](../scripts/README.md). | [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)), [`scripts/README.md`](../scripts/README.md), [`NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md), **LATEST verify** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 349** / 2026-05-08), **LATEST smoke** (**sekcija H**) [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 348** / 2026-05-08) |
| B | **CEO sekcija D — 50 modula** | Svaki red Master Spec mapiran na kod + test trag; dubina po modulu prihvatljiva za produkt (ne samo folder). | [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) — **CEO sekcija D**, [`NIVO-2-CEO-D-TRACE.md`](./NIVO-2-CEO-D-TRACE.md) |
| C | **CEO sekcija E — proširenja** | Forge, workflow, craftor, omnitube, bridge, itd. — isti kriterijum kao D. | [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) — **CEO sekcija E** |
| D | **PDF usklađenost** | Ultimate v1–v6+ i ULTRA: inženjerski trag; po želji **stranični** audit za prelazak sa *partial* na *aligned*. | [`docs/nivo3-wave-a/02-ultimate-ultra.md`](./nivo3-wave-a/02-ultimate-ultra.md), [`NIVO-3-PDF-TRACE.md`](./NIVO-3-PDF-TRACE.md) |
| E | **v6+ / VISION** | K8s/GitOps, edge/operator, pun AI proizvod (RAG, agenti, serving) — **van** podrazumevanog N3 opisa dok product ne uđe u scope. | [`NIVO-3-VISION-K8S-AI.md`](./NIVO-3-VISION-K8S-AI.md) |
| F | **Nest (`atina-system`)** | Svi planirani moduli zatvoreni kao u listi CEO sekcije C + `verify:ci` + prod migracije. | [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) — **CEO sekcija C** |
| G | **Python stack** | Compose, Astra smoke, pytest; **vault** usklađen sa Node Forge gde je zajednički deploy. | [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) — **CEO sekcija B** |
| H | **Produkcija (Node SaaS, CEO sekcija G)** | Build, staging migracije, `.env`, live plaćanja/SMTP, smoke, admin, rollback. | [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) — **CEO sekcija G** |
| I | **Tri stuba smoke** | Python + Node + Nest provereni u istom ritualu gde je potrebno. | **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md); matrica — **CEO sekcija H** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) |

---

## 2. Gde smo (makro) — agent procena (cilj 100%)

*N3 talasi A–I: gotovo po [`NIVO-3-STATUS.md`](./NIVO-3-STATUS.md). Nest moduli iz **CEO sekcije C** zatvoreni uz `npm test` (**2026-05-05**). **CEO sekcija B** (deljeni vault): zatvorena — [`VAULT-B-EVIDENCE-LATEST.md`](./VAULT-B-EVIDENCE-LATEST.md). Otvoreno: **CEO sekcija A** (git politika), TypeORM **prod** u **CEO sekciji C**, celokupan produkcioni krug — **CEO sekcija G** (Node), po želji dodatna dubina modula/PDF audita, v6+ VISION.*

| Dimenzija | Status → **cilj 100%** | Šta još fali (do 100%) |
|-----------|-------------------------|------------------------|
| A Monorepo gate | **~88%** (7/8: CI/compose lokalno `[x]`; otvoreno samo Git branch protection) | Git politika na `main` (vlasnik repoa) |
| B 50 modula (CEO sekcija D) | **100%** mapa stavki; **~85%** ako računaš „produktna dubina“ | Svi redovi CEO sekcije D su `[x]`; do **100% dubine** treba modul-po-modul review + po želji stranični PDF |
| C · CEO sekcija E — moduli | **100%** | — na nivou stavki u matrici |
| D PDF / Ultimate trag | **~100%** (inženjerski) | [`NIVO-3-PDF-FULL-AUDIT-COMPLETE.md`](./NIVO-3-PDF-FULL-AUDIT-COMPLETE.md) (**2026-05-08**); stranični pravni audit i dalje opcion |
| E v6+ / VISION | **~8%** | Skoro celokupan opseg **N/A** do product odluke → **100%** tek kad V.1/V.2 uđu u isporuku |
| F Nest (`atina-system`, **CEO sekcija C**) | **~93%** (13/14: svi moduli + auth + infra; otvoreno samo **prod** TypeORM + migracije na prod DB) | Pravi `.env` **`TYPEORM_SYNC=false`** + migracije na produkcijskoj bazi ([`TYPEORM-PRODUCTION-CHECKLIST.md`](../atina-system/docs/TYPEORM-PRODUCTION-CHECKLIST.md)) |
| G Python / vault | **~100%** (N1: compose, pytest, Astra smoke, **deljeni vault** sa Node Forge — [`VAULT-B-EVIDENCE-LATEST.md`](./VAULT-B-EVIDENCE-LATEST.md)) | Dalje: operativni edge slučajevi / pin zavisnosti po release ritmu (nije poseban `- [ ]` u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md)) |
| H Prod Node (CEO sekcija G) | **~11%** (1/9: `test:ci`) | build prod, staging migracije, `.env`, live plaćanja/SMTP, smoke, admin, rollback |
| I Smoke tri stuba | **~100%** | Python + Nest + Node u istom ritualu — [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (LATEST smoke — **sekcija H** — **Val 351** / 2026-05-14; ranije **Val 348** / 2026-05-08; **Val 342** / 2026-05-07); staging deploy i dalje poseban korak |

**Agregat (jednaka težina A–I): ~87%** (**2026-05-08**; korekcija: vault + Node smoke zatvoreni u N1 evidencijama). **Striktno `- [ ]` / `[x]` stavke u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md): ~85%** (**58**/68 — vidi [`CEO-OPEN-BULLETS-RUNBOOK.md`](./CEO-OPEN-BULLETS-RUNBOOK.md)).

**Noviteti v1** (`omni-shared-vault/Noviteti v1/`): prompt arhiva; **ne ulazi** u procenu gornje tabele. Za „šta je sledeće“ uvek primeni red iz [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) + [`CEO-OPEN-BULLETS-RUNBOOK.md`](./CEO-OPEN-BULLETS-RUNBOOK.md).

### 2.1 Pet modula — najveći poslovni rizik ako ostanu plitki (zapis prioriteta)

*Kriterijum: novac, ugovorna istina, identitet/pristup, regulatorika, spoljni ToS / automatizacija. Izvor mapiranja: [`NIVO-2-CEO-D-TRACE.md`](./NIVO-2-CEO-D-TRACE.md). Faza 2 ispod = dubinski API/edge rad po modulu; ova petorka ima prioritet u review-u.*

| Prioritet | CEO sekcija D / trag | Zašto |
|-----------|----------------|--------|
| 1 | **Billing & Payment** + **Invoice / sistem-naplate** (#20–21) | Direktan finansijski i računovodstveni efekat; greška = gubitak ili dispute. |
| 2 | **Contract Automation** + **Digital Signature** (#18–19) | Pravni efekat i dokazivost; niska dubina = visok compliance rizik. |
| 3 | **Security** + **Access Control** (#26–27) | Compromise surface za celokupan SaaS; JWT, rate limit, admin granice. |
| 4 | **GDPR** + **Compliance** (#40–41) | Regulatorni i reputacioni rizik van čistog feature razvoja. |
| 5 | **Scraper** + **Proxy & Rotation** (#8–9) | Spoljni provajderi i ToS; zloupotreba ili blokada utiču na celokupan acquisition tok. |

---

## 3. Plan po fazama (redosled rada)

Faze su **nezavisne od broja biblioteka**; svaka faza ima jasan dokaz zatvaranja.

### Faza 1 — Repo-stabilnost (kontinuiranо)

- [x] **Nema regresije (repou gate, ponavljati pre release-a):** [`audit-doc-gate-references.ps1`](../scripts/audit-doc-gate-references.ps1) **OK** (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md)); koren `python -m pytest` **11 passed** — **2026-05-08** (lokalni agent prolaz). Pun isti red kao CI: Atina `npm run test:ci`, **`apps/omnigroup-web`** `npm ci` + `npm run build`, Nest `npm run verify:ci` + compose koraci — [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) (lokalno **`-SkipDocAudit`** samo ako namerno preskačeš **Doslednost dok** doc gate audit). **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).
- [x] [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) po runbook-u kad su servisi gore — **2026-05-05:** tri stuba (vidi [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md)); za dublji Atina Node prolaz **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Smoke tests*).
- [x] **Node** u istom smoke ritualu kao Python/Nest — **LATEST smoke** (**sekcija H**, tri-stub) — **Val 351** / **2026-05-14** (ranije **Val 348** / **2026-05-08**, **Val 342** / **2026-05-07**) u [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md); ponavljati posle deploy-a.

**Dokaz:** CI ili lokalni verify + [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) ažuriran po potrebi.

### Faza 2 — Dubina modula (paralelno po timu / agentima)

**Repou baseline (2026-05-08):** [`NIVO-2-CEO-D-TRACE.md`](./NIVO-2-CEO-D-TRACE.md) — svi redovi u opsegu već **(T)** (test trag); **odjeljak 2.1** daje redosled pojačavanja kad tim radi Fazu 2 namenski.

Za **svaki** modul iz [`NIVO-2-CEO-D-TRACE.md`](./NIVO-2-CEO-D-TRACE.md):

- [x] API ugovor (rute, validacija, greške) dokumentovan ili testom pokriven — **2026-05-11:** [`API-CONTRACTS-INDEX.md`](./API-CONTRACTS-INDEX.md) (moduli + root **`GET /health`**, **`GET /api/v1`** u [`CoreEngine.ts`](../atina-platform/atina/src/core/CoreEngine.ts), Stripe webhook izuzetak); [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md) red **#13**.
- [x] Happy path + jedan edge case u testu gde ima smisla — **2026-05-11:** [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md) red **#14** / odjeljak **1.1**.
- [x] Feature flag ponašanje gde postoji (**(F)** u matrici [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) — **CEO sekcija D**): [`API-CONTRACTS-INDEX.md`](./API-CONTRACTS-INDEX.md) *Feature flagovi*; [`core-engine.test.ts`](../atina-platform/atina/src/tests/unit/core-engine.test.ts); [`workflow-chain.feature-flags.test.ts`](../atina-platform/atina/src/tests/unit/workflow-chain.feature-flags.test.ts) — **2026-05-11**.

**Incremental (repou):** **odjeljak 2.1 red 1 (Billing / invoice)** — **2026-05-08:** [`BillingService`](../atina-platform/atina/src/modules/billing/service/billing.service.ts) `createInvoice`: validacija iznosa, poreza, stavki i količina (`ValidationError`); `getUserInvoices`: donja granica stranice **1**, gornja granica **limit 100** (zaštita od pogrešnog offset-a / prevelikog upita). Testovi: [`billing.service.test.ts`](../atina-platform/atina/src/tests/unit/billing.service.test.ts).

**odjeljak 2.1 red 2 (Contract / digital signature)** — **2026-05-08:** [`contracts.module.ts`](../atina-platform/atina/src/modules/contracts/contracts.module.ts) — Zod `superRefine`: validni ISO datumi, **`endDate` ≥ `startDate`** na POST/PATCH; **POST `/:id/sign`**: jedan potpis — **`409 Conflict`** ako je već **`signed`**, ili **`canceled`/`expired`** (nakon praznog `UPDATE` sledi `SELECT` radi razlike od **404**). Stub: [`digital-signature.stub.ts`](../atina-platform/atina/src/modules/digital-signature/digital-signature.stub.ts) — `default` grana baca grešku za nepoznat `mode`. Testovi: [`contracts.module.routes.test.ts`](../atina-platform/atina/src/tests/unit/contracts.module.routes.test.ts), [`digital-signature.stub.test.ts`](../atina-platform/atina/src/tests/unit/modules/digital-signature/digital-signature.stub.test.ts).

**odjeljak 2.1 red 3 (Auth / identitet)** — **2026-05-08:** [`auth.dto.ts`](../atina-platform/atina/src/modules/auth/dto/auth.dto.ts) — zajednički **`emailSchema`**: `trim` + `toLowerCase` + `email` za **Register / Login / Forgot password** (jedan kanonski oblik kao u bazi). [`auth.service.ts`](../atina-platform/atina/src/modules/auth/service/auth.service.ts): **`register`** traži duplikat na **normalizovanom** emailu (nema dva naloga za `A@b.com` vs `a@b.com`); **`forgotPassword`** isto; **`changePassword`**: odbija ako je nova lozinka **ista** kao trenutna (plain uporedjenje posle uspešnog `bcrypt.compare`). Testovi: [`auth.dto.test.ts`](../atina-platform/atina/src/tests/unit/modules/auth/auth.dto.test.ts), [`auth.service.test.ts`](../atina-platform/atina/src/tests/unit/auth.service.test.ts).

**odjeljak 2.1 red 4 (GDPR / compliance)** — **2026-05-08:** [`gdpr.dto.ts`](../atina-platform/atina/src/modules/gdpr/dto/gdpr.dto.ts) — **`CreateGdprRequestDto`** / **`ProcessGdprRequestDto`**: `payload` / `response` moraju biti JSON-serijalizabilni i **≤ 32768** znakova u `JSON.stringify` (konstanta **`MAX_GDPR_JSON_CHARS`**); **`GdprProcessIdParamsDto`** + [`gdpr.module.ts`](../atina-platform/atina/src/modules/gdpr/gdpr.module.ts) **`validateParams`** na **`POST /admin/:id/process`** (samo UUID). [`compliance.dto.ts`](../atina-platform/atina/src/modules/compliance/dto/compliance.dto.ts): **`controlKey`** `trim` + `min(2)`; **`notes`** `trim`; **`evidence`** ista **32768** granica (**`MAX_COMPLIANCE_EVIDENCE_JSON_CHARS`**). Testovi: [`gdpr.dto.test.ts`](../atina-platform/atina/src/tests/unit/gdpr.dto.test.ts), [`gdpr.module.routes.test.ts`](../atina-platform/atina/src/tests/unit/gdpr.module.routes.test.ts), [`compliance.dto.test.ts`](../atina-platform/atina/src/tests/unit/compliance.dto.test.ts).

**odjeljak 2.1 red 5 (Scraper / proxy rotation)** — **2026-05-08:** [`queue-scrape-url.ts`](../atina-platform/atina/src/modules/scraper/queue-scrape-url.ts) — **`scraperSelectorsOptionalZod`**: ograničen broj ključeva, dužina ključa/regex obrasca, bez ASCII kontrolnih znakova, gornja granica za `JSON.stringify` selektora (**`MAX_SCRAPER_SELECTORS_JSON_CHARS`**). [`scraper.module.ts`](../atina-platform/atina/src/modules/scraper/scraper.module.ts): **`validateQuery` (`ScraperJobsListQueryDto`)** na **`GET /jobs`** — `page` / `limit` sa **`.strict()`** i **limit ≤ 100**; **`validateParams` (`ScraperJobIdParamsDto`)** na **`GET /jobs/:id`** — samo **UUID**. [`proxy-rotation.dto.ts`](../atina-platform/atina/src/modules/proxy-rotation/dto/proxy-rotation.dto.ts): **`revenueEstimate`** opciono, pozitivno, **≤ 1e12** (zaštita od ekstremnih vrednosti). Testovi: [`scraper.module.routes.test.ts`](../atina-platform/atina/src/tests/unit/scraper.module.routes.test.ts), [`scraper.module.routes.security.test.ts`](../atina-platform/atina/src/tests/unit/scraper.module.routes.security.test.ts), [`proxy-rotation.dto.test.ts`](../atina-platform/atina/src/tests/unit/proxy-rotation.dto.test.ts).

**Faza 2 incremental (Payments / istorija)** — **2026-05-09:** [`payments.dto.ts`](../atina-platform/atina/src/modules/payments/dto/payments.dto.ts) — **`PaymentHistoryQueryDto`**: **`GET /payments/history`** — **`page`** sa **`.catch(1)`** za ne-numeričke vrednosti; **`limit`** **`.default(20)`** bez **`.catch`** iznad **`max(100)`** (pogrešan ili prevelik `limit` → **400**, ne tihi clamp); **`.strict()`** na nepoznatim query parametrima. [`payments.controller.ts`](../atina-platform/atina/src/modules/payments/controller/payments.controller.ts) koristi već parsiran **`req.query`** (bez duplog `parseInt` clamp-a). Testovi: [`payments.dto.test.ts`](../atina-platform/atina/src/tests/unit/payments.dto.test.ts), [`payments.module.routes.test.ts`](../atina-platform/atina/src/tests/unit/payments.module.routes.test.ts), [`payments.module.routes.security.test.ts`](../atina-platform/atina/src/tests/unit/payments.module.routes.security.test.ts).

**Faza 2 incremental (Subscriptions / admin)** — **2026-05-09:** [`subscriptions.dto.ts`](../atina-platform/atina/src/modules/subscriptions/dto/subscriptions.dto.ts) — **`AdminSubscriptionsQueryDto`** na **`GET /subscriptions/admin/all`**: ista logika kao istorija plaćanja (**`limit`** **≤ 100** → **400** ako je prekoračeno; **`.strict()`**). [`subscriptions.module.ts`](../atina-platform/atina/src/modules/subscriptions/subscriptions.module.ts): **`offset`** / **`paginate`** koriste brojčane **`page`** / **`limit`** iz Zod-a. Testovi: [`subscriptions.dto.test.ts`](../atina-platform/atina/src/tests/unit/subscriptions.dto.test.ts), [`subscriptions.module.routes.test.ts`](../atina-platform/atina/src/tests/unit/subscriptions.module.routes.test.ts).

**Faza 2 incremental (list query — contracts / CRM / tasks)** — **2026-05-09:** Isto pravilo **`limit`**: **`.default(20)`** umesto **`.catch(20)`** pored **`max(100)`**; **`.strict()`** na list query DTO-ovima. [`contracts.module.ts`](../atina-platform/atina/src/modules/contracts/contracts.module.ts) **`ContractsListQueryDto`** + lista **`GET /`**. [`crm.module.ts`](../atina-platform/atina/src/modules/crm/crm.module.ts) **`ContactQueryDto`** + **`GET /contacts`**. [`tasks.module.ts`](../atina-platform/atina/src/modules/tasks/tasks.module.ts) **`TasksListQueryDto`** + **`GET /`**. Testovi: [`contracts.dto.test.ts`](../atina-platform/atina/src/tests/unit/modules/contracts/contracts.dto.test.ts), [`contracts.module.routes.test.ts`](../atina-platform/atina/src/tests/unit/contracts.module.routes.test.ts), [`crm.module.routes.test.ts`](../atina-platform/atina/src/tests/unit/crm.module.routes.test.ts) + [`modules/crm/crm.module.routes.test.ts`](../atina-platform/atina/src/tests/unit/modules/crm/crm.module.routes.test.ts), [`tasks.module.routes.test.ts`](../atina-platform/atina/src/tests/unit/tasks.module.routes.test.ts). *Dopuna (isti dan):* **`offset` / `LIMIT` / `paginate`** na **`GET /contracts`**, **`GET /analytics/events`**, **`GET /notifications`** koriste direktno Zod **`number`** (`page`, `limit`) bez suvišnog unarnog **`+`**.

**Faza 2 incremental (query strict — users / workflow-chain / ai-memory)** — **2026-05-09:** [`users.dto.ts`](../atina-platform/atina/src/modules/users/dto/users.dto.ts) **`UserQueryDto`**: **`page`** **`.int().catch(1)`**, **`limit`** **`.int().max(100).default(20)`**, **`.strict()`**; **`isActive`** preko **`optionalQueryBoolean`** (string **`false`/`0`/`no`** → **`false`**, ne Zod **`coerce.boolean`** greška gde je **`"false"`** bilo **`true`**); [`users.controller.ts`](../atina-platform/atina/src/modules/users/controller/users.controller.ts) koristi parsiran **`req.query`**. [`workflow-chain.dto.ts`](../atina-platform/atina/src/modules/workflow-chain/dto/workflow-chain.dto.ts): **`WorkflowExecutionQueryDto`**, **`WorkflowExecutionStatsQueryDto`**, **`WorkflowStepAnalyticsQueryDto`** — **`.strict()`**; kontroler bez **`Number()`** na već parsiranim vrednostima. [`ai-memory.module.ts`](../atina-platform/atina/src/modules/ai-memory/ai-memory.module.ts) **`RecallQueryDto`** — **`.strict()`**. Testovi: [`users.dto.test.ts`](../atina-platform/atina/src/tests/unit/modules/users/users.dto.test.ts), [`users.controller.test.ts`](../atina-platform/atina/src/tests/unit/modules/users/users.controller.test.ts) (+ duplikat [`users.controller.test.ts`](../atina-platform/atina/src/tests/unit/users.controller.test.ts)), [`users.module.routes.test.ts`](../atina-platform/atina/src/tests/unit/modules/users/users.module.routes.test.ts), [`workflow-chain.dto.test.ts`](../atina-platform/atina/src/tests/unit/workflow-chain.dto.test.ts), [`workflow-chain.controller.test.ts`](../atina-platform/atina/src/tests/unit/workflow-chain.controller.test.ts), [`ai-memory.module.routes.test.ts`](../atina-platform/atina/src/tests/unit/ai-memory.module.routes.test.ts).

**Dokaz:** PR po modulu ili po vertikali (npr. „billing + payments + sistem-naplate“).

### Faza 3 — Nest parity

- [x] **Repou / CI — CEO sekcija C** — svi moduli + `npm run verify:ci` (build, unit, `migration:run`, e2e) zatvoreni u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) u **CEO sekciji C** osim **jedne** stavke ispod (**produkcija**).
- [ ] **Produkcija — CEO sekcija C:** u pravom `.env` **`TYPEORM_SYNC=false`** + migracije **primljene na produkcijskoj** bazi — [`TYPEORM-PRODUCTION-CHECKLIST.md`](../atina-system/docs/TYPEORM-PRODUCTION-CHECKLIST.md) · evidencija [`TYPEORM-PROD-EVIDENCE-LATEST.md`](./TYPEORM-PROD-EVIDENCE-LATEST.md). *Staging kao korak pre prod-a:* isti postupak iz [`TYPEORM-PRODUCTION-CHECKLIST.md`](../atina-system/docs/TYPEORM-PRODUCTION-CHECKLIST.md); dokaz kada imate staging DB.

**Dokaz (repo):** **CEO sekcija C** `[x]` redovi + **LATEST verify** Val 354. **Dokaz (prod):** migracije na pravoj bazi + evidencija (čeka vlasnika).

### Faza 4 — Integracija Python ↔ Node

- [x] `vault_data` / `VAULT_PATH` / `FORGE_VAULT_PATH` usklađeni za zajednički deploy ([`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) — **CEO sekcija B**) — **2026-05-05:** [`VAULT-B-EVIDENCE-LATEST.md`](./VAULT-B-EVIDENCE-LATEST.md); runbook: [`VAULT-B-INTEGRATED-RUNBOOK.md`](./VAULT-B-INTEGRATED-RUNBOOK.md).
- [x] Ponovljen smoke / health sa Node koji čita isti vault fajl (bind mount; veličina `vault.db` usklađena host/kontejner; `GET /health` **200**).

**Faza 4 — Next / tooling (repou):**

- [x] `apps/omnigroup-web` marketing + client/admin dashboard u repou; dashboard čita Atina `GET /health` i javni `GET /api/v1/billing/plans` — [`FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md) **F4-1/F4-2**.
- [x] SaaS odluka dokumentovana: kanonski sloj ostaje `atina-platform/atina`; YouTube pipeline ima lokalni fake + runbook — [`FAZA-4-SAAS-DECISION.md`](./FAZA-4-SAAS-DECISION.md), [`tools/youtube-pipeline/RUNBOOK.md`](../tools/youtube-pipeline/RUNBOOK.md), backlog **F4-3/F4-4**.
- [ ] **F4-6** AI / email / upload ostaje backlog; proširiti Atina modulima ili Next API rutama po potrebi — [`FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md).

**Dokaz:** [`VAULT-B-EVIDENCE-LATEST.md`](./VAULT-B-EVIDENCE-LATEST.md).

### Faza 5 — Produkcioni gate (**CEO sekcija G**, Node SaaS)

- [ ] Redom zatvoriti stavke u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) u **CEO sekciji G** (build prod, migracije staging, `.env`, Stripe/PayPal live, SMTP, smoke, admin, rollback).

**Dokaz:** operativni gate (**CEO sekcija G**) potpisan u evidenciji, ne samo kod.

### Faza 6 — v6+ / ULTRA (product decision)

- [x] **Eksplicitno N/A u N3 ciklusu** — [`NIVO-3-VISION-K8S-AI.md`](./NIVO-3-VISION-K8S-AI.md): V.1/V.2 stavke u tabeli označene **N/A u N3** dok product ne promeni scope (**N3-B5**, repou).
- [ ] **Kad product potvrdi K8s / pun AI sloj:** prebaciti izabrane redove sa **N/A** na **backlog** ili sprint + vlasnik + MVP + test/observability zahtev.

**Dokaz (N/A faza):** ovaj fajl + vision MD. **Dokaz (backlog):** product brief / issue milestone (van repoa je OK).

---

## 4. Master lista (kratko — ne duplira tabelu u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md))

Označava **sistem kao celinu**. Detalj: [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md).

### 4.1 Inženjerski „celokupan repo“

- [x] **F.4 / P.N2.2:** monorepo gate definisan i zelen **lokalno** (**2026-05-05**; ponovo **Val 349 / 2026-05-08** i **Val 354 / 2026-05-13** sa D.1 placeholder rekonstrukcijom za `apps/omnigroup-web`, [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md)); redovno zelen = ponavljati verify / CI po release ritmu. **Napomena:** **P.N2.2** = N3 preduslov (**`[x]`**); **NIVO-2** red **0.3** = kontinuirani GitHub CI na `main` (**`[ ]`** dok tim ne potvrdi).
- [x] **NIVO-3:** [`NIVO-3-MASTER-CHECKLIST.md`](../NIVO-3-MASTER-CHECKLIST.md) — preduslov **P.N2.2** `[x]` (**2026-05-08**, lokalni **Val 349**; ponovo **Val 354 / 2026-05-13**); ostatak master liste već `[x]` u repou. **P.N2.2 zatvoren** — vidi i [`NIVO-3-PDF-TRACE.md`](./NIVO-3-PDF-TRACE.md) (celokupan blok **CEO sekcije F** / gate).
- [x] **PDF trag (bazna linija):** [`NIVO-3-PDF-TRACE.md`](./NIVO-3-PDF-TRACE.md) + [`NIVO-3-PDF-FULL-AUDIT-COMPLETE.md`](./NIVO-3-PDF-FULL-AUDIT-COMPLETE.md) (**2026-05-08**). *Održavanje:* nakon većih promena modula osvežiti redove u trace-u / matrici.

### 4.2 Tri stacka

- [x] **Node** (`atina-platform/atina`): `npm run test:ci` u monorepo gate-u; **LATEST smoke** (**sekcija H**) sa Node — **Val 351** / **2026-05-14** [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md); pun red u **LATEST verify Val 354**.
- [x] **Nest** (`atina-system`): `npm run verify:ci` (migracije + e2e) u **LATEST verify Val 354**; moduli iz **CEO sekcije C** `[x]` u repou osim **prod TypeORM** stavke.
- [x] **Python**: koren `pytest` (**11** testova, **2026-05-13** prolaz) + Astra/Forge putanja u smoke/vault dokazima — [`VAULT-B-EVIDENCE-LATEST.md`](./VAULT-B-EVIDENCE-LATEST.md) · **LATEST verify Val 354**.

### 4.3 Kvalitet i produkcija

- [x] **E2E / integracija:** lead → deal → contract → payment ([`NIVO-2-E2E.md`](../atina-platform/atina/docs/operations/NIVO-2-E2E.md)) ostaje zelen posle izmena — **2026-05-11:** `DB_NAME=atina_saas_db`, `npm run migrate`, `npm run test:integration` u `atina-platform/atina` (**9** suite / **33** testa PASS; vidi [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md) red **#16**).
- [ ] **Staging** mirroring prod (DB, secrets pattern, migracije) — actionable checklist: [`STAGING-MIRROR-PROD.md`](./STAGING-MIRROR-PROD.md) (vezano za [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md) i [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md)).
- [ ] **Observability** (minimalno): health, strukturisani logovi — runbook: [`OBSERVABILITY-RUNBOOK.md`](./OBSERVABILITY-RUNBOOK.md).

### 4.4 v6+ (opciono dok product ne potvrdi)

- [x] **Kubernetes / GitOps:** eksplicitno **N/A u N3** — [`NIVO-3-VISION-K8S-AI.md`](./NIVO-3-VISION-K8S-AI.md) (V.1); backlog tek posle product sign-off-a.
- [x] **AI proizvodni sloj (RAG/agents/serving):** eksplicitno **N/A u N3** — isti fajl (V.2); backlog tek posle product sign-off-a.

---

## 5. Rizici koji utiču na „rastojanje od cilja“

| Rizik | Mitigacija |
|-------|------------|
| PDF obećava više nego što kod dokazuje | Stranični audit za modul-kritične PDF-ove; držati status *partial* dok nije review. |
| Dva HTTP stacka (Node 3000, Nest 3001) | SYSTEM-MAP + jedan smoke ritual; izbegavati duplirane auth modele bez dokumentacije. |
| Vault putanje razdvojene | Faza 4 eksplicitno; ne merge-ovati „ceo sistem“ claim bez toga. |
| v6+ tretiran kao obavezno u istom ciklusu kao moduli | Razdvojiti milestone-e; VISION tabela već razlikuje V.1/V.2. |

---

## 6. Reference (jedan klik)

| Tema | Fajl |
|------|------|
| Master lista (**CEO sekcije A–H**) | [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) |
| 50 modula trag | [`NIVO-2-CEO-D-TRACE.md`](./NIVO-2-CEO-D-TRACE.md) |
| Discovery (52 foldera) | [`NIVO-2-DISCOVERY-AUDIT.md`](./NIVO-2-DISCOVERY-AUDIT.md) |
| NIVO-3 status talasa | [`NIVO-3-STATUS.md`](./NIVO-3-STATUS.md) |
| Ultimate / ULTRA | [`nivo3-wave-a/02-ultimate-ultra.md`](./nivo3-wave-a/02-ultimate-ultra.md) |
| K8s / AI vizija | [`NIVO-3-VISION-K8S-AI.md`](./NIVO-3-VISION-K8S-AI.md) |
| Monorepo skripte | [`scripts/README.md`](../scripts/README.md) |

---

*Ažuriraj ovaj dokument kad god promeniš opseg cilja ili zatvoriš fazu — to je jedini način da „gde smo“ ostane istinito.*

*Sesija **2026-05-08:** Faza **0** i **1** zatvorene u ovom fajlu (odjeljak 2.1 pet modula; **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md) + pytest + referenca na Val 349); Faza **3** podeljena na repou **CEO sekciju C** naspram **prod TypeORM**; Faza **6** i **odjeljak 4.4** usklađeni sa **N/A** u [`NIVO-3-VISION-K8S-AI.md`](./NIVO-3-VISION-K8S-AI.md); **odjeljak 4.2** tri stacka označeni **`[x]`** uz postojeće dokaze.*

*Sesija **2026-05-13:** D.1 placeholder rekonstrukcija u `apps/omnigroup-web` (7 OneDrive-dehidriranih TS/TSX izvora dobilo placeholder sa `TODO[D.1-restore]` blokovima — runbook [`OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md)); pun mirror **Val 354** PASS (~1020 s, exit 0, sve gate-ove); smoke tri-stub **Val 350** (Node `/health` length=247); audit fix u Atini 11→7 advisory-ja sa `test:ci` PASS; sve repo dokove uskladjene na nove Val numere (verify 349→354 / smoke 348→350) — vidi [`TEHNICKI-AUDIT-2026-05-13.md`](./TEHNICKI-AUDIT-2026-05-13.md).*

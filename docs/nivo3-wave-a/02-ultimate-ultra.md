# Nivo 3 — Talas A2: Ultimate Node Blueprint + ULTRA

**Agent:** N3-A2 · **Samo ovaj fajl.**

**Evidencija / šabloni (indeks + dry-run):** [`../EVIDENCE-INDEX.md`](../EVIDENCE-INDEX.md) · [`../NIVO-1-DRYRUN-LOG.md`](../NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`../../scripts/README.md`](../../scripts/README.md) — **Kad podigneš novi broj**.

## PDF fajlovi (`sve/`)

- `Titan_System_Ultimate_Node_Blueprint_v1_to_v6_plus.pdf`
- `Titan_System_Ultimate_Node_Blueprint_v1_to_v6_plus_260330_004021.pdf`
- `Titan_System_Ultimate_Node_Blueprint_v1_to_v6_plus_260330_004021 (1).pdf`
- `TitanOmniGroup_ULTRA_Blueprint.pdf`

## Zadatak

1. Mapiranje na: Node SaaS jezgro (`atina-platform/atina/src/core`, `config`, `api`), moduli, monorepo granice.
2. Status aligned / partial / N/A + razlog (npr. K8s u PDF-u = N3 faza V ili N/A).
3. Tabela + eventualno „rizici“ za implementaciju u budućnosti.

**Legenda:** **aligned** = jasan, proverljiv poklop PDF opisa sa konkretnim kodom u opsegu; **partial** = trag postoji, celokupan PDF nije auditiran stranicu-po-stranicu (vidi [`NIVO-3-PDF-TRACE.md`](../NIVO-3-PDF-TRACE.md)); **N/A** = van aktivnog N3 isporuke ili eksplicitno odloženo (K8s / širi AI–vizionarski sloj → N3 faza V ili backlog, uskladiti sa [`NIVO-3-VISION-K8S-AI.md`](../NIVO-3-VISION-K8S-AI.md)).

---

## 1. CEO pregled (jedan red po „proizvodu“ u smislu inventara)

| PDF / grupa | Mapiranje (repo) | Status | Napomena |
|-------------|------------------|--------|----------|
| **Ultimate Node Blueprint** — sva **3** varijante ispod (isti izvor, različito ime fajla) | `atina-platform/atina/`: `src/core/` (`CoreEngine.ts`, `ModuleRegistry.ts`), `src/config/`, `src/api/middleware/`, `src/database/`, `src/modules/*` (~50 modula), monorepo samo kao kontekst u [`SYSTEM-MAP.md`](../../SYSTEM-MAP.md) | **partial** | Jezgro + moduli prate Master/Ultimate *nameru*; faze v1–v6+ iz naslova nisu verifikovane stranicu-po-stranicu. **K8s / operator / edge swarm** iz tipičnog Ultimate opisa: **N/A** u N3 (faza V / product backlog). **Vision** kao poseban infra sloj (ako postoji u PDF): **N/A** — nema odgovarajućeg vision pipeline proizvoda u Node stacku. |
| `TitanOmniGroup_ULTRA_Blueprint.pdf` | Pun **monorepo**: `atina-platform/atina` (Node SaaS), **`apps/omnigroup-web`** (Next — job **`omnigroup-web`** u CI), `atina-system/` (Nest), koren (`docker-compose.yml`, `docker-compose.atina.yml`, Python `src/` za Forge/Atina/Astra), `.github/workflows/ci-monorepo.yml` (job **`python`** / **`Python (Doslednost dok + pytest)`** — [`../GIT-BRANCH-PROTECTION.md`](../GIT-BRANCH-PROTECTION.md)), [`SYSTEM-MAP.md`](../../SYSTEM-MAP.md), [`CONTRIBUTING.md`](../../CONTRIBUTING.md), **F.4** [`../NIVO-1-F4-TIM-CHECKLIST.md`](../NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify:** [`../NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`../NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14) | **partial** | Granice više stackova i CI su dokumentovane; ULTRA tipično širi na **K8s + prošireni AI** — **N/A** odloženo u N3 osim product sign-off-a (vidi VISION fajl). |

---

## 2. Ultimate Node Blueprint — red po **imenu fajla** (tri varijante)

Isti dokument u smislu [`NIVO-3-SVE-INVENTORY.md`](../NIVO-3-SVE-INVENTORY.md) (duplikati u matrici); mapiranje i status su **identični** za sva tri.

| # | Fajl u `sve/` | Mapiranje | Status | Napomena |
|---|---------------|-----------|--------|----------|
| U1 | `Titan_System_Ultimate_Node_Blueprint_v1_to_v6_plus.pdf` | Node jezgro + moduli: `atina-platform/atina/src/core`, `src/config`, `src/api`, `src/modules` | **partial** | Referentni „canonical“ naziv u [`CHECKLIST-CEO-SISTEM.md`](../../CHECKLIST-CEO-SISTEM.md) i srodnim listama. |
| U2 | `Titan_System_Ultimate_Node_Blueprint_v1_to_v6_plus_260330_004021.pdf` | Isto kao U1 | **partial** | Verovatno isti export sa timestampom u imenu; bez binarnog diff-a tretirano kao duplikat. |
| U3 | `Titan_System_Ultimate_Node_Blueprint_v1_to_v6_plus_260330_004021 (1).pdf` | Isto kao U1 | **partial** | Kopija `(1)` — isti sadržaj po pravilu inventara. |

---

## 3. Ultimate Node Blueprint — domen → Node **core / config / api / ostalo**

Opšti slojevi koji se **tipično** pojavljuju u Ultimate Node dokumentima (naslov v1–v6+); mapiranje je inženjerski trag do koda, ne pun PDF audit.

| Domen (Ultimate / Node fokus) | Lokacija u kodu | Status | Napomena |
|------------------------------|-----------------|--------|----------|
| Express aplikacioni server (bootstrap, globalni middleware) | `src/core/CoreEngine.ts` | **partial** | Helmet, CORS, compression, morgan, rate limit, async errors — u skladu sa „Node blueprint“ očekivanjem; detalji faza v1–v6 nisu mapirani na verzije. |
| Registracija modula, lifecycle, mount ruta `/api/v1/:slug` | `src/core/ModuleRegistry.ts`, registracije u `CoreEngine.ts` | **partial** | **aligned** aspekt: `IModule`, `register`, `initializeAll`, `mountRoutes`; kompletan PDF modul-plan ≠ potvrda za svaki modul. |
| Konfiguracija iz env (bez hardkoda u nameri) | `src/config/env.ts`, `src/config/index.ts` | **aligned** | Centralizovan env model odgovara pravilu iz Master Spec sažetka u [`SYSTEM-MAP.md`](../../SYSTEM-MAP.md) odjeljak 6. |
| Zaštita ruta, validacija, rate limiting (reuse) | `src/api/middleware/auth.middleware.ts`, `validate.middleware.ts`, `rate-limit.middleware.ts` | **partial** | Postoji API sloj; granularnost vs PDF nije verifikovana. |
| Postgres, migracije, seed | `src/database/connection.ts`, `migrate.ts`, `seed.ts`, `seeds/` | **partial** | Operativni DB sloj prisutan; PDF „ultimate“ može zahtevati dodatne politike (npr. zabrana migracije ako testovi padaju) — procesno, ne samo kod. |
| Domenski moduli (Titan linija, CRM, plaćanja, itd.) | `src/modules/*` (pogledati listu foldera u repou) | **partial** | Paralela sa Master Spec listom modula u [`SYSTEM-MAP.md`](../../SYSTEM-MAP.md) odjeljak 6; dubina po modulu varira. |
| Phase Launch / aktivacija po fazama | `src/modules/phase-launch/` (+ guard u `CoreEngine`) | **partial** | Koncept „faza“ iz blue printa ima direktan modul; da li PDF v1–v6 doslovno odgovara fazama u kodu — nije stranično potvrđeno. |
| Forge / vault u Node kontekstu | `src/modules/forge/` | **partial** | `FORGE_VAULT_PATH` itd.; cross-stack usklađivanje sa Python vault — delimično (vidi SYSTEM-MAP odjeljak 3). |
| API Gateway, audit, compliance, backup, LB, … | `src/modules/api-gateway/`, `audit-log/`, `compliance/`, `backup-recovery/`, `load-balancer/`, … | **partial** | Stubovi ili puna implementacija zavisi od modula; Ultimate može obećati više nego što je E2E testirano. |
| Kubernetes, Helm/operator, multi-cluster, GitOps za celokupan Node sloj | — (nema primarnog K8s manifesta / operatora za ovaj proizvod u fokusu N3) | **N/A** | **Odloženo:** N3 faza V / DevOps backlog; uskladiti sa [`NIVO-3-VISION-K8S-AI.md`](../NIVO-3-VISION-K8S-AI.md) V.1. |
| Vision / video AI pipeline kao posebna platformska isporuka | Nema izdvojenog „vision stack“ sloja van modula (npr. sadržaj u `omnitube` nije ekvivalent kompletnom vision PDF sloju) | **N/A** | Ako PDF traži CV/infrence platformu — **N/A** u N3; eventualno budući modul ili integracija. |
| Distribuirani „swarm“ / edge čvorovi na nivou proizvoda | Van opsega jednog Express SaaS deploya u ovom monorepo-u | **N/A** | Vizionarski; uporediti sa `apex_predator_text.pdf` u SYSTEM-MAP odjeljak 6 — ne mešati sa Ultimate Node isporukom bez product odluke. |

---

## 4. `TitanOmniGroup_ULTRA_Blueprint.pdf` — monorepo i granice stackova

| Domen (ULTRA / celokupan sistem) | Lokacija u repozitorijumu | Status | Napomena |
|----------------------------|---------------------------|--------|----------|
| Node SaaS (glavni HTTP, moduli, plaćanja) | `atina-platform/atina/` | **partial** | Ista osnova kao Ultimate; ULTRA širi priču na celokupan ekosistem. |
| Nest „Atina System“ (TSC / PDF scenariji) | `atina-system/` | **partial** | Drugi API, drugi compose; port 3000 konflikt sa Node — dokumentovano u SYSTEM-MAP. |
| Python: Forge, Atina worker, Astra | koren `Dockerfile`, `docker-compose.yml`, `src/` (Python paketi) | **partial** | Nije isti proces kao `atina-platform/atina` servis. |
| Više compose fajlova, staging integracija | `docker-compose.atina.yml`, `RUN-ATINA-PLATFORM.txt`, SYSTEM-MAP odjeljak 5 | **partial** | Runbook / procedura postoji; „jedan ULTRA deploy“ nije automatizovan kao jedan Helm chart. |
| CI kroz monorepo | `.github/workflows/ci-monorepo.yml` (pet jobova uklj. **`python`** / **`Python (Doslednost dok + pytest)`** — [`../GIT-BRANCH-PROTECTION.md`](../GIT-BRANCH-PROTECTION.md); **`omnigroup-web`** / `apps/omnigroup-web`), [`verify-monorepo.ps1`](../../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`../GIT-BRANCH-PROTECTION.md`](../GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../scripts/README.md); **Port mismatch** Nest/pg — isti README), gate-ovi u `CONTRIBUTING.md`, **F.4** [`../NIVO-1-F4-TIM-CHECKLIST.md`](../NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify:** [`../NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`../NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14) | **partial** | **aligned** aspekt: jedan workflow povezuje pakete; ULTRA može zahtevati više okruženja nego što CI pokriva. |
| Jedinstven vault / finansijski tok kroz sve servise | Konceptualno; `VAULT_PATH` vs `FORGE_VAULT_PATH` | **partial** | Namerna divergencija puteva moguća — rizik integracije. |
| Kubernetes / service mesh / multi-tenant klaster | Nije isporučeno kao deo ovog N3 opisa koda | **N/A** | **Odloženo** N3 faza V; vidi VISION V.1. |
| Prošireni AI (RAG, model lifecycle, agent platforma) | Delimično: `ai-memory/`, `recommendation/`, `apex-predator/`, itd. | **partial** | Aplikacioni tragovi; pun V.2 iz ULTRA tipično **N/A** u N3 bez product scope-a (VISION V.2). |
| GPU inference, fine-tuning platforma | Nema kao standardni deo compose / Node stacka | **N/A** | Backlog / infra van N3. |
| Vision-first proizvod (ako ULTRA spaja video + AI ops) | Nije mapirano na celokupan pipeline | **N/A** | Tretirati kao odloženo isto kao vision red u tabeli odjeljak 3. |

---

## 5. Rizici (implementacija kasnije)

- **PDF ≠ verifikovan kontrakt:** bez straničnog audita, status ostaje **partial**; prelazak na **aligned** zahteva timski review i ažuriranje stavki u matrici [`CHECKLIST-CEO-SISTEM.md`](../../CHECKLIST-CEO-SISTEM.md).
- **K8s / ULTRA infra:** ako se krene u implementaciju, prvo product granica (V.1) i odvojiti od Node modula kako ne bi „curl Helm“ završio u `src/modules`.
- **Vision:** bilo koji zahtev iz PDF koji podrazumeva CV servise ili streaming inference — planirati van `CoreEngine` ili kao eksplicitan novi modul; do tada **N/A**.
- **Tri Ultimate fajla:** rizik je administrativan (pogrešna verzija u rukama); u radu držati jedan referentni fajl (npr. U1) i označiti U2/U3 kao duplikate u `sve/`.

## Reference

- [`SYSTEM-MAP.md`](../../SYSTEM-MAP.md)
- [`NIVO-3-SVE-INVENTORY.md`](../NIVO-3-SVE-INVENTORY.md)
- [`NIVO-3-PDF-TRACE.md`](../NIVO-3-PDF-TRACE.md)
- [`NIVO-3-VISION-K8S-AI.md`](../NIVO-3-VISION-K8S-AI.md)
- Pun monorepo gate (isti red kao **CI (monorepo)** (job **`python`**: **`Python (Doslednost dok + pytest)`** — [`../GIT-BRANCH-PROTECTION.md`](../GIT-BRANCH-PROTECTION.md)) — **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../scripts/README.md) → pytest → Atina `test:ci` → **`apps/omnigroup-web`** build → Nest `verify:ci` + tri `docker compose config`; opciono **`-SkipOmnigroupWeb`** / **`-SkipDocAudit`** lokalno): [`verify-monorepo.ps1`](../../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`../GIT-BRANCH-PROTECTION.md`](../GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](../../scripts/smoke-stack.ps1) (HTTP, opciono; Atina Node stub = GET `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../../atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*) · [`scripts/README.md`](../../scripts/README.md) (**Port mismatch** Nest/pg) · **F.4** [`../NIVO-1-F4-TIM-CHECKLIST.md`](../NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify:** [`../NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`../NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14)

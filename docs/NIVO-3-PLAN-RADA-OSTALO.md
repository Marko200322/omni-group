# Plan rada — šta je urađeno, šta ostaje

**Ažurirano:** 2026-04-17 · **dopuna 2026-05-08** (CI job `omnigroup-web`, pun lokalni red u [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **Val 349** / **Val 346** / **Val 345** / **Val 344**) · **dopuna 2026-05-13** (D.1 placeholder rekonstrukcija u `apps/omnigroup-web` + pun **Val 354** mirror PASS)  
**Politika:** Cursor **Task talasi (D–I)** se **ne pokreću automatski** dok vlasnik repoa ne traži drugačije; dalji rad ide kroz ovaj plan, PR-ove i lokalne / GitHub gate-ove.

**Evidencija / šabloni (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`../scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

---

## 1. Šta je urađeno (pouzdano u repou)

| Oblast | Stanje |
|--------|--------|
| **Nivo 3 — master DoD** | [`NIVO-3-MASTER-CHECKLIST.md`](../NIVO-3-MASTER-CHECKLIST.md): **X.N3.1–X.N3.3** `[x]`; **CEO sekcija F** zatvorena uz **partial** PDF trag |
| **PDF trag (N3)** | [`NIVO-3-PDF-TRACE.md`](./NIVO-3-PDF-TRACE.md): svi redovi dokumentovani; status **partial** (nije **aligned**) |
| **Talasi A, B, C** | Dokumentacija + konsolidacija u `NIVO-3-PDF-TRACE` |
| **Talas F (kod)** | Moduli + `test:ci` (istorijski zeleno) |
| **N3-G5** | load-balancer + proxy-rotation (zatvoreno u statusu) |
| **Monorepo CI konfiguracija** | [`.github/workflows/ci-monorepo.yml`](../.github/workflows/ci-monorepo.yml): job **`python`** (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md) + `pytest`) + atina `test:ci` + job **`omnigroup-web`** (`apps/omnigroup-web` build) + Nest **`verify:ci`** + job **`compose`** (`docker compose config`: Nest merge, root, `atina-platform/atina`). **F.4:** [`NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md) |
| **Lokalna verifikacija** | [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) — **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md) (**Get-Help**, opcije); zatim pytest + `test:ci` + **`apps/omnigroup-web`** `npm ci` + `build` + `verify:ci` (Postgres) + **tri** **`docker compose config`** (**`-SkipOmnigroupWeb`** / **`-SkipCompose`** / **`-SkipNestVerifyCi`** / **`-SkipDocAudit`** po potrebi; Windows + `pg` ponekad `POSTGRES_PORT=5433` — isti README). **OK** istorijski **2026-04-17**; **pun mirror 2026-05-13** (**Val 354** LATEST sa D.1 placeholder rekonstrukcijom; **Val 353** PARTIAL `-SkipOmnigroupWeb` istog dana); **2026-05-08** (**Val 349**; **Val 346** posle fix-a skripte; **Val 345** na host **5432** + usklađen **`POSTGRES_PORT`**; **Val 344** na **5433** — vidi [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) i **Port mismatch** u [`scripts/README.md`](../scripts/README.md)). **F.4:** [`NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md) |
| **P.N2.2 (N3 master)** | [`NIVO-3-MASTER-CHECKLIST.md`](../NIVO-3-MASTER-CHECKLIST.md): **`[x]`** uz lokalni dokaz **Val 354** / **2026-05-13** (ranije **Val 349** / **2026-05-08**; isti linkovi kao u **F.4**); **CI na `main` u GitHub Actions** ostaje opciono dok nema kontinuiranog tim merge-a — vidi **0.3** u [`NIVO-2-MASTER-CHECKLIST.md`](../NIVO-2-MASTER-CHECKLIST.md) |

---

## 2. Šta ostaje (prioritet)

### A. Spolja od repoa / „zvanično“

| # | Zadatak | Napomena |
|---|---------|----------|
| **CI na `main` (opciono)** | Zeleni **CI (monorepo)** u Actions posle **svakog** merge-a na `main` (**pet** jobova; job **`python`**: **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) | [`NIVO-2-MASTER-CHECKLIST.md`](../NIVO-2-MASTER-CHECKLIST.md) red **0.3** još `[ ]` dok proces nije kontinuiran ili eksplicitno N/A |
| **Staging / prod** | [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) — **CEO sekcija G**: build u prod, migracije, `.env` prod, live plaćanja + webhooki, SMTP, smoke, admin monitoring, rollback | Većina stavki još `[ ]` |
| **CEO sekcija H** | Red **H** u matrici (portovi / procedura); **LATEST smoke** (**sekcija H**) = evidencija tri stuba — opciono [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) za Express (GET `/health`); bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) | Tabela u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) |

### B. PDF / proizvod (širi cilj)

| # | Zadatak | Napomena |
|---|---------|----------|
| **Partial → aligned** | Po modulu ili po PDF-u: stranični audit ili eksplicitni **N/A** | Trenutno svi redovi **partial** |
| **E2E** | Jedan automatizovan tok (npr. lead → deal → payment) kroz spec | Master Spec spominje simulaciju; nije jedan zatvoren gate u ovom fajlu |
| **Blueprint van opsega** | `apex_predator_text` i slično — već delimično **N/A** u wave fajlovima | Proširiti samo ako proizvod zahteva |

### C. Inženjering (repo)

| # | Zadatak | Napomena |
|---|---------|----------|
| **Nest Jest** | Ponekad upozorenje „worker did not exit gracefully“ | Ne pada `verify:ci`; po želji cleanup open handles |
| **TypeORM migracije + CI + e2e** | `atina-system`: `verify:ci` = build + unit + `migration:run` + **e2e** (`E2E_WITH_DB=1`, `NODE_ENV=test`) na Postgres servisu u `ci-monorepo.yml` | Prazna baza u CI; lokalno [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) postavlja env + Postgres + Docker (`compose config` na kraju); bez Postgresa lokalno: **`-SkipNestVerifyCi`** (`verify:n1`); bez Next build-a: **`-SkipOmnigroupWeb`**; bez doc gate audita samo lokalno: **`-SkipDocAudit`**; [`scripts/README.md`](../scripts/README.md); **F.4:** [`NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md); **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14) |
| **Integracioni testovi** | Van `test:ci` ignore obrasca | Po `CONTRIBUTING` / N2 planu |

---

## 3. Predloženi redosled (jedan sprint)

1. **CEO sekcija G** — jedna stavka po PR-u (npr. samo `smoke-stack` + doc za **`npm run smoke:all`** / dok patch + zapis u odgovarajućem `*-EVIDENCE*.md` ili **LATEST smoke** (**sekcija H**)).  
2. **CI 0.3 (opciono)** — ako koristiš GitHub sa timom: zelen **CI (monorepo)** (job **`python`**: **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) posle merge-a na `main` — [`NIVO-2-MASTER-CHECKLIST.md`](../NIVO-2-MASTER-CHECKLIST.md); **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).  
3. **E2E** — jedan Playwright/Cypress ili postojeći alat ako već postoji u N2.  
4. **PDF aligned** — samo za 1–2 kritična modula ako biznis traži potpis.

---

## 4. Veza sa statusom talasa

Živi log: [`NIVO-3-STATUS.md`](./NIVO-3-STATUS.md). Redovi **D–I** mogu biti **`[x]` Gotovo** kada je **pun** lokalni gate (ili CI) zelen — talasi agenata nisu obavezni ako je verifikacija ista.

---

## 5. Istorija ove sesije (kratko)

- Ispravljen test [`atina-platform/atina/src/tests/unit/module-contracts.dto.test.ts`](../atina-platform/atina/src/tests/unit/module-contracts.dto.test.ts): dodato **`prodEnvReadiness`** u fixture za `AtinaSystemStatusDto` (usklađeno sa DTO-om i signalima reda G.4 u CEO sekciji G).

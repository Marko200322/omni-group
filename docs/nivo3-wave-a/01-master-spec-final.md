# Nivo 3 — Talas A1: Master Spec v2 + Final moduli

**Agent:** N3-A1 · **Samo ovaj fajl** (ne menjati druge puteve).

**Evidencija / šabloni (indeks + dry-run):** [`../EVIDENCE-INDEX.md`](../EVIDENCE-INDEX.md) · [`../NIVO-1-DRYRUN-LOG.md`](../NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`../../scripts/README.md`](../../scripts/README.md) — **Kad podigneš novi broj**.

## PDF fajlovi (`sve/`)

- `Titan_System_Modules_Master_Spec_v2.pdf`
- `Titan_System_Modules_Final.pdf`
- `titan_system_modules.pdf`

## Kratak narativ (mapiranje)

Sva tri PDF-a u inventaru [`NIVO-3-SVE-INVENTORY.md`](../NIVO-3-SVE-INVENTORY.md) tretiraju isti **proizvodni opseg: Titan moduli / Master Spec moduli** — razlika je primarno u **verziji dokumenta** (v2 master vs. „final“ / snake_case naziv), ne u drugoj grani repozitorijuma. Inženjerski **izvor istine za 50 stavki CEO sekcije D** u repou je [`NIVO-2-CEO-D-TRACE.md`](../NIVO-2-CEO-D-TRACE.md): svaki red veže spec na **(T)** testove u `atina-platform/atina/src/tests/` ili **N/A** gde modul nije u monorepu. **Kod** za modulsku implementaciju je ispod `atina-platform/atina/src/modules/` (po imenu modula), uz zajedničke slojeve (`CoreEngine`, registry, baza, logger, greške) opisane u [`CHECKLIST-CEO-SISTEM.md`](../../CHECKLIST-CEO-SISTEM.md) **CEO sekciji D** (tabela „50 modula → mapa“). PDF pravila (modularnost, migracije/rollback, okruženja) zatvorena su referencom na [`NIVO-2-CEO-PDF-RULES-CLOSURE.md`](../NIVO-2-CEO-PDF-RULES-CLOSURE.md) uz isti D trag — **dubinski, stranica-po-stranica PDF audit** ostaje **N2+ / tim**, što drži status matrice na **partial**, ne **aligned**.

## Zadatak

1. U tabeli ispod: za svaki PDF — **mapiranje** na repou (`atina-platform/atina/src/modules/...`, `docs/NIVO-2-CEO-D-TRACE.md`).
2. Status: **aligned** (trag pokriva celokupan PDF fokus za modulski deo), **partial** (samo deo), **N/A** (celokupan PDF van monorepo opsega) + **kratak razlog**.
3. Predlog za **CEO sekciju F** — prve dve stavke: da li su spremne za `[x]` uz ovaj dokument kao dokaz.

| PDF | Mapiranje (putanje / doc) | Status | Napomena |
|-----|---------------------------|--------|----------|
| Master Spec v2 | **`sve/`:** `Titan_System_Modules_Master_Spec_v2.pdf` · **Trag D:** [`NIVO-2-CEO-D-TRACE.md`](../NIVO-2-CEO-D-TRACE.md) (50 redova + test lokacije) · **Kod:** `atina-platform/atina/src/modules/*` (R) prema **CEO sekciji D** u [`CHECKLIST-CEO-SISTEM.md`](../../CHECKLIST-CEO-SISTEM.md); orchestracija `atina-platform/atina/src/CoreEngine.ts`, `ModuleRegistry.ts`; DB `atina-platform/atina/src/database/`; PDF pravila + E2E referenca u istom trag dokumentu | **partial** | Repou pokriven D tragom + testovima; celokupan PDF nije produkcioni stranični audit u punom obimu (N2+/tim). |
| Modules Final | **`sve/`:** `Titan_System_Modules_Final.pdf` · **Isti trag i folderi** kao Master Spec v2 (D trag + `src/modules/` + zajednički slojevi iz **CEO sekcije D**) | **partial** | Isti inženjerski poklop kao v2; tekst/dijagrami „Final“ nisu posebno reconcilovani u posebnom diff-u — partial. |
| titan_system_modules.pdf | **`sve/`:** `titan_system_modules.pdf` · **Isti trag i folderi** kao gore (alias naziva u inventaru) | **partial** | Tretira se kao ista modulska matrica; bez odvojenog PDF-to-code diff dokumenta — partial. |

### CEO sekcija F — stavke 1 i 2 (spremnost za `[x]`)

Pravilo u [`NIVO-3-PDF-TRACE.md`](../NIVO-3-PDF-TRACE.md): stavka **u CEO sekciji F** u [`CHECKLIST-CEO-SISTEM.md`](../../CHECKLIST-CEO-SISTEM.md) uz `[x]` tek nakon **odgovarajućeg reda u matrici** ili **talas-dokumenta posle timskog pregleda**.

- **F.1** (`Titan_System_Modules_Master_Spec_v2.pdf` — moduli i pravila iz D provereni): Ovaj fajl + D trag daju **jak dokaz za inženjersko poklapanje (partial)**. Za CEO **`[x]`** preporuka je: **ne** samo na osnovu ovog dokumenta dok tim eksplicitno ne potvrdi PDF↔D proveru (ili ne prihvati partial kao dovoljan gate za taj korak).
- **F.2** (`Titan_System_Modules_Final.pdf` / `titan_system_modules.pdf`): Ista logika — **isti trag D** pokriva oba fajla; **`[x]`** tek uz **timski pregled** ovog wave dokumenta ili proširene evidencije; do tada ostaje referenca na ovaj fajl kao **Nivo 3 dubinski sloj** uz status **partial** u glavnoj matrici.

## Reference

- [`NIVO-2-CEO-D-TRACE.md`](../NIVO-2-CEO-D-TRACE.md)
- [`NIVO-3-SVE-INVENTORY.md`](../NIVO-3-SVE-INVENTORY.md)
- [`NIVO-3-PDF-TRACE.md`](../NIVO-3-PDF-TRACE.md)
- [`CHECKLIST-CEO-SISTEM.md`](../../CHECKLIST-CEO-SISTEM.md) — **CEO sekcije D i F**
- Pun monorepo gate (isti red kao **CI (monorepo)** (job **`python`**: **`Python (Doslednost dok + pytest)`** — [`../GIT-BRANCH-PROTECTION.md`](../GIT-BRANCH-PROTECTION.md)) — **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../scripts/README.md) → pytest → Atina `test:ci` → **`apps/omnigroup-web`** build → Nest `verify:ci` + tri `docker compose config`; opciono **`-SkipOmnigroupWeb`** / **`-SkipDocAudit`** lokalno): [`verify-monorepo.ps1`](../../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`../GIT-BRANCH-PROTECTION.md`](../GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](../../scripts/smoke-stack.ps1) (HTTP, opciono; Atina Node stub = GET `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../../atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*) · [`scripts/README.md`](../../scripts/README.md) (**Port mismatch** Nest/pg) · **F.4** [`../NIVO-1-F4-TIM-CHECKLIST.md`](../NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify:** [`../NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`../NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14)

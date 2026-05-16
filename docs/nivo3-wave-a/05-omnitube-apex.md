# Nivo 3 — Talas A5: OmniTube + Apex Predator

**Agent:** N3-A5 · **Samo ovaj fajl.**

**Evidencija / šabloni (indeks + dry-run):** [`../EVIDENCE-INDEX.md`](../EVIDENCE-INDEX.md) · [`../NIVO-1-DRYRUN-LOG.md`](../NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`../../scripts/README.md`](../../scripts/README.md) — **Kad podigneš novi broj**.

## PDF fajlovi (`sve/`)

- `OmniTube_Project_Overview.pdf`
- `apex_predator_text.pdf`

## Zadatak

1. **OmniTube** → `atina-platform/atina/src/modules/omnitube/**`.
2. **Apex predator** — **CEO sekcija F** / PDF trag zahteva dokumentovan scope vs implementacija (veliki deo van repoa): eksplicitno **partial** ili **N/A** sa razlogom, bez lažnog **aligned**.
3. Tabela + „šta bi bilo potrebno za pun aligned“ (opciono).

### Glavna matrica (`sve/` → repo)

| PDF | Mapiranje | Status | Napomena |
|-----|-----------|--------|----------|
| `OmniTube_Project_Overview.pdf` | `atina-platform/atina/src/modules/omnitube/**` (modul `slug = omnitube`: list/create kanal, `POST /:id/run` sa režimima publish / optimize / analyze) | **partial** | U [`NIVO-2-CEO-D-TRACE.md`](../NIVO-2-CEO-D-TRACE.md) **nema** posebnog reda za OmniTube (50 modula = Titan **CEO sekcija D**). U repou postoji odgovarajući folder + unit/routes testovi (`src/tests/unit/omnitube.*.test.ts`). **Nije** tvrdnja „aligned“ sa PDF-om: sadržaj `OmniTube_Project_Overview.pdf` nije stranično mapiran ovde; puno poklapanje zahteva N2+ PDF audit ([pravilo zatvaranja, red 61](../NIVO-2-CEO-D-TRACE.md)). |
| `apex_predator_text.pdf` | **Samo softverski rez:** `atina-platform/atina/src/modules/apex-predator/**` (modul `slug = apex-predator`, plan enterprise; list/create profil, `POST /:id/run`, admin `GET /admin/risk-grid`). Ostatak obima tipičnog „text“ PDF-a (narativa, strategija, proces van koda) | **partial** + **N/A** (van koda) | Ime fajla sugeriše **veliki tekstualni obim**; celokupan PDF **nije** u repou niti čitan u ovom talasu — **ne** označavati kao **aligned**. Repo pokriva jedan Titan-modul sa determinističkim `run` izlazom (npr. domain state / revenue heuristike u servisu), ne celokupan književni/strateški dokument. Testovi: `src/tests/unit/modules/apex-predator/*.test.ts`. **CEO sekcija D** u matrici [`CHECKLIST-CEO-SISTEM.md`](../../CHECKLIST-CEO-SISTEM.md) takođe **ne** numeriše Apex posebno. |

### `apex_predator_text.pdf` — iskreno razdvajanje obima (bez lažnog aligned)

| Segment obima (očekivano / nepoznato bez ekstrakcije) | U repou? | Status | Napomena |
|------------------------------------------------------|----------|--------|------------|
| Aplikacioni modul „Apex Predator“ (API, DTO, repo, run) | Da | **partial** | Mapiranje na `apex-predator/**`; pokrivenost testovima kao gore. **Partial** jer PDF nije red-po-red uporedjen sa specifikacijom modula. |
| Tekst, metapfore, poslovna filozofija, širi ekosistem van modula | Ne | **N/A** | Nema odvojenog artefakta u monorepu koji reprezentuje „tekst PDF-a“; **N/A** za implementaciju — eventualno dokumentacija ili N2+ trace. |
| Integracija sa svim modulima iz PDF-a ako PDF širi scope izvan `apex-predator` | Nepoznato bez čitanja PDF-a | **N/A** / **partial** | Ne pretpostavljati poklapanje; tim eksplicitno mapira nakon ekstrakcije zahteva. |

### Šta bi bilo potrebno za **pun** „aligned“ (oba PDF-a)

- Stranični ili poglavlje-po-poglavlje inventar zahteva iz svakog PDF-a + mapiranje na fajlove/rute/šeme u `atina-platform/atina`.
- Gde PDF traži ponašanje koje **nije** u kodu: backlog + odluka (implementacija vs dokumentacija vs odbijeno).
- Za `apex_predator_text.pdf`: eksplicitno označiti koje **stranice / poglavlja** padaju na `apex-predator` modul, a koje ostaju **N/A** u smislu koda (bez oznake aligned za celokupan fajl ako je većinom narativ).

## Reference

- [`NIVO-2-CEO-D-TRACE.md`](../NIVO-2-CEO-D-TRACE.md) (redovi za omnitube, apex)
- [`NIVO-3-SVE-INVENTORY.md`](../NIVO-3-SVE-INVENTORY.md)
- Pun monorepo gate (isti red kao **CI (monorepo)** (job **`python`**: **`Python (Doslednost dok + pytest)`** — [`../GIT-BRANCH-PROTECTION.md`](../GIT-BRANCH-PROTECTION.md)) — **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../scripts/README.md) → pytest → Atina `test:ci` → **`apps/omnigroup-web`** build → Nest `verify:ci` + tri `docker compose config`; opciono **`-SkipOmnigroupWeb`** / **`-SkipDocAudit`** lokalno): [`verify-monorepo.ps1`](../../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`../GIT-BRANCH-PROTECTION.md`](../GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](../../scripts/smoke-stack.ps1) (HTTP, opciono; Atina Node stub = GET `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../../atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*) · [`scripts/README.md`](../../scripts/README.md) (**Port mismatch** Nest/pg) · **F.4** [`../NIVO-1-F4-TIM-CHECKLIST.md`](../NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify:** [`../NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`../NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14)

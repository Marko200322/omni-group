# D.1 Iter 2 — Placeholder unapređen po dokumentovanom F4-2 ugovoru

> **Update 2026-05-14:** posle Iter 2 koda agent je pokrenuo i **pun verify Val 355** (svi gate-ovi PASS, ~1038 s, exit 0) — formalna potvrda da Iter 2 izmene + sav prethodni Val sync ne lome ni jedan gate. **Val 355** je sada kanonski **LATEST verify** umesto Val 354. Vidi novi *Zapis (izvršen) — Val 355* u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md) i nov ulaz u [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md). Originalan plan iz ovog dokumenta („Val 355 ide tek kad vlasnik vrati pravi UI") je preuranjen — pun mirror sa Iter 2 placeholder kodom **je već dokazan**, a sledeći Val (356+) ide tek kad vlasnik vrati pravi UI iz Koraka 1/2 runbook-a.

**Refs:**

- [`OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md) — pun runbook (Korak 1/2/3 + Iter 2 blok)
- [`TEHNICKI-AUDIT-2026-05-13.md`](./TEHNICKI-AUDIT-2026-05-13.md) — D.1 sekcija (problem + agentska akcija)
- [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **Val 355** (PUN mirror, 2026-05-14, sa Iter 2 placeholder kodom) + Val 354 istorijski zapis
- [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md) — **Val 355** zapis (2026-05-14) + Val 354 zapis (2026-05-13) + Iter 2 napomena
- [`FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md) — F4-2 acceptance kriterijum
- [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md) — dokumentovani Atina API ugovor
- [`apps/omnigroup-web/.env.example`](../apps/omnigroup-web/.env.example) — `NEXT_PUBLIC_ATINA_API_BASE`
- [`scripts/audit-doc-gate-references.ps1`](../scripts/audit-doc-gate-references.ps1) — doc gate (PASS posle izmena)
- [`scripts/verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) · [`scripts/smoke-stack.ps1`](../scripts/smoke-stack.ps1) (Atina Node = **GET** `/health`) · bundled Atina **`npm run smoke:all`** u `atina-platform/atina` — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*).
- **Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

> **Svrha dokumenta:** spreman PR body / commit poruka koju vlasnik može da iskoristi kad bude push-ovao Iter 2 izmene. Sve agentske izmene su već u radnom direktorijumu; ovaj fajl je samo opis — ne menja kod.

---

## Sažetak

Posle **Val 354** punog verify mirrora (D.1 placeholder Iter 1 — minimalni Korak 3 placeholder fajlovi sa `TODO[D.1-restore]` blokovima), agent je u Iter 2 unapredio **dva lib helper-a** (`lib/atina.ts`, `lib/atina-display.ts`) i **dva client komponenta** (`AdminClient.tsx`, `DashboardClient.tsx`) tako da prikazuju **realan podatak sa Atina API-ja** prema dokumentovanom ugovoru iz [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md). Time je **F4-2 acceptance** ([`FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md)) — *"realan podatak sa Atina API-ja"* — sada validan iako pravi Admin/Dashboard UI (auth gate, KPI grid, akcije, brand komponente) ostaje na vlasniku da vrati iz OneDrive cloud-a / Git remote-a.

**Iter 2 koraku scope-u nije menjao gate skup** (placeholder unutrašnji sadržaj se menja, ali svi npm/python gate-ovi rade iste komande). **Naknadno (2026-05-14) agent je pokrenuo pun mirror i dobio Val 355 PASS** (vidi *Update* napomenu na vrhu) — Val 355 je sada kanonski **LATEST verify**. Sledeći Val (356+) ide tek kad vlasnik vrati pravi UI iz Koraka 1/2 runbook-a.

---

## Šta se menja

### `apps/omnigroup-web/src/lib/atina.ts`

- Server-side helper `loadAtinaPublicSnapshot(options?: { timeoutMs?: number })`.
- Paralelni `fetch` na `${apiBase}/health` i `${apiBase}/api/v1/billing/plans`.
- `apiBase = process.env.NEXT_PUBLIC_ATINA_API_BASE ?? 'http://127.0.0.1:3000'` (trailing slash trimovan).
- `AbortController` timeout (default 5000 ms), `cache: 'no-store'`, `Accept: application/json`.
- Graceful fallback: `source` enum **`'live'` / `'partial'` / `'unreachable'` / `'placeholder'`**.
- Plan list normalizacija (prvih 10 stavki, `slug` / `name` / `priceMonthly` / `currency`).
- Agregisana `errors[]` lista (string opis svake fail-faze).
- Tipovi: `AtinaPublicSnapshot`, `AtinaSnapshotSource`, `AtinaHealthInfo`, `AtinaPlanSummary` — **eksportovani**.

### `apps/omnigroup-web/src/lib/atina-display.ts`

- `formatSnapshotLine(s)` → kratak red `live @ http://… (N plans) — ISO`.
- `formatPlanLine(p)` → `name — price currency`.
- `describeSource(s)` → ljudski opis `source` stanja (SR jezik, koristi se u UI panelima).

### `apps/omnigroup-web/src/app/admin/AdminClient.tsx`

- `'use client'` komponenta sa `data-placeholder="admin-client"`.
- Sekcije: **Atina API status** (Source / Base / Plans count + `describeSource`), **Billing plans** (kad ih ima), **Sirov snapshot (JSON)** (collapsible `<details>`).
- `<summary>Greške ({n})</summary>` collapsible kad postoji `errors[]`.
- Čuva placeholder upozorenje + `TODO[D.1-restore]` marker u komentarima — pravi Admin UI (auth gate, panels, akcije) ostaje na vlasniku.

### `apps/omnigroup-web/src/app/dashboard/DashboardClient.tsx`

- Iste sekcije kao Admin (Atina health / Billing plans / Sirov snapshot), prilagođeno Dashboard kontekstu.
- Italic prazna poruka kad `plansCount === 0` ("Atina API nije dohvatljiv ili lista je prazna").
- Čuva `TODO[D.1-restore]` marker.

### `apps/omnigroup-web/src/app/dev/docs/page.tsx`

- U sekciji "Ulaz i navigacija" dodate tri nove putanje:
  - `docs/TEHNICKI-AUDIT-2026-05-13.md`
  - `docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`
  - `docs/VLASNIK-PAKET.md`

### Docs ažurirana

- [`docs/TEHNICKI-AUDIT-2026-05-13.md`](./TEHNICKI-AUDIT-2026-05-13.md) — dodat blok "Agentska akcija 2026-05-14 (D.1 placeholder Iter 2 — F4-2 acceptance)".
- [`docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md) — dodat blok "Iter 2 — Placeholder unapređen po dokumentovanom ugovoru" + sign-off red `[X] Iter 2`.
- [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **novi Val 355 ulaz** (PUN mirror, 2026-05-14, sa Iter 2 placeholder kodom) + Iter 2 napomena unutar Val 354 istorijskog zapisa.
- [`docs/NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md) — **novi *Zapis (izvršen) — Val 355*** (2026-05-14) + Iter 2 napomena unutar Val 354 zapisa.

---

## Verifikacije (sve PASS)

| Korak | Komanda | Rezultat |
|-------|---------|----------|
| Type-check + Next 14 build | `cd apps/omnigroup-web; npm run build` | **PASS** — 15/15 stranica, ~178 s, exit 0 |
| Re-build (posle dev/docs hub update-a) | isto | **PASS** — 15/15 stranica, ~68 s, exit 0 |
| Doc gate audit | `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/audit-doc-gate-references.ps1` | **OK** |
| Linter (svi izmenjeni fajlovi) | `ReadLints` | **bez grešaka** |

> **Update 2026-05-14:** **Pun monorepo verify** (`verify-monorepo.ps1`) **JE** pokretan i **PASS** — **Val 355**, exit 0, ~1038 s, svi gate-ovi PASS uključujući `apps/omnigroup-web` build sa Iter 2 placeholder kodom. Detalji u [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (novi Val 355 ulaz) i u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md) (novi *Zapis (izvršen) — Val 355 pun verify + D.1 placeholder Iter 2*). Sledeći Val (356+) ide tek kad se vrati pravi UI iz Koraka 1/2 runbook-a.

---

## Šta NIJE u ovom PR-u

- **Pravi Admin/Dashboard UI** (auth gate, KPI grid, akcije, brand komponente) — ostaje na vlasniku iz **OneDrive cloud-a** ili **Git remote-a** (Korak 1/2 u [`OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md)).
- **`TODO[D.1-restore]` blokovi** ostaju u svim placeholder fajlovima — vlasnik ih briše u sledećem PR-u (Iter 3) zajedno sa restore-om pravog UI-ja.
- **Nove dependency-je** — paket `apps/omnigroup-web` koristi samo postojeće `next` 14, `react` 18, `framer-motion` 12 (nema novog `npm install`).
- **Promene u CI workflow-u** — `.github/workflows/ci-monorepo.yml` netaknut.

---

## Predlog commit poruke

```text
apps/omnigroup-web: D.1 placeholder Iter 2 — server-side fetch /health + /plans (F4-2 acceptance)

Unaprediti `lib/atina.ts` placeholder po dokumentovanom F4-2 ugovoru
(README.md + .env.example): paralelni fetch na ${NEXT_PUBLIC_ATINA_API_BASE}
/health i /api/v1/billing/plans, sa AbortController timeout (5s) i graceful
fallback (source: live/partial/unreachable). `lib/atina-display.ts` proširen
sa formatSnapshotLine/formatPlanLine/describeSource. `AdminClient` /
`DashboardClient` prikazuju čitljive panele (Source/Base/Plans count, plan
lista, collapsible Greške + Sirov snapshot JSON) uz čuvanje TODO[D.1-restore]
markera za pravi UI.

Verifikacije: npm run build PASS (15/15 ruta, ~178s, exit 0); doc gate audit
PASS; linter bez grešaka. F4-2 acceptance ("realan podatak sa Atina API-ja")
sad validan iako pravi UI ostaje na vlasniku (D.1 Korak 1/2).

Refs: docs/D1-ITER2-PR-BODY.md, docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md
(Iter 2 blok), docs/TEHNICKI-AUDIT-2026-05-13.md (D.1 + Iter 2 napomena),
docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md (Val 355 + Val 354 zapis),
docs/NIVO-1-DRYRUN-LOG.md (Val 355 + Val 354 zapis).

Pun verify Val 355 (2026-05-14): exit 0, ~1038 s, svi gate-ovi PASS
(doc gate, pytest 11/11, Atina test:ci 3079/3079, omnigroup-web build
15/15 stranica, Nest verify:ci 32 unit suites + 140 testova + 10/10 e2e,
compose x3). Vidi NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md.
```

---

## Sledeći koraci (vlasnik)

1. **Pregled diff-a** — `apps/omnigroup-web/src/lib/atina.ts`, `lib/atina-display.ts`, `app/admin/AdminClient.tsx`, `app/dashboard/DashboardClient.tsx`, `app/dev/docs/page.tsx`. Provera da li su svi paneli u skladu sa originalnim brand stilom (ako je originalni dizajn imao `tailwindcss` umesto inline stilova, prepraviti — ali to NE blokira gate).
2. **Lokalni dev test** — `cd apps/omnigroup-web && npm run dev`, otvoriti `http://localhost:3000/admin` i `/dashboard`; sa pokrenutom Atina API (`atina_app` na :3000) videti `live` source; bez Atina vidi se `unreachable` (čekanje 5 s timeout-a).
3. **Korak 1 ili 2 iz runbook-a** — vratiti pravi UI iz OneDrive cloud-a ili Git remote-a; obrisati `TODO[D.1-restore]` markere; preimenovati `data-placeholder` atribute ako su skroz pohranjeni.
4. **Pun verify Val 356+** — komanda iz Koraka 4 u runbook-u; ažurirati [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) sa Val 356 unosom (model: kao Val 355 unos). **Napomena:** **Val 355** sa Iter 2 placeholder kodom je već pokrenut i PASS — vlasnik nastavlja Val 356+ tek posle stvarnog UI restore-a.

---

## Veza sa drugim runbook-ovima

- **Faza N1 / verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **Val 355** (LATEST) + **Val 354** istorijski zapis.
- **Tehnički audit:** [`TEHNICKI-AUDIT-2026-05-13.md`](./TEHNICKI-AUDIT-2026-05-13.md) — D.1 sekcija (Iter 1) + Iter 2 napomena.
- **Paket vlasnika:** [`VLASNIK-PAKET.md`](./VLASNIK-PAKET.md) — Korak 6 (D.1 restore) je opcioni; CEO sekcije A–H ne blokira ali pun produkcioni deploy `apps/omnigroup-web` zahteva.
- **Faza 4 backlog:** [`FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md) — F4-2 sad validan acceptance (realan podatak iz Atina API-ja).

---

*Verzija: 2026-05-14 (D.1 Iter 2 PR body, agent draft).*

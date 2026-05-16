# Phase launch (`PhaseService`)

Centralno upravljanje fazama proizvoda (v1 → v6+). Modul je globalan (`PhaseLaunchModule`); ostali moduli injektuju `PhaseService`.

## `PHASE` (okruženje)

| Varijabla | Podrazumevano | Opis |
|-----------|---------------|------|
| `PHASE`   | `v1`          | Oznaka faze (`v1`, `v2`, …). Ako nije postavljena, koristi se **`v1`**. |

Postavi u `.env` (vidi i korenski **`atina-system/.env.example`** primer `PHASE=v1`).

### Ponašanje po fazama

- **`getPhase()`** — vraća `process.env.PHASE` ili `'v1'`.
- **`isBillingEnabled()`** — `true` za `v3`, `v4`, `v5`, `v6`, ili bilo koju vrednost koja **počinje sa** `v6` (npr. budući sufiks tipa `v6-next`).
- **`isAiEnabled()`** — `true` za `v3`–`v6` ili vrednost koja **počinje sa** `v6`.

Za punu produkciju sa billing/AI proširenjima tipično: **`PHASE=v3`** (ili novija podržana faza).

## Stavke (CEO sekcija C — phase-launch + `PHASE`)

- [x] `PHASE` dokumentovan (ovaj README + `.env.example`)
- [x] Unit testovi za `PhaseService` (`phase.service.spec.ts`)
- [x] `npm test` prolazi (pokreni iz `atina-system/`)

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](../../../docs/EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](../../../docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../../../scripts/README.md) — **Kad podigneš novi broj**.

# Nivo 3 — Talas A3: TITANIX + Astra production

**Agent:** N3-A3 · **Samo ovaj fajl.**

**Evidencija / šabloni (indeks + dry-run):** [`../EVIDENCE-INDEX.md`](../EVIDENCE-INDEX.md) · [`../NIVO-1-DRYRUN-LOG.md`](../NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`../../scripts/README.md`](../../scripts/README.md) — **Kad podigneš novi broj**.

## PDF fajlovi (`sve/`)

- `TITAN_MASTER_TITANIX_BLUEPRINT.pdf`
- `Titan_Astra_Full_Production.pdf`
- `Titan_Astra_Full_Production-1 (1).pdf`

## Zadatak

1. **TITANIX** → `atina-platform/atina/src/modules/titanix/**` + testovi (`titanix.*.test.ts`).
2. **Astra** → Python `src/**`, root `docker-compose`, Forge worker gde je relevantno; status **partial** ako je PDF širi od repoa.
3. Tabela + preporuka za **CEO sekciju F** (TITANIX / Astra).

**Napomena putanje:** u ovom monorepu nema foldera `Python/src/compose`. Python Astra i workeri žive u **`src/`** (koren repoa); „compose“ sloj = **`docker-compose.yml`** u korenu + **`Dockerfile`** targeti `forge` / `atina` / `astra`.

| PDF | Mapiranje | Status | Napomena |
|-----|-----------|--------|------------|
| `TITAN_MASTER_TITANIX_BLUEPRINT.pdf` | **`atina-platform/atina/src/modules/titanix/**`** — `titanix.module.ts`, `controller/`, `service/`, `repository/`, `dto/`. Dokaz testova: šablon **`titanix.*.test.ts`** u `atina-platform/atina/src/tests/unit/` (`titanix.service.test.ts`, `titanix.module.test.ts`, `titanix.module.routes.test.ts`, `titanix.controller.test.ts`, `titanix.dto.test.ts`) i **`modules/titanix/titanix.*.test.ts`** (`titanix.dto.branches.test.ts`, `titanix.routes.branches.test.ts`, `titanix.service.branches.test.ts`). **CEO sekcija D**, red 6: **(T)**. | **partial** | Inženjerski trag i unit pokrivač kao u [`NIVO-2-CEO-D-TRACE.md`](../NIVO-2-CEO-D-TRACE.md); celokupan blueprint PDF nije stranični audit (**aligned** tek posle timskog PDF ↔ kod pregleda, vidi legenda u [`NIVO-3-PDF-TRACE.md`](../NIVO-3-PDF-TRACE.md)). |
| `Titan_Astra_Full_Production.pdf`, `Titan_Astra_Full_Production-1 (1).pdf` (jedan red **CEO sekcije F**, dve varijante u `sve/`) | **`src/astra/**`** — Flask (`app.py`), `templates/`, `static/`. **Orkestracija:** korenski **`docker-compose.yml`** (servisi `forge`, `atina`, `astra`); **Forge worker** i zajednički vault: **`src/forge/**`**, **`src/atina/worker.py`**. Dokaz testova: pytest **`tests/test_astra_app.py`** (import `astra.app`); ostatak Python suite: **`test_*.py`** u `tests/` (`test_vault.py`, `test_rotation.py`) za vault/rotation koji hrane status. Živi stack: [`smoke-stack.ps1`](../../scripts/smoke-stack.ps1) + `GET /api/status` (vidi [`NIVO-1-START.md`](../../NIVO-1-START.md), [`tests/README.md`](../../tests/README.md)); Atina Node u `smoke-stack` = GET `/health` · bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*). | **partial** | „Full Production“ PDF verovatno širi od trenutnog Flask UI + `/api/status` + compose trojke; Node **`atina-platform/atina/src/modules/forge`** je odvojen proizvodni sloj — povezan konceptualno preko vault-a, ne kao 1:1 isti folder sa Python Forge-om. |

## CEO sekcija F — preporuka (TITANIX / Astra)

- **CEO sekcija F** u [`CHECKLIST-CEO-SISTEM.md`](../../CHECKLIST-CEO-SISTEM.md): ostaviti **partial** za oba reda dok tim ne potvrdi stranični PDF audit ili eksplicitno skine opseg; u međuvremenu **CEO sekcija D**, red 6 drži **(T)** za Titanix test trag.
- Astra: čekirati stavke **CEO sekcije F** tek uz dokaz iz ovog fajla + `tests/test_astra_app.py` / [`smoke-stack.ps1`](../../scripts/smoke-stack.ps1) · **`npm run smoke:all`** (Atina bundled) (kao u [`NIVO-1-START.md`](../../NIVO-1-START.md)).

## Reference

- [`NIVO-1-START.md`](../../NIVO-1-START.md)
- [`NIVO-2-CEO-D-TRACE.md`](../NIVO-2-CEO-D-TRACE.md)
- [`NIVO-3-SVE-INVENTORY.md`](../NIVO-3-SVE-INVENTORY.md)
- [`NIVO-3-PDF-TRACE.md`](../NIVO-3-PDF-TRACE.md)
- Pun monorepo gate (isti red kao **CI (monorepo)** (job **`python`**: **`Python (Doslednost dok + pytest)`** — [`../GIT-BRANCH-PROTECTION.md`](../GIT-BRANCH-PROTECTION.md)) — **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../scripts/README.md) → pytest → Atina `test:ci` → **`apps/omnigroup-web`** build → Nest `verify:ci` + tri `docker compose config`; opciono **`-SkipOmnigroupWeb`** / **`-SkipDocAudit`** lokalno): [`verify-monorepo.ps1`](../../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`../GIT-BRANCH-PROTECTION.md`](../GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](../../scripts/smoke-stack.ps1) (HTTP, opciono; Atina Node stub = GET `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../../atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*) · [`scripts/README.md`](../../scripts/README.md) (**Port mismatch** Nest/pg) · **F.4** [`../NIVO-1-F4-TIM-CHECKLIST.md`](../NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify:** [`../NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`../NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14)

# Tests

From the repository root:

```powershell
python -m pytest -q
```

- After **`pytest`**, manual Astra/smoke context: [`docs/PYTHON-ASTRA-OPS.md`](../docs/PYTHON-ASTRA-OPS.md).

[`pytest.ini`](../pytest.ini) (komentar na vrhu upućuje na monorepo job `python` u CI — status check **`Python (Doslednost dok + pytest)`**, [`docs/GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md); tamo pre `pytest` ide **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md) — pravila doc gate-a tamo) postavlja `testpaths = tests` i `pythonpath = src`, pa pytest nalazi testove i uvozi pakete iz `src` (npr. `forge`, `astra`) bez ručnog `PYTHONPATH`. If you run application code outside pytest (for example `python -m ...`), set `PYTHONPATH` to `src` on your platform or run from a layout that matches your tooling.

Vault: tests do not use your real `vault.db`. They use pytest’s `tmp_path` and `monkeypatch.setenv("VAULT_PATH", ...)` so each run gets a temporary SQLite file that is removed afterward.

**Monorepo evidencija (indeks + dry-run):** [`docs/EVIDENCE-INDEX.md`](../docs/EVIDENCE-INDEX.md) · [`docs/NIVO-1-DRYRUN-LOG.md`](../docs/NIVO-1-DRYRUN-LOG.md) · kanonski [`scripts/README.md`](../scripts/README.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

## Astra `GET /api/status` (živi stack)

Kada Astra radi u Dockeru ili lokalno sa stvarnim `VAULT_PATH`:

- **200 JSON** — očekivano; polja uključuju `remaining_rsd`, `initial_budget_rsd`, itd.
- **500 / traceback** — često nepostojeći ili nečitljiv vault fajl, ili greška u SQLite putu; proveri `VAULT_PATH` i da li volume postoji (`docker compose` logovi).
- **Connection refused** — servis nije podignut na očekivanom host/portu (podrazumevano **8080** za Astra u root `docker-compose.yml`).

## Ostatak monorepa (Node / Nest)

Ovaj folder pokriva **samo Python** testove. Za **Atina Node** (`atina-platform/atina`, `npm run test:ci`), **`apps/omnigroup-web`** (`npm ci` + `npm run build`; uz **`npm run dev`** i rutu **`/dev/docs`** vidiš listu linkovanih repo dokova u browseru — [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md)), **Nest** (`atina-system`, `npm run verify:ci`), jedan prolaz skriptom **[`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1)** (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md); prvi korak **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md); opciono **`-SkipOmnigroupWeb`**, **`-SkipCompose`**, **`-SkipNestVerifyCi`** — tada u Nest-u **`verify:n1`**; **`-SkipDocAudit`** — bez doc gate audita samo lokalno) — **ne mora** GitHub; isti red kao workflow **CI (monorepo)** kada ga koristiš. **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 — D.1 Iter 2; ranije **Val 354** / 2026-05-13) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14). Vidi [`../NIVO-1-START.md`](../NIVO-1-START.md), [`NIVO-1-F4-TIM-CHECKLIST.md`](../docs/NIVO-1-F4-TIM-CHECKLIST.md) i [`../CONTRIBUTING.md`](../CONTRIBUTING.md). Multi-stack smoke: **[`smoke-stack.ps1`](../scripts/smoke-stack.ps1)** (Atina Node stub = **`GET /health`**); **Atina bundled:** **`npm run smoke:all`** u `atina-platform/atina` — [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*). Obe skripte i **Get-Help**: **[`scripts/README.md`](../scripts/README.md)** (**Port mismatch** za Nest/pg na punom **`verify:ci`**).

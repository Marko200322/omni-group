# Evidencija — CEO sekcija B (deljeni vault Python ↔ Node Forge)

**Datum:** 2026-05-05  
**Vlasnik:** lokalni prolaz (Cursor agent / omni group workspace)  
**Okruženje:** lokalno (Windows, Docker Desktop)

**Konfiguracija (kratko):**

- Root: `docker-compose.override.yml` (bind `./omni-shared-vault` → `/data` za `forge`, `atina`, `astra`) — **da** (sadržaj kao u [`docker-compose.override.vault-bindmount.example.yml`](../docker-compose.override.vault-bindmount.example.yml)).
- Node: `atina-platform/atina/docker-compose.override.yml` (`FORGE_VAULT_PATH=/data/vault.db`, bind `../../omni-shared-vault:/data`) — **da** (kao primer [`docker-compose.override.forge-vault-bindmount.example.yml`](../atina-platform/atina/docker-compose.override.forge-vault-bindmount.example.yml)).
- Isti host folder za `vault.db`: **da** (`omni-shared-vault` u korenu repoa).

**Provera:**

- `omni-shared-vault\vault.db` postoji nakon rada Forge-a: **da**
- Veličina fajla na hostu i u `atina_app` kontejneru (`/data/vault.db`): **24576** bajtova (oba)
- Node `app` kontejner podignut sa `FORGE_VAULT_PATH=/data/vault.db`: **da**
- `GET http://127.0.0.1:3000/health`: **HTTP 200**
- Opciono SQLite read-only: **N/A** (nije traženo u ovom prolazu)

**Pass / Fail:** **Pass** — jedan SQLite fajl na hostu, Python stack i Node `app` ga dele preko bind mount-a.

**Dodatno (posle vault podešavanja):** `smoke-stack.ps1 -SkipNode:$false` — **PASS** (Astra + Nest + Node; Node = GET `/health`). **Bundled Atina:** `atina-platform/atina` → **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*). **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

**Runbook:** [`VAULT-B-INTEGRATED-RUNBOOK.md`](./VAULT-B-INTEGRATED-RUNBOOK.md)

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

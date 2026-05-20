# Vault path alignment (Python stack ↔ Node Forge)

**Scope:** SQLite ledger used by root **Python** services (`forge`, `atina` worker, `astra`) vs **Atina platform** (`atina-platform/atina`) Forge module. **Nest `atina-system`** (`docker-compose.atina.yml`) does **not** use this vault; no `VAULT_PATH` / `FORGE_VAULT_PATH` there.

## Variable names (do not unify in code without a deliberate refactor)

| Stack | Env var | Default / compose |
|-------|---------|-------------------|
| Python | `VAULT_PATH` | Root `docker-compose.yml`: `/data/vault.db` on named volume `vault_data` → `/data` |
| Node Forge | `FORGE_VAULT_PATH` | `.env.example`: `data/vault.db` (resolved relative to **Node process cwd**, usually repo `atina-platform/atina/`) |
| Node (unset) | — | `resolveForgeVaultPath()` uses `<cwd>/data/vault.db` — see `src/config/index.ts` |

Same **file** requirement for a shared ledger: both stacks must open **one** SQLite path (one writer discipline is your ops concern).

## Canonical paths (documentation)

- **In-container Python stack (root compose):** file **`/data/vault.db`**, volume mount **`vault_data:/data`**.
- **Node when you want the same convention inside a container:** set **`FORGE_VAULT_PATH=/data/vault.db`** and mount a volume or bind at **`/data`** (same as Python). The platform `docker-compose.yml` does not mount `/data` by default; add a volume/bind when you intentionally share.

## Example compose files (bind mount)

- **Python stack (koren):** [`docker-compose.override.vault-bindmount.example.yml`](../docker-compose.override.vault-bindmount.example.yml) → `docker-compose.override.yml`.
- **Node Forge u kontejneru:** [`atina-platform/atina/docker-compose.override.forge-vault-bindmount.example.yml`](../atina-platform/atina/docker-compose.override.forge-vault-bindmount.example.yml) → `atina-platform/atina/docker-compose.override.yml`.

**Korak-po-korak** (redosled, provera, evidencija za CEO sekciju B): [`VAULT-B-INTEGRATED-RUNBOOK.md`](./VAULT-B-INTEGRATED-RUNBOOK.md).

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

## Minimal ways to share one file

1. **Bind mount (simplest for local dev on host)**  
   - Python: override compose so `vault_data` is replaced by e.g. `./omni-vault:/data` and keep `VAULT_PATH=/data/vault.db`.  
   - Node (host `npm run dev`): `FORGE_VAULT_PATH` = absolute path to that file, e.g. `c:\...\omni group\omni-vault\vault.db` (Windows) or repo-relative resolution from `atina-platform/atina` if you place the file under a path both can reach.

2. **Named Docker volume shared by two compose projects**  
   - Declare the volume as **external** in the second compose file so both projects attach the same volume name at `/data`, with `VAULT_PATH` / `FORGE_VAULT_PATH` both `/data/vault.db`. Exact volume name depends on Compose project name (`docker compose ls`).

3. **Keep separate vaults (default today)**  
   - Python stack uses its DB; Node uses `<atina>/data/vault.db` (or your override). No cross-stack consistency until you apply (1) or (2).

## Verify

- Python: `tests/test_vault.py`, `VAULT_PATH` usage under `src/forge/`, `src/atina/worker.py`, `src/astra/app.py`.  
- Node: `npx jest src/tests/unit/forge.config.test.ts` (path resolution for `FORGE_VAULT_PATH`).

## Operational smoke

Brzi runtime dokaz: vidi **[`VAULT-B-INTEGRATED-RUNBOOK.md`](./VAULT-B-INTEGRATED-RUNBOOK.md)** odjeljak 3 i šablon **[`VAULT-B-EVIDENCE.template.md`](./VAULT-B-EVIDENCE.template.md)**. Ne lepi `.env`, tokene niti osetljive putanje u javne logove.

## Staging model (jedan preporučeni obrazac)

Za **staging** gde Python worker (Forge/Atina/Astra) i **Node Forge** dele isti SQLite ledger, koristi **jedan fajl na hostu** — bez menjanja imena env varijabli u kodu:

| Korak | Python (koren compose) | Node (`atina-platform/atina`) | Nest `atina-system` |
|-------|------------------------|-------------------------------|---------------------|
| 1 | Bind mount npr. `./staging-vault:/data` (override compose) | — | N/A (ne koristi vault) |
| 2 | `VAULT_PATH=/data/vault.db` | `FORGE_VAULT_PATH=<apsolutna putanja>/staging-vault/vault.db` u lokalnom `.env` (**ne commitovati**) | — |
| 3 | `docker compose up` Python servisi | `npm run dev` iz `atina-platform/atina/` | `verify:n1` nezavisno |

**Verifikacija:** `python -m pytest -q` (vault testovi) + `npx jest src/tests/unit/forge.config.test.ts` u Atini. Operativni smoke: runbook iznad + evidencija šablona.

**Prod:** isti obrazac sa named volume **external** između dva compose projekta (vidi § „Named Docker volume shared by two compose projects“) ili managed disk na hostu; ponovi runbook pre go-live.

## CEO sekcija B — [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md)

Stavka *„Deljeni `vault_data` … usklađeni sa Node Forge”* u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md): **`[x]`** uz lokalnu evidenciju **2026-05-05** — [`VAULT-B-EVIDENCE-LATEST.md`](./VAULT-B-EVIDENCE-LATEST.md). Za sledeće okruženje (staging/prod) ponovi runbook i novi zapis.

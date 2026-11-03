# 03 — Python sloj: Forge, Atina worker, Astra

**Deo priručnika:** [`README.md`](./README.md) · Prethodno: [`02-ARHITEKTURA.md`](./02-ARHITEKTURA.md) · Sledeće: [`04-ATINA-EXPRESS-SAAS.md`](./04-ATINA-EXPRESS-SAAS.md)

Python sloj je najstariji i najjednostavniji deo monorepa: tri procesa dele jednu SQLite bazu („vault”). Nema HTTP autentikacije i nema spoljnih integracija — svi „cloud provajderi” su stubovi. Operativni detalji (compose, tri-stub smoke) su u [`../PYTHON-ASTRA-OPS.md`](../PYTHON-ASTRA-OPS.md).

## Zavisnosti

`requirements.txt` (koren): `flask==3.0.3`, `gunicorn==23.0.0`, `fpdf2==2.8.2`, `requests==2.32.3`, `pytest==8.3.5`, `pytest-cov==6.0.0`. Python 3.12 u Dockeru. `pytest.ini`: `testpaths=tests`, `pythonpath=src`.

## Master Forge (`src/forge`)

| | |
|---|---|
| Entry | `PYTHONPATH=src python -m forge.master_forge` ili Docker target `forge` |
| Petlja | `master_forge.run()`: `rotation.next_provider()` rotira Oracle → AWS → Azure, bira slučajan trošak u opsegu `FORGE_COST_MIN_RSD..FORGE_COST_MAX_RSD`, upisuje `resources` + `forge_log`, umanjuje `budget_state.remaining_rsd`, spava `FORGE_INTERVAL_SEC` |
| Env | `VAULT_PATH` (podrazumevano `data/vault.db`), `INITIAL_BUDGET_RSD` (4000), `FORGE_INTERVAL_SEC` (8), `FORGE_COST_MIN_RSD` (5), `FORGE_COST_MAX_RSD` (25) |
| Fajlovi | `master_forge.py`, `rotation.py` (enum `CloudProvider`), `vault.py` (connect / `init_schema` / helperi) |
| Testovi | `tests/test_vault.py` (6), `tests/test_rotation.py` (3) |

## Atina worker (`src/atina`)

| | |
|---|---|
| Entry | `PYTHONPATH=src python -m atina.worker` ili Docker target `atina` (compose zavisi od `forge`) |
| Petlja | `worker.run()`: `supply_core.process_pending()` za svaki `resources` red bez `atina_supply` reda kreira supply batch (`batch_code`, `summary`, `payload_json`), najviše `ATINA_BATCH_LIMIT` po tiku; `supply_stats()` broji preostale; spava `ATINA_INTERVAL_SEC` |
| Env | `VAULT_PATH`, `INITIAL_BUDGET_RSD`, `ATINA_INTERVAL_SEC` (12), `ATINA_BATCH_LIMIT` (50) |
| Napomena | `src/atina/Modules/Supply_Core/` sadrži placeholder tekst; nema zasebnog test fajla (pokriveno preko vault/Astra testova) |

## Astra (`src/astra`)

| | |
|---|---|
| Entry | Dev: `PYTHONPATH=src python -m astra.app` (`FLASK_DEBUG=1` za debug). Prod: `gunicorn -b 0.0.0.0:8080 --workers 2 --threads 4 astra.app:app` (Docker target `astra`) |
| Rute | `GET /` — HTML dashboard (`src/astra/templates/`); `GET /api/status` — JSON sa budžetom, brojem resursa, forge logom i supply statistikom |
| Env | `VAULT_PATH`, `INITIAL_BUDGET_RSD`, `PORT` (8080), `FLASK_DEBUG` |
| Testovi | `tests/test_astra_app.py` (2) |

Primer odgovora:

```bash
curl -s http://127.0.0.1:8080/api/status | python -m json.tool
```

## SQLite vault (`src/forge/vault.py`)

| Tabela | Kolone | Namena |
|--------|--------|--------|
| `budget_state` | `id` (PK, CHECK = 1), `remaining_rsd`, `initial_budget_rsd`, `updated_at` | Singleton budžet |
| `resources` | `id`, `provider`, `resource_type`, `label`, `payload_json`, `created_at` | „Iskovani” resursi |
| `forge_log` | `id`, `provider`, `message`, `cost_rsd`, `created_at` | Dnevnik troška |
| `atina_supply` | `id`, `forge_resource_id`, `batch_code`, `summary`, `payload_json`, `created_at` | Supply batch po resursu |

**Važno:** Node Forge modul u Express-u (`atina-platform/atina/src/modules/forge/titan-forge.service.ts`) koristi tabele `forge_budget`, `forge_resources`, `forge_events`. Deljenje istog fajla (`docs/VAULT-ALIGNMENT-NOTES.md`, `docs/VAULT-B-INTEGRATED-RUNBOOK.md`) znači da su tabele **jedna pored druge** u istoj datoteci, ne da jedan proces čita tabele drugog.

## Docker / compose

| Fajl | Uloga |
|------|-------|
| `Dockerfile` (koren) | Multi-stage: `base` → `forge` / `atina` / `astra` |
| `docker-compose.yml` | forge + atina + astra, named volume `vault_data` → `/data`, `VAULT_PATH=/data/vault.db`, Astra `8080:8080` |
| `docker-compose.override.vault-bindmount.example.yml` | Bind `./omni-shared-vault:/data` kad se vault deli sa Node Forge-om |

```bash
docker compose up -d --build        # Python stack
curl -s http://127.0.0.1:8080/api/status
```

## Testiranje

```bash
pip install -r requirements.txt
python -m pytest -q                 # 11 testova: astra 2, vault 6, rotation 3
```

CI job `python` pre pytest-a pokreće doc-gate audit (vidi [`11-RAZVOJ-I-TESTIRANJE.md`](./11-RAZVOJ-I-TESTIRANJE.md)).

## Tipične izmene

| Želiš | Diraš |
|-------|-------|
| Novi „provajder” u rotaciji | `rotation.py` enum + test u `tests/test_rotation.py` |
| Novo polje u statusu Astre | `vault.py` helper + `astra/app.py` + `tests/test_astra_app.py` |
| Promena putanje vault-a u produkciji | `VAULT_PATH` u compose + `FORGE_VAULT_PATH` u Atini (`docs/VAULT-ALIGNMENT-NOTES.md`) |

"""
Atina worker — periodično pokreće Supply Core nad istim Vault-om kao Forge.
"""

from __future__ import annotations

import os
import sys
import time

_SRC = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _SRC not in sys.path:
    sys.path.insert(0, _SRC)

from forge.vault import connect, default_vault_path, init_schema
from atina.supply_core import process_pending, supply_stats


def _env_int(name: str, default: int) -> int:
    v = os.environ.get(name)
    if v is None or str(v).strip() == "":
        return default
    return int(v)


def _env_float(name: str, default: float) -> float:
    v = os.environ.get(name)
    if v is None or str(v).strip() == "":
        return default
    return float(v)


def run() -> None:
    vault_path = os.environ.get("VAULT_PATH")
    conn = connect(vault_path)
    init_schema(conn, initial_budget_rsd=_env_float("INITIAL_BUDGET_RSD", 4000.0))

    interval = _env_int("ATINA_INTERVAL_SEC", 12)
    print(
        f"Atina Supply Core start — Vault: {vault_path or default_vault_path()}, interval={interval}s",
        flush=True,
    )

    while True:
        n = process_pending(conn, batch_limit=_env_int("ATINA_BATCH_LIMIT", 50))
        st = supply_stats(conn)
        if n:
            print(f"Atina: obrađeno {n} resurs(a). Na čekanju: {st['pending_forge_resources']}.", flush=True)
        time.sleep(interval)


if __name__ == "__main__":
    run()

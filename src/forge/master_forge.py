"""
Master Forge: u petlji rotira Oracle → AWS → Azure i puni centralni Vault.
Tri „sistema“ (Oracle/AWS/Azure) kasnije zamenjuju stvarnim adapterima — sada je stub.
"""

from __future__ import annotations

import json
import os
import random
import time
import uuid

from .rotation import next_provider
from .vault import connect, init_schema, insert_forge_event


def _env_float(name: str, default: float) -> float:
    v = os.environ.get(name)
    if v is None or v.strip() == "":
        return default
    return float(v)


def _env_int(name: str, default: int) -> int:
    v = os.environ.get(name)
    if v is None or v.strip() == "":
        return default
    return int(v)


def run() -> None:
    vault_path = os.environ.get("VAULT_PATH")
    conn = connect(vault_path)
    initial = _env_float("INITIAL_BUDGET_RSD", 4000.0)
    init_schema(conn, initial_budget_rsd=initial)

    interval = _env_int("FORGE_INTERVAL_SEC", 8)
    step = 0
    cost_min = _env_float("FORGE_COST_MIN_RSD", 5.0)
    cost_max = _env_float("FORGE_COST_MAX_RSD", 25.0)

    print(f"Master Forge start — Vault: {vault_path or 'default'}, interval={interval}s", flush=True)

    while True:
        provider = next_provider(step)
        cost = round(random.uniform(cost_min, cost_max), 2)
        rid = str(uuid.uuid4())[:8]
        label = f"{provider.value.upper()}-unit-{rid}"
        payload = {
            "system_slot": provider.value,
            "allocation_id": rid,
            "capacity_units": random.randint(1, 10),
            "note": "Stub do povezivanja pravih sistema",
        }
        ok, err = insert_forge_event(
            conn,
            provider=provider.value,
            resource_type="compute_slot",
            label=label,
            payload=payload,
            cost_rsd=cost,
        )
        if not ok:
            print(f"Forge: {err}", flush=True)
            time.sleep(interval)
            continue

        print(
            f"Forge [{provider.value}] +{label} (−{cost} RSD) | payload={json.dumps(payload)}",
            flush=True,
        )
        step += 1
        time.sleep(interval)


if __name__ == "__main__":
    run()

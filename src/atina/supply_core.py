"""
Supply Core (Atina): uzima nekorišćene Forge resurse i beleži supply batch u Vault.
Originalni ZIP je imao samo placeholder tekst; ovo je izvršna logika modula.
"""

from __future__ import annotations

import sqlite3
import uuid

from forge.vault import insert_atina_supply_for_resource


def process_pending(conn: sqlite3.Connection, *, batch_limit: int = 50) -> int:
    """
    Za sve resurse iz Forge-a koji još nemaju Atina zapis, kreira supply red.
    Vraća broj novih redova.
    """
    rows = conn.execute(
        """
        SELECT r.id, r.provider, r.label, r.resource_type, r.payload_json
        FROM resources r
        LEFT JOIN atina_supply a ON a.forge_resource_id = r.id
        WHERE a.id IS NULL
        ORDER BY r.id ASC
        LIMIT ?
        """,
        (batch_limit,),
    ).fetchall()

    n = 0
    for row in rows:
        batch_code = str(uuid.uuid4())[:10]
        summary = f"Supply_Core: obrada [{row['provider']}] {row['label']}"
        payload = {
            "module": "Supply_Core",
            "subsystem": "atina",
            "forge_resource_id": row["id"],
            "provider": row["provider"],
            "resource_type": row["resource_type"],
            "source_note": "Sekcije 1–30 mapirane iz Titan → Atina (placeholder u ZIP-u).",
        }
        insert_atina_supply_for_resource(
            conn,
            forge_resource_id=int(row["id"]),
            batch_code=batch_code,
            summary=summary,
            payload=payload,
        )
        n += 1
    return n


def supply_stats(conn: sqlite3.Connection) -> dict:
    pending = conn.execute(
        """
        SELECT COUNT(*) AS c
        FROM resources r
        LEFT JOIN atina_supply a ON a.forge_resource_id = r.id
        WHERE a.id IS NULL
        """
    ).fetchone()
    return {"pending_forge_resources": int(pending["c"]) if pending else 0}

from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


def default_vault_path() -> str:
    return os.environ.get(
        "VAULT_PATH",
        str(Path(__file__).resolve().parents[2] / "data" / "vault.db"),
    )


def connect(path: str | None = None) -> sqlite3.Connection:
    p = path or default_vault_path()
    Path(p).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(p, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_schema(conn: sqlite3.Connection, *, initial_budget_rsd: float) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS budget_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          remaining_rsd REAL NOT NULL,
          initial_budget_rsd REAL NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS resources (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          provider TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          label TEXT,
          payload_json TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS forge_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          provider TEXT NOT NULL,
          message TEXT,
          cost_rsd REAL NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS atina_supply (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          forge_resource_id INTEGER,
          batch_code TEXT NOT NULL,
          summary TEXT NOT NULL,
          payload_json TEXT,
          created_at TEXT NOT NULL
        );
        """
    )
    row = conn.execute("SELECT id FROM budget_state WHERE id = 1").fetchone()
    if row is None:
        now = _utc_now()
        conn.execute(
            "INSERT INTO budget_state (id, remaining_rsd, initial_budget_rsd, updated_at) VALUES (1, ?, ?, ?)",
            (initial_budget_rsd, initial_budget_rsd, now),
        )
    conn.commit()


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_budget(conn: sqlite3.Connection) -> dict:
    r = conn.execute(
        "SELECT remaining_rsd, initial_budget_rsd, updated_at FROM budget_state WHERE id = 1"
    ).fetchone()
    if r is None:
        return {"remaining_rsd": 0.0, "initial_budget_rsd": 0.0, "updated_at": None}
    return {
        "remaining_rsd": float(r["remaining_rsd"]),
        "initial_budget_rsd": float(r["initial_budget_rsd"]),
        "updated_at": r["updated_at"],
    }


def insert_forge_event(
    conn: sqlite3.Connection,
    *,
    provider: str,
    resource_type: str,
    label: str,
    payload: dict,
    cost_rsd: float,
) -> tuple[bool, str | None]:
    """
    Upisuje resurs i log. Vraća (ok, error_message).
    Ako nema budžeta, ne upisuje ništa.
    """
    budget = get_budget(conn)
    if budget["remaining_rsd"] < cost_rsd:
        return False, "Nedovoljan budžet — kovanje zaustavljeno."

    now = _utc_now()
    payload_json = json.dumps(payload, ensure_ascii=False)
    conn.execute(
        """
        INSERT INTO resources (provider, resource_type, label, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (provider, resource_type, label, payload_json, now),
    )
    conn.execute(
        """
        INSERT INTO forge_log (provider, message, cost_rsd, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (provider, f"Kovano: {label}", cost_rsd, now),
    )
    conn.execute(
        """
        UPDATE budget_state
        SET remaining_rsd = remaining_rsd - ?, updated_at = ?
        WHERE id = 1
        """,
        (cost_rsd, now),
    )
    conn.commit()
    return True, None


def recent_log(conn: sqlite3.Connection, limit: int = 20) -> list[dict]:
    rows = conn.execute(
        """
        SELECT id, provider, message, cost_rsd, created_at
        FROM forge_log
        ORDER BY id DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    return [dict(r) for r in rows]


def resource_count(conn: sqlite3.Connection) -> int:
    r = conn.execute("SELECT COUNT(*) AS c FROM resources").fetchone()
    return int(r["c"]) if r else 0


def recent_atina_supply(conn: sqlite3.Connection, limit: int = 20) -> list[dict]:
    rows = conn.execute(
        """
        SELECT id, forge_resource_id, batch_code, summary, created_at
        FROM atina_supply
        ORDER BY id DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    return [dict(r) for r in rows]


def atina_supply_count(conn: sqlite3.Connection) -> int:
    r = conn.execute("SELECT COUNT(*) AS c FROM atina_supply").fetchone()
    return int(r["c"]) if r else 0


def insert_atina_supply_for_resource(
    conn: sqlite3.Connection,
    *,
    forge_resource_id: int,
    batch_code: str,
    summary: str,
    payload: dict,
) -> None:
    now = _utc_now()
    conn.execute(
        """
        INSERT INTO atina_supply (forge_resource_id, batch_code, summary, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (forge_resource_id, batch_code, summary, json.dumps(payload, ensure_ascii=False), now),
    )
    conn.commit()

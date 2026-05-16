from __future__ import annotations

import os
import sys
from pathlib import Path

# Lokalni razvoj: src je na PYTHONPATH
_SRC = Path(__file__).resolve().parents[1]
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from flask import Flask, jsonify, render_template

from forge.vault import (
    atina_supply_count,
    connect,
    default_vault_path,
    get_budget,
    init_schema,
    recent_atina_supply,
    recent_log,
    resource_count,
)

from atina.supply_core import supply_stats

app = Flask(
    __name__,
    template_folder=str(Path(__file__).parent / "templates"),
    static_folder=str(Path(__file__).parent / "static"),
)


def _db():
    p = os.environ.get("VAULT_PATH", default_vault_path())
    return connect(p)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/status")
def api_status():
    conn = _db()
    init_schema(
        conn,
        initial_budget_rsd=float(os.environ.get("INITIAL_BUDGET_RSD", "4000")),
    )
    budget = get_budget(conn)
    logs = recent_log(conn, limit=15)
    count = resource_count(conn)
    last_provider = logs[0]["provider"] if logs else None
    atina_log = recent_atina_supply(conn, limit=12)
    pending = supply_stats(conn)
    return jsonify(
        {
            "remaining_rsd": round(budget["remaining_rsd"], 2),
            "initial_budget_rsd": round(budget["initial_budget_rsd"], 2),
            "budget_updated_at": budget["updated_at"],
            "resource_count": count,
            "last_provider": last_provider,
            "recent_forge_log": logs,
            "atina_supply_count": atina_supply_count(conn),
            "atina_pending_resources": pending["pending_forge_resources"],
            "recent_atina_supply": atina_log,
        }
    )


def create_app():
    return app


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG") == "1", threaded=True)

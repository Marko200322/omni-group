"""Flask app tests — offline with temp vault DB."""

from __future__ import annotations

import pytest

from astra.app import app as flask_app
from forge import vault


@pytest.fixture
def client(tmp_path, monkeypatch):
    db = tmp_path / "vault.db"
    monkeypatch.setenv("VAULT_PATH", str(db))
    monkeypatch.setenv("INITIAL_BUDGET_RSD", "4000")
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as c:
        yield c


def test_index_returns_html(client):
    rv = client.get("/")
    assert rv.status_code == 200
    assert b"Astra" in rv.data or b"astra" in rv.data.lower()


def test_api_status_json_shape(client, tmp_path):
    rv = client.get("/api/status")
    assert rv.status_code == 200
    data = rv.get_json()
    assert data is not None
    assert "remaining_rsd" in data
    assert "initial_budget_rsd" in data
    assert data["initial_budget_rsd"] == 4000.0
    assert "resource_count" in data
    assert "recent_forge_log" in data
    assert "atina_pending_resources" in data

    conn = vault.connect(str(tmp_path / "vault.db"))
    try:
        b = vault.get_budget(conn)
        assert b["remaining_rsd"] == pytest.approx(4000.0)
    finally:
        conn.close()

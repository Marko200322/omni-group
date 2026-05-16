"""Unit tests for forge.vault — offline, temp SQLite."""

from __future__ import annotations

import os
import sqlite3

import pytest

from forge import vault


def test_connect_uses_path_and_creates_parent(tmp_path):
    db = tmp_path / "nested" / "vault.db"
    conn = vault.connect(str(db))
    try:
        assert db.is_file()
        assert isinstance(conn, sqlite3.Connection)
    finally:
        conn.close()


def test_init_schema_and_get_budget(tmp_path, monkeypatch):
    db = tmp_path / "v.db"
    monkeypatch.setenv("VAULT_PATH", str(db))
    conn = vault.connect()
    try:
        vault.init_schema(conn, initial_budget_rsd=4000.0)
        b = vault.get_budget(conn)
        assert b["remaining_rsd"] == pytest.approx(4000.0)
        assert b["initial_budget_rsd"] == pytest.approx(4000.0)
        assert b["updated_at"] is not None
    finally:
        conn.close()


def test_init_schema_idempotent_budget_row(tmp_path, monkeypatch):
    db = tmp_path / "v.db"
    monkeypatch.setenv("VAULT_PATH", str(db))
    conn = vault.connect()
    try:
        vault.init_schema(conn, initial_budget_rsd=100.0)
        first = vault.get_budget(conn)
        vault.init_schema(conn, initial_budget_rsd=9999.0)
        second = vault.get_budget(conn)
        assert second["initial_budget_rsd"] == pytest.approx(first["initial_budget_rsd"])
        assert second["remaining_rsd"] == pytest.approx(first["remaining_rsd"])
    finally:
        conn.close()


def test_get_budget_missing_row_returns_zeros(tmp_path):
    db = tmp_path / "empty.db"
    conn = sqlite3.connect(str(db))
    conn.row_factory = sqlite3.Row
    try:
        conn.execute(
            "CREATE TABLE budget_state (id INTEGER PRIMARY KEY, remaining_rsd REAL, initial_budget_rsd REAL, updated_at TEXT)"
        )
        conn.commit()
        out = vault.get_budget(conn)
        assert out == {"remaining_rsd": 0.0, "initial_budget_rsd": 0.0, "updated_at": None}
    finally:
        conn.close()


def test_default_vault_path_respects_env(monkeypatch, tmp_path):
    p = str(tmp_path / "from_env.db")
    monkeypatch.setenv("VAULT_PATH", p)
    assert vault.default_vault_path() == p


def test_default_vault_path_fallback_when_unset(monkeypatch):
    monkeypatch.delenv("VAULT_PATH", raising=False)
    d = vault.default_vault_path()
    assert "vault.db" in d
    assert os.path.isabs(d)

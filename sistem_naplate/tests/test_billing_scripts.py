"""Brzi testovi bez mreže (Telegram se ne zove kada je uplata isključena ili mock)."""

from __future__ import annotations

import os

import generate_invoice as gi
import check_payment as cp


def test_latin1_pdf_text_ascii_fallback() -> None:
    # š→s, ž→z, đ→dj (redosled zamena u generate_invoice)
    assert gi._latin1_pdf_text("čćšžđ ČĆŠŽĐ") == "ccszdj CCSZDj"


def test_check_payment_unpaid_no_telegram() -> None:
    assert cp.check_payment("001", payment_received=False) is False


def test_check_payment_paid_with_mock_telegram(monkeypatch) -> None:
    monkeypatch.setattr(cp, "send_telegram", lambda text: True)
    assert cp.check_payment("042", payment_received=True) is True


def test_generate_invoice_writes_pdf() -> None:
    inv = "pytest_local_only"
    path = gi.generate_invoice(inv, "Test Klijent", "Test usluga", 10, invoice_type="one-time")
    try:
        assert os.path.isfile(path)
        assert os.path.getsize(path) > 400
    finally:
        if os.path.isfile(path):
            os.remove(path)

"""
FAZA 1 — provera uplate (simulacija).

SIMULATE_PAYMENT_RECEIVED u config.py:
  True  → šalje Telegram: "Uplata primljena za fakturu <id>"
  False → nema uplate → nema poruke (NEMA UPLATE = NEMA USLUGE)

FAZA 2: zameniti logiku pozivom na Stripe/Wise webhook ili bank API.
"""

from __future__ import annotations

import argparse
import sys

import requests

from config import CHAT_ID, SIMULATE_PAYMENT_RECEIVED, TELEGRAM_TOKEN


def send_telegram(text: str) -> bool:
    if not TELEGRAM_TOKEN or TELEGRAM_TOKEN == "tvoj_bot_token":
        print("Upozorenje: TELEGRAM_TOKEN nije podesen u config.py", file=sys.stderr)
        return False
    if not CHAT_ID or CHAT_ID == "tvoj_chat_id":
        print("Upozorenje: CHAT_ID nije podesen u config.py", file=sys.stderr)
        return False

    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    res = requests.post(
        url,
        data={"chat_id": CHAT_ID, "text": text},
        timeout=30,
    )
    if not res.ok:
        print(f"Telegram HTTP {res.status_code}: {res.text[:200]}", file=sys.stderr)
        return False
    return True


def check_payment(invoice_id: str, *, payment_received: bool | None = None) -> bool:
    """
    Ako je uplata primljena → Telegram poruka tačno po specifikaciji.
    payment_received: None = koristi SIMULATE_PAYMENT_RECEIVED iz config-a.
    """
    if payment_received is None:
        payment_received = SIMULATE_PAYMENT_RECEIVED

    if payment_received:
        msg = f"Uplata primljena za fakturu {invoice_id}"
        if send_telegram(msg):
            print(f"OK: {msg}")
        else:
            print(f"Uplata za {invoice_id} potvrdjena (Telegram slanje neuspelo).")
        return True

    print(f"Nema evidencije uplate za fakturu {invoice_id} - usluga se ne aktivira.")
    return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Provera uplate + Telegram (FAZA 1 simulacija)")
    parser.add_argument("invoice_id", nargs="?", default="001", help="Broj fakture npr. 001")
    parser.add_argument(
        "--paid",
        action="store_true",
        help="Ignoriši simulaciju: tretiraj kao uplaćeno (test Telegrama)",
    )
    parser.add_argument(
        "--unpaid",
        action="store_true",
        help="Ignoriši simulaciju: tretiraj kao neplaćeno",
    )
    args = parser.parse_args()
    if args.paid and args.unpaid:
        parser.error("Koristi samo jedno od --paid / --unpaid")

    explicit: bool | None = None
    if args.paid:
        explicit = True
    elif args.unpaid:
        explicit = False

    check_payment(args.invoice_id, payment_received=explicit)


if __name__ == "__main__":
    main()

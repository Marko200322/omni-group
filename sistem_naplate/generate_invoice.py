"""
FAZA 1 — PDF fakture za IBAN uplate.
Izlaz: pdfs/sistem_naplate_<invoice_id>.pdf
"""

from __future__ import annotations

import os
from datetime import datetime

from fpdf import FPDF
from fpdf.enums import XPos, YPos

from config import BANK_NAME, BIC, CURRENCY, IBAN, ISSUER_EMAIL, ISSUER_NAME


def _latin1_pdf_text(s: str) -> str:
    """Core font Helvetica = latin-1; dijakritike u ASCII za stabilan PDF."""
    return (
        s.replace("č", "c")
        .replace("ć", "c")
        .replace("š", "s")
        .replace("ž", "z")
        .replace("đ", "dj")
        .replace("Č", "C")
        .replace("Ć", "C")
        .replace("Š", "S")
        .replace("Ž", "Z")
        .replace("Đ", "Dj")
    )


def generate_invoice(
    invoice_id: str,
    client_name: str,
    description: str,
    amount: float | int,
    *,
    invoice_type: str = "one-time",
) -> str:
    """
    Generiše PDF sa klijentom, iznosom, IBAN/BIC/bankom i uslovima plaćanja.
    Vraća putanju do fajla.
    """
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("helvetica", size=12)

    def T(t: str) -> str:
        return _latin1_pdf_text(t)

    def line(text: str, *, align: str = "L") -> None:
        pdf.cell(0, 10, text, new_x=XPos.LMARGIN, new_y=YPos.NEXT, align=align)

    line("FAKTURA / INVOICE", align="C")
    line(T(f"Broj fakture: {invoice_id}"))
    line(T(f"Datum: {datetime.now().strftime('%d.%m.%Y')}"))

    line(T(f"Izdavac: {ISSUER_NAME}"))
    line(f"Email: {ISSUER_EMAIL}")

    line(T(f"Klijent: {client_name}"))

    line(T(f"Opis usluge: {description}"))
    line(T(f"Iznos: {amount} {CURRENCY}"))
    line(T(f"UKUPNO ZA UPLATU: {amount} {CURRENCY}"))

    line(T("PODACI ZA UPLATU:"))
    line(f"IBAN: {IBAN}")
    line(f"BIC/SWIFT: {BIC}")
    line(T(f"Banka: {BANK_NAME}"))
    line(T(f"Valuta: {CURRENCY}"))
    line(T(f"Svrha placanja: Faktura {invoice_id}"))

    line(T("USLOVI PLACANJA:"))
    line(T("Usluga se aktivira isključivo nakon prijema uplate."))
    line(T("Bez evidentirane uplate, usluga nece biti isporucena."))
    line(T("NEMA UPLATE = NEMA USLUGE."))

    if invoice_type == "subscription":
        line(T("KASNJENJE PLACANJA:"))
        line(T("U slucaju da uplata ne bude izvrsena do roka, usluga se automatski suspenduje."))

    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pdfs")
    os.makedirs(out_dir, exist_ok=True)

    pdf_file = os.path.join(out_dir, f"sistem_naplate_{invoice_id}.pdf")
    pdf.output(pdf_file)
    print(f"Faktura generisana: {pdf_file}")
    return pdf_file


if __name__ == "__main__":
    generate_invoice("001", "Firma ABC", "Jednokratna usluga", 500, invoice_type="one-time")
    generate_invoice("002", "Firma XYZ", "Pretplata", 100, invoice_type="subscription")

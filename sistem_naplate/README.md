# Sistem naplate (FAZA 1)

Skripte za PDF fakture (`generate_invoice.py`) i simulaciju provere uplate + Telegram (`check_payment.py`). Zavisi od `config.py` (primer: `config.example.py`).

## Lokalno pokretanje

```powershell
cd sistem_naplate
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip
python -m pip install -r requirements.txt pytest
python -m pytest tests -q
```

Generisanje PDF-a (upis u `pdfs/`):

```powershell
python generate_invoice.py
```

Provera uplate (koristi `SIMULATE_PAYMENT_RECEIVED` iz `config.py`, ili `--paid` / `--unpaid`):

```powershell
python check_payment.py 001
```

## Pytest u monorepu

Korenski [`pytest.ini`](../pytest.ini) ima `testpaths = tests`, pa **`python -m pytest -q` iz korena repoa ne pokreće** ove testove — namerno, da CI ostane na `tests/`. Za ovaj modul koristi komandu iznad iz foldera `sistem_naplate` ili: `python -m pytest sistem_naplate/tests -q` iz korena (uz instalirane zavisnosti u aktivnom venv-u).

**Monorepo evidencija (indeks + dry-run):** [`docs/EVIDENCE-INDEX.md`](../docs/EVIDENCE-INDEX.md) · [`docs/NIVO-1-DRYRUN-LOG.md`](../docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

# =============================================================================
# FAZA 1 — obavezno popuni pre produkcije (ili kopiraj iz config.example.py)
# =============================================================================
# Pravilo: NEMA UPLATE = NEMA USLUGE

# Telegram
TELEGRAM_TOKEN = "tvoj_bot_token"
CHAT_ID = "tvoj_chat_id"

# Bankovni podaci za PDF (IBAN uplate)
IBAN = "TVOJ_IBAN"
BIC = "TVOJ_BIC"
BANK_NAME = "TVOJA_BANCA"
CURRENCY = "EUR"

# Izdavač na fakturi (PDF)
ISSUER_NAME = "Marko Kosic"
ISSUER_EMAIL = "tvoj_email@example.com"

# -----------------------------------------------------------------------------
# Simulacija provere uplate (FAZA 1)
# True  = tretiraj kao da je uplata uvek primljena (test)
# False = nema uplate → nema Telegram potvrde (do FAZE 2 / bank API / webhook)
# -----------------------------------------------------------------------------
SIMULATE_PAYMENT_RECEIVED = True

# =============================================================================
# FAZA 2 (kasnije) — Stripe / Wise / bank API
# =============================================================================
# STRIPE_WEBHOOK_SECRET = ""
# STRIPE_SECRET_KEY = ""
# WISE_API_TOKEN = ""
# BANK_API_URL = ""
# BANK_API_KEY = ""

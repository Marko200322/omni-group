# Marko P2 — završi GTM (firma → Stripe LIVE)

**Sistem je već osposobljen.** Ti samo popuniš tajne i redeploy-uješ.  
Agent ne dira Stripe LIVE ni firmu.

**Checker:** `.\scripts\marko-p2-finish.ps1`  
**Kanonski status:** [`STATUS-KANON.md`](./STATUS-KANON.md) (P2) · Ultimatrix: `node scripts/test-ultimatrix.mjs`

---

## Redosled (obavezno)

### 1) P2-01 Firma / VAT

U `deploy-secrets.local/deploy.config.json` (gitignored):

| Polje | Šta |
|-------|-----|
| `companyLegalName` | Pun pravni naziv |
| `companyTaxId` | EIN / PIB / MB |
| `companyAddress` | Ulica, grad, država |

Posle deploy-a ide u:
- Atina fakture / email issuer (`COMPANY_*`)
- Web impressum (`NEXT_PUBLIC_COMPANY_*`)

### 2) P2-02 Stripe LIVE

U Stripe Dashboard (**Live** mode, ne Test):

1. API keys → `sk_live_…` + `pk_live_…`
2. Products/Prices → upiši `starterPriceId` / `proPriceId` / `enterprisePriceId` (i yearly ako koristiš)
3. Developers → Webhooks → endpoint:  
   `https://api.omnigrouptech.com/api/v1/payments/webhooks/stripe`  
   → signing secret `whsec_…` (LIVE)

U `deploy.config.json`:

```text
stripeSecretKey        = sk_live_…
stripePublishableKey   = pk_live_…
stripeWebhookSecret    = whsec_…
starterPriceId / proPriceId / enterprisePriceId = price_… (LIVE)
```

`deploy-config-env.ps1` automatski stavlja `PAYMENTS_MODE=live` kad secret počinje sa `sk_live_`.

**Zaštita:** SafeDeploy **odbija** `sk_live_` ako firma polja nisu popunjena.

### 3) Deploy + smoke

```powershell
cd "C:\dev\omni group"
.\scripts\marko-p2-finish.ps1          # mora exit 0
.\scripts\deploy-from-local-secrets.ps1 -SafeDeploy
# Kartica €1 na https://omnigrouptech.com/pricing
node scripts/test-ultimatrix.mjs
.\scripts\audit-prod-autonomous.ps1
```

### 4) Opciono posle LIVE

| ID | Šta |
|----|-----|
| P2-03…05 | PayPal / Wise / Kriptoman ključevi (fail-closed dok prazni) |
| Lead | `leadLiveHarvestOnKickoff: true` kad hoćeš live harvest |
| P0-07 | Legal counsel sign-off (stranice već u kodu) |

---

## Dok ne uradiš P2

- Prod ostaje **Stripe TEST** (GTM CONDITIONAL)
- Paketi, Ultimatrix, intro −15%/50, support AI — **rade**
- Manual bank transfer može da ide sa firmom kad je popuniš (čak i pre LIVE kartice)

---

*Ne commit-uj `deploy.config.json`. Posle LIVE ažuriraj STATUS-KANON LIVE-03 → LIVE.*

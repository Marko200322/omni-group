# Factory M6 — spremno u kodu (ti samo ključevi + bump)

Kad imaš sredstva i gate-ove iz [`MARKETING-REVENUE-PHASED-CHECKLIST.md`](./MARKETING-REVENUE-PHASED-CHECKLIST.md), **ne diraš module ručno** — samo popuniš ključeve i bump-uješ fazu.

---

## Jedna komanda kad si spreman

```powershell
# 1. Popuni KLJUCEVI + deploy.config (vidi tabele ispod)
.\scripts\apply-integration-keys.ps1
.\scripts\sync-kljucevi-from-deploy.ps1

# 2. Bump na M6 (proveri missing keys, piše deploy.config)
.\scripts\bump-factory-phase.ps1 -TargetPhase M6 -Apply

# 3. Deploy — factory phase pali sve module
.\scripts\deploy-from-local-secrets.ps1

# 4. Verify
.\scripts\verify-factory-phase.ps1 -FactoryPhase M6
.\scripts\check-stripe-env.ps1
.\scripts\smoke-platform-full.ps1 -WebBase https://omnigrouptech.com -Password <admin>
```

---

## Šta kod automatski pali na M6

| Modul / env | Vrednost |
|-------------|----------|
| `FACTORY_PHASE` | M6 |
| `NEXT_PUBLIC_PROD_MODE` | **full** (automatski, čak i ako je bio lean) |
| `PAYMENTS_MODE` | **live** (kad `stripeSecretKey` u deploy.config) |
| Lead DB | `LEAD_DATABASE_ROLLOUT_PHASE=F5`, enrich ON |
| Outbound | cap 100/dan, warmup OFF, domain warmup complete |
| Autonomy | ON + category rollout + reinvest 20% |
| Avatar | support + sales ON, AI aggregator ON |
| Scraper, Hunter, CRM, fulfillment | nasleđeno M0–M5 |

Skripta: `scripts/prod-factory-phase.ps1` · runtime guard: `factory-phase-guard.ts`

---

## Ključevi koje TI popuniš (M6 minimum)

### `deploy-secrets.local/deploy.config.json`

| Polje | Obavezno M6 |
|-------|-------------|
| `factoryPhase` | `"M6"` (bump skripta) |
| `prodMode` | auto → `full` na M6 |
| `monthlyBudgetEur` | preporuka **800–2000** kad Stripe live |
| `stripeSecretKey` | `sk_live_...` |
| `stripePublishableKey` | `pk_live_...` |
| `stripeWebhookSecret` | `whsec_...` |
| `starterPriceId`, `proPriceId`, `enterprisePriceId` | Stripe Price IDs |
| `heygenApiKey` **ili** `didApiKey` | premium avatar |
| `hunterApiKey` | lead enrich (M4+, ostaje) |
| `scraperKey` | Apify (M2+, ostaje) |
| `neverbounceApiKey` / `zerobounceApiKey` | F5 verified outbound |
| `resend.*` | i dalje za kontakt/notifikacije |

### `atina-platform/atina/KLJUCEVI-POPUNI.local.txt`

Isti ključevi kao deploy.config — sync:

```powershell
.\scripts\sync-kljucevi-from-deploy.ps1   # deploy -> KLJUCEVI
.\scripts\apply-integration-keys.ps1      # KLJUCEVI -> deploy + .env
```

---

## Gate pre M6 (poslovno, ne kod)

- [ ] M5 autonomy stabilan ≥ 30 dana
- [ ] MRR pokriva lead + AI spend
- [ ] Stripe firma + live webhook 200
- [ ] Lead F5 — nijedan send bez verified email
- [ ] DNS `api.omnigrouptech.com` OK

---

## Fajlovi koje agent održava (ne diraj ručno)

| Fajl | Uloga |
|------|--------|
| `scripts/deploy-config-env.ps1` | deploy.config ↔ env mapiranje M0–M6 |
| `scripts/prod-factory-phase.ps1` | module flagovi po fazi |
| `scripts/bump-factory-phase.ps1` | bump + gap report |
| `scripts/verify-factory-phase.ps1` | lokalna verifikacija |
| `factory-phase-modules.ts` | Atina admin status API |

---

*Ti si na M0 — ne bump-uj na M6 dok gate-ovi nisu zeleni. Infrastruktura je spremna.*

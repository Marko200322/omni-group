# Fulfillment matrix â€” dual watch

**Updated:** 2026-09-24 00:21:24
**Process:** not running

| Run | Unique | PASS | FAIL | Raw rows | % |
|-----|--------|------|------|----------|---|
| Canonical (2026-09-22) | 1000/1000 | 1000 | 0 | 1351 | 100% |
| Active run (2026-09-23) | 942/1000 | 942 | 0 | 942 | 94.2% |

**Canonical proof for go-live:** 2026-09-22 CSV (1000 unique PASS). 2026-09-23 = optional re-run.

## Canonical (2026-09-22)

- CSV: `docs\evidence\fulfillment-matrix-prod-20260922_082458.csv`

```
  PASS artifacts=2 checklist=pct (s)

[320/1000] -- bundle-ops-clarity @ legal_services --
  checkout-bundle-ops-clarity-legal_services rate limit - cekam 90s (pokusaj 1/8)...
  checkout-bundle-ops-clarity-legal_services rate limit - cekam 120s (pokusaj 2/8)...
  checkout-bundle-ops-clarity-legal_services rate limit - cekam 150s (pokusaj 3/8)...
```

## Active run (2026-09-23)

- CSV: `docs\evidence\fulfillment-matrix-prod-20260923_040427.csv`

```

[942/1000] -- setup-full @ home_services --
  PASS artifacts=4 checklist=pct (s)

[943/1000] -- setup-custom @ home_services --
  PASS artifacts=3 checklist=pct (s)
```


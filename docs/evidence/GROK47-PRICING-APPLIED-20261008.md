# Grok 4.7 competition compare → pricing + ops applied (2026-10-08 / raised 2026-10-09)

**Source:** [`GROK47-PACKAGE-COMPETITION-COMPARE-20261008.md`](./GROK47-PACKAGE-COMPETITION-COMPARE-20261008.md)  
**Raise note:** [`PRICING-RAISE-FIRST50-20261009.md`](./PRICING-RAISE-FIRST50-20261009.md)

## Applied

| Change | Detail |
|--------|--------|
| **M6 list prices** | First Grok cut, then **Marko raise** (felt too cheap) — see raise note |
| **Intro first 50** | Default **−18%** for first **50** distinct package clients after `2026-10-09`; then **100% regular list** |
| **Checkout** | Charge = intro while slots remain; metadata `introPromo` + promo label |
| **UI** | Cards = regular list + “first 50 → then this full price”; quote panel = you pay now / after 50 regular; site banner |
| **Support AI solver** | `support-ticket-agent.service.ts` |
| **Copy** | SERVICE + DOCS honesty; lead-gen = ops retainer |

## Intro math (raised list)

Cards show **regular**. Checkout while intro open: **×0.82**.

| Package | Regular (after 50) | Intro now (−18%) |
|---------|-------------------:|-----------------:|
| setup-quick | €690 | €566 |
| landing | €1290 | €1058 |
| website-business | €2290 | €1878 |
| website-ecommerce | €2790 | €2288 |
| audit | €890 | €730 |
| custom-software | €1490 | €1222 |

## Priority held

Packages ship **product/service + docs companion + invoice** (fail-closed). PDF-alone cannot PASS.

## Marko still owns

Firma / legal entity, Stripe LIVE keys, ads API credentials, Apollo harvest flags.

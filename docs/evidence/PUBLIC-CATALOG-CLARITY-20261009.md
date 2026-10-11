# Public catalog clarity (2026-10-09)

**Goal:** Strictly professional public surfaces — crystal-clear that the catalog is **20 capabilities × 50 industries = 1,000 packages**, without dumping 1,000 cards.

## What was wrong
- API already reported `sellablePackages: 1000` / `industryGroups: 50`.
- Marketing copy talked vaguely about “SKUs” / “services + bundles”.
- Industry browse was only a dropdown; Products forced a filter with weak orientation.

## What shipped
| Surface | Change |
|---------|--------|
| Home | Stats: 1,000 packages · 50 industries; line `20 × 50 = 1,000` |
| Pricing | Catalog overview strip + industry chip grid + clarity FAQ |
| Products | Overview + full industry directory before package cards |
| Services | Same overview + industry grid |
| Components | `PublicCatalogOverview`, `IndustryBrowseGrid`, `PricingClarityFaq` |

## Competitor patterns borrowed (then improved)
- Transparent math / scope (agency pricing pages)
- Industry / stage filter before long lists
- Short FAQ that answers “what am I buying?” and “why don’t I see 1000 cards?”
- Cards keep regular list + first-50 intro note

## Proof
- Ultimatrix PASS — `ultimatrix-FULL-20261009.*`
- SafeDeploy **EXIT 0** — `_tmp-safedeploy-catalog-clarity-20261009.txt`
- Live API: `GET /api/public/catalog` → `basePackages:20`, `industryGroups:50`, `sellablePackages:1000`
- Live HTML: home / pricing / products contain `1,000`, industry directory, FAQ “Clear answers”

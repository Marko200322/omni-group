# Package quality proof (live inspection) — 2026-10-05

## Method

Opened real matrix `publicUrl`s from prod DB (not guessed slugs). Inspected HTML + public JSON API + browser screenshots.

## Live URLs checked

| Package | Industry | URL | HTTP |
|---|---|---|---|
| landing | fitness | https://omnigrouptech.com/sites/system-admin-faa60f73 | 200 |
| landing | legal | https://omnigrouptech.com/sites/system-admin-0fab7464 | 200 |
| website-business | fitness | https://omnigrouptech.com/sites/system-admin-c2d1f7a4 | 200 |
| website-business | legal | https://omnigrouptech.com/sites/system-admin-fa78a46c | 200 |
| website-ecommerce | fitness | https://omnigrouptech.com/sites/system-admin-8fba053b | 200 |
| website-ecommerce | hospitality | https://omnigrouptech.com/sites/system-admin-93af439a | 200 |

API proof (ecommerce fitness catalog exists):
`GET https://omnigrouptech.com/api/public/sites/system-admin-8fba053b`
→ `siteType=ecommerce`, `catalog.length=8` (FIT-1000…FIT-1007, €49–€790)

## Verdict (honest)

### What is proven REAL

1. Sites are published and return **HTTP 200** with multi-KB HTML.
2. Industry token is injected (`fitness`, `Services (Pravo)`, `hospitality`).
3. Business sites have **10 page tabs** in nav.
4. Ecommerce **catalog JSON exists** (8 demo products).

### What is NOT quality that justifies list price

1. **Copy is thin template** — same sentence with one industry word swapped:
   - Fitness: “delivers premium **fitness** services with transparent pricing…”
   - Legal: “delivers premium **Services (Pravo)** services…” (broken English)
2. **Title is package name + “System Admin”**, not a client brand site.
3. **Wrapped inside Omni Group marketing chrome** (platform nav + SaaS footer) — looks like a preview inside Omni, not a standalone agency deliverable.
4. **Ecommerce shop was NOT visible in UI** even though catalog exists in API:
   - `pages` had no `shop` page
   - UI only rendered catalog when `kind/slug === shop`
   - Buyer could not see products / cart without that tab
5. Secondary pages are one-liner stubs: “Services tailored for System Admin in fitness…”

### Price vs observed quality (list)

| Package | List price | Observed deliverable quality |
|---|---:|---|
| Landing + copy | €1,290 | Live URL + ~2 short paragraphs + tabs. **Not agency-grade.** |
| Business website | €2,990 | Live multi-tab shell, thin repeated copy. **Not agency-grade.** |
| E-commerce demo | €4,900 | Catalog in JSON, **shop UI broken** at inspection time. Demo products are Omni-ish “Starter package — fitness”, not a real storefront story. |

## Fixes started after proof

- `ClientSiteView`: inject **Shop** nav + render catalog when `siteType=ecommerce` and catalog present.
- Content generator: always add `shop` page for `website-ecommerce`.

Screenshots saved under Cursor screenshots: `proof-landing-fitness-full.png`, `proof-ecom-fitness-services.png`.
HTML dumps: `docs/evidence/proof-sites-20261005/`.

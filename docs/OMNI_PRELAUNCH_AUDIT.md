# OMNI pre-launch audit

**Generated:** 2026-09-22  
**Scope:** Repository map, P0–P3 findings, safe fixes applied in this pass.  
**Kompletan status repoa:** [`REPO-STATUS-COMPLETE.md`](REPO-STATUS-COMPLETE.md)  
**Explicit non-goal:** No bulk rewrite of 900+ `/solutions/*` pages — only inventory + targeted UX/legal/pricing fixes.

---

## Architecture map (summary)

| Layer | Path | Role |
|-------|------|------|
| Marketing + BFF | `apps/omnigroup-web` | Next.js 14, `/api/atina/*` proxies, `/api/contact` |
| SaaS API | `atina-platform/atina` | Billing, payments, CRM, fulfillment, public-site |
| Nest / Python | `atina-system`, `src/` | PDF, workers, Forge |
| Ops | `scripts/`, `docs/evidence/` | Prod gates, matrix verify, deploy |

**Canonical runtime for checkout & quotes:** Atina `GET/POST /api/v1/billing/*` and `payments/*`.  
**Mirrored TS libs (must stay in sync):** `apps/omnigroup-web/src/lib/*` ↔ `atina-platform/atina/src/modules/billing/lib/*`.

Full explorer notes: see conversation map + `SYSTEM-MAP.md`.

---

## Package / pricing — source of truth

| Concern | Authoritative | Marketing consumption |
|---------|---------------|------------------------|
| SKUs, anchors | `deliverable-catalog.ts` (both mirrors) | `client-offers.ts`, `OfferCard`, `/pricing`, `/products` |
| Checkout gates | `package-delivery-spec.ts` + `factory-phase*` | `canCheckoutPackage`, `getPackageAvailability` |
| Live quote | Atina `dynamic-pricing.engine.ts` | Web `dynamic-pricing.ts` + BFF `/api/atina/billing/quote` |
| Industry × package matrix | Atina + BFF `package-matrix` | `useIndustryPackageMatrix`, `/pricing` |
| 50 industry **groups** | `category-pricing.ts` (`INDUSTRY_CATEGORIES`) | Selects, matrix |
| 900+ **verticals** | `industry-seed.ts` → `industry-catalog.ts` | `/solutions/[slug]`, `generated-verticals-index.json` fallback |

**Not a single DB “Package” entity** — today’s model is **typed catalogs + delivery spec + factory phase**. Prompt §2 “one central Package model” is a **P2 architecture goal**, not current schema.

**Package availability (today):** `PackageAvailability` in `package-delivery-spec.ts` (badge: available / upcoming / disabled). `OfferCard` uses `checkoutAllowed` → **Buy now** vs **Notify me when ready**. No separate `COMING_SOON` enum in DB — behavior is equivalent.

---

## Industry catalog — inventory (no mass delete)

| Metric | Value | Source |
|--------|-------|--------|
| Industry groups | **50** | `INDUSTRY_CATEGORIES` |
| Vertical index rows | **907** | `generated-verticals-index.json` `count` |
| Online landing pages | **907** (all `hasPage: true` in index) | same file |
| Routing | `/solutions`, `/solutions/[slug]` | `public-site-api` + index fallback |

**Near-duplicate display names** (same base name, different category/slug — review before merge):

- `market research` (3), `financial planning`, `payroll`, `bookkeeping`, `coaching`, `accounting`, `recruitment`, `content marketing`, `translation`, `project management`, `employment law`, `contract review`, `executive search`, `industrial design`, `hospice` (each ×2)

**Template SEO risk:** Many verticals share the same `valueProp` sentence pattern in the JSON — **P2** (differentiate high-value niches first; consider `noindex` for thin pages only after manual review).

**Safe normalization policy:** Do not auto-delete; consolidate only with redirect map + CRM/analytics check.

---

## Fixed (this pass)

| Item | Change |
|------|--------|
| Homepage stats | Real **50** groups + **907** vertical pages via `getPublicCatalogStats()`; clarified vs vague “50+” |
| Homepage hero | Links to `/solutions`; delivery engine line de-emphasizes raw Atina/Astra/Titan branding |
| Contact form UX | Removed `Suspense` + `useSearchParams` stall (“Loading form…”); query params from server `searchParams` |
| Outbound env (prior) | `OUTREACH_SEND_ENABLED` no longer overwritten by M6 factory profile when `outreachSendEnabled: true` in deploy config |
| Audit script | Outbound send PASS when warmup + intentional go-live |
| Catalog mirror gate | `scripts/verify-billing-catalog-mirror.ps1` |
| Pricing drift (P1) | Synced **9 stale anchors** in web `deliverable-catalog.ts` to match Atina (e.g. setup-quick 429→449) |

---

## Remaining — P0 (blockers)

| ID | Issue | Owner / action |
|----|-------|----------------|
| P0-LEGAL | `companyLegalName` / tax / address empty in deploy — Impressum incomplete for DE/EU trade | Fill `deploy.config.json` + redeploy web env |
| P0-LEGAL-07 | Formal counsel sign-off on Terms/Privacy/Refund | Legal review (already TI in prod audit) |
| P0-STRIPE | `PAYMENTS_MODE=live` in env but **Stripe test keys** in config — live card charges not real | Swap to live keys + webhook proof, or set mode `test` until ready |
| P0-INVOICE-PDF | No mystery-shopper invoice PDF in inbox (7d) | Run billing E2E / manual checkout once |

---

## Remaining — P1 (critical)

| ID | Issue | Notes |
|----|-------|-------|
| P1-CATALOG-MIRROR | Dual TS mirrors for billing libs | Run `verify-billing-catalog-mirror.ps1` in CI; long-term: single package or codegen sync |
| P1-VERTICAL-CONTENT | 907 pages — heavy template duplication | Phased content upgrade; prioritize categories with traffic/sales |
| P1-VERTICAL-DUP-NAMES | 15+ duplicate base names | Manual taxonomy review spreadsheet |
| P1-TERMS | “Package” vs “Product” vs “Service” mixed in UI | Glossary in copy guide; align `/services` + `/products` headers |
| P1-CONTACT-FIELDS | Prompt asks industry/budget/timeline/consent fields | Current: name, email, company, message + query context — extend form + API validation |
| P1-ORDER-STATES | Full lifecycle enum in prompt vs Atina implementation | Map existing order/payment states; document in client portal |

---

## Remaining — P2 (important)

- Central **Package** DB model / admin CRUD (prompt §2, §28) — today admin changes prices in code + deploy.
- SEO: duplicate titles/descriptions on vertical landings — audit sample + fix top 50.
- Cookie/analytics alignment audit vs actual scripts.
- Mobile QA pass on checkout (manual).
- IDOR regression tests on orders/invoices (extend existing Atina tests).

---

## Remaining — P3 (polish)

- Component deduplication across marketing/platform.
- Dashboard placeholder metrics (`platform-metrics.ts`).
- Platform search “coming soon”.

---

## Security (checked / known)

- BFF admin gate + session cookies; Atina JWT.
- Contact rate limit in `middleware.ts`.
- **Verify:** IDOR on `/api/v1/*` resource IDs (recommended test suite extension).
- Secrets in `deploy-secrets.local` — never commit.

---

## SEO (checked)

- Marketing metadata helpers: `site-metadata.ts`, per-route `metadata` on legal/solutions.
- Sitemap: `sitemap.ts` — confirm vertical count vs index after deploy.
- **Do not** mass-index thin verticals without content pass.

---

## Testing

| Command | Purpose |
|---------|---------|
| `.\scripts\verify-billing-catalog-mirror.ps1` | Price mirror |
| `.\scripts\verify-industry-package-matrix-prod.ps1` | 50×20 prod catalog |
| `.\scripts\audit-prod-autonomous.ps1` | Prod smoke checklist |
| `cd atina-platform/atina && npm run test:unit` | Billing/industry unit tests |
| `cd apps/omnigroup-web && npm run build` | Web build |

**This pass:** catalog mirror script added; web build recommended before deploy.

---

## Manual QA required (owner)

1. **Legal:** Impressum + company block on invoices with real entity data.
2. **Checkout:** One full manual deliverable purchase (manual + Stripe when live).
3. **Contact:** Submit from `/contact?service=setup-quick&category=admin_support` — confirm Resend + Slack.
4. **Mobile:** `/pricing` industry select + Buy now on one AVAILABLE package.
5. **Solutions:** Open 3 random `/solutions/*` — copy quality acceptable for sales?
6. **Instantly:** First outbound batch after `sendEnabled=true` — monitor bounces.

---

## How to use the master email prompt safely

1. Run this doc + `verify-billing-catalog-mirror.ps1` + `audit-prod-autonomous.ps1`.
2. Feed Cursor **only a slice** (e.g. “P1 contact form fields” or “vertical dup names CSV”) — not “rewrite all solutions”.
3. Require **inventory first** for any catalog/industry change >10 rows.
4. No schema changes without migration + rollback note in PR.

---

## Change log (files touched 2026-09-22 prelaunch)

- `apps/omnigroup-web/src/lib/public-catalog-stats.ts` (new)
- `apps/omnigroup-web/src/app/(marketing)/HomePageClient.tsx` (new)
- `apps/omnigroup-web/src/app/(marketing)/page.tsx`
- `apps/omnigroup-web/src/app/(marketing)/contact/page.tsx`, `ContactForm.tsx`
- `scripts/verify-billing-catalog-mirror.ps1` (new)
- `scripts/deploy-config-env.ps1`, `scripts/prod-factory-phase.ps1` (outreach sync)
- `scripts/audit-prod-autonomous.ps1`
- `docs/OMNI_PRELAUNCH_AUDIT.md` (this file)

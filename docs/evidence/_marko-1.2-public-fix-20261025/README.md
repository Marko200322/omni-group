# Marko email (untitled, 06:44) — public copy + catalog compare

**Verdict:** `MARKO_1_2_PUBLIC_COPY_PASS`  
**Probe:** `http://164.68.127.15:3010` + API `:3000` after soft deploy  
**Script:** `apps/omnigroup-web/scripts/audit-public-23-crosspage.mjs` (exit 0)

## Email items

| # | Ask | Result |
|---|-----|--------|
| 1 | Remove `�` / broken “consulting document pack” | **FIXED** — live `/pricing` FFFD=0; string is `PDF report (6+ sections) + markdown`. Residual š/č corruption in web `package-delivery-spec` (em-dash stand-ins) synced/repaired from Atina. |
| 2 | Two promos 15% vs 18% | **CLARIFIED** (not merged). SaaS founding ~15% = subscriptions, first lock months, founding slots. Package intro ~18% = first 50 package clients at checkout; cards stay list. FAQ + banners say they do not stack. |
| 3 | Status honesty | **KEPT** — no Stripe/email auto-green. |
| 23 SKUs | Auto-compare `/products` `/pricing` `/services` | **pricing ↔ services MATCH** for all 23 names + € prices. `/products` has **no cards until an industry is selected** (client filter) — not a second price book. |
| 50 industries | Each loads 23 capabilities | **50/50 PASS** via billing `package-matrix` (same BFF the industry picker uses). |
| Prices/names | Change only if mismatch | **No catalog price/name/delivery edits.** |

## Not in this pass

Checkout purchase, OMI chat, logged-in portal — as Marko reserved for the next round.

## Artifacts

- `crosspage-23-and-industries.json`
- `VERDICT.json`

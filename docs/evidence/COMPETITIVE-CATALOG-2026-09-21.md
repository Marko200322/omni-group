# Competitive catalog alignment — 2026-09-21

## Market scan (EU SMB productized agencies)

| Offer type | EU benchmark (2026) | Our M4 anchor (no industry) |
|------------|---------------------|-------------------------------|
| Quick setup / portal | €500–€600 (Wyn, Stavaks) | **€419** setup-quick |
| Landing | €800–€1,600 | **€729** landing |
| Business site | €1,200–€2,200 | **€1,690** website-business |
| Priority support | €100–€450/mo | **€289/mo** support-priority |
| CRM / automation project | €5k–€15k agencies | custom-software **premium band** |

## Policy

- **No global anchor cut** — `ANCHOR_MULTIPLIER` default **1.0**.
- **Per-industry quote** via `competitive-catalog-pricing.ts` (50 categories: freelance + legacy SMB).
- Budget tiers (salons, hospitality, customer_service, …) get **~12–18% lower** checkout vs anchor on hero SKUs.
- Regulated (healthcare, government, energy) **~8–12% above** standard on same SKU.
- **More in package** at M4: industry benchmark PDF (setup-quick), competitor landing checklist (landing).

## Code

- Web + API: `competitive-catalog-pricing.ts`, wired in `dynamic-pricing` / `dynamic-pricing.engine.ts`.
- Fixed-phase M4 pricing now **respects industry** when category is selected on `/pricing`, `/products`, dashboard.

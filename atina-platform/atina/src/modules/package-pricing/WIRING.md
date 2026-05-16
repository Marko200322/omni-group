# Package Pricing (`package-pricing`) — wiring gate

Use this when adding or reviewing integration for the ecosystem module.

## Backend

- [ ] `PackagePricingModule` registered in `CoreEngine.registerModules()` after import.
- [ ] Module row present in `001_seed_data.ts` `seedModules()` (name, slug `package-pricing`, description, `required_plan` if applicable).
- [ ] Optional: include `package-pricing` in plan `limits.modules` for Pro (or Enterprise) in `seedPlans()` if the feature should be plan-gated in seed data.
- [ ] Phase guard: `phase-activation.middleware.ts` `MODULE_MIN_PHASE['package-pricing']` set to the desired minimum phase (or omit key to disable POST gating for this slug).

## HTTP

- [ ] Routes mounted at `/api/v1/package-pricing` via `mountRoutes()` (automatic from registry).
- [ ] `GET /api/v1/package-pricing` — list workspaces (auth).
- [ ] `POST /api/v1/package-pricing` — create workspace (auth, body: `name`, optional `budgetAllocated`, `basePrice`).
- [ ] `POST /api/v1/package-pricing/:id/run` — run with `mode`: `list-tiers` | `adjust-price` | `bundle` (auth + rate limit).

## Data

- [ ] Rows use `ecosystem_systems.system_slug = 'package-pricing'`.
- [ ] Runs stored in `ecosystem_runs` with `run_type` like `package-pricing_list-tiers`, etc.

## Verification

- [ ] `npm run lint`
- [ ] `npm test -- --testPathPattern=package-pricing`

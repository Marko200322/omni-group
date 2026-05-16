# Digital Signature (`digital-signature`) — wiring gate

Ecosystem module slug: `digital-signature`. Run modes (stub): `request` | `remind` | `verify`.

## Backend

- [ ] `DigitalSignatureModule` registered on `moduleRegistry` in the app bootstrap (same pattern as other ecosystem modules).
- [ ] Module row in `001_seed_data.ts` `seedModules()` (`slug: digital-signature`, `required_plan: pro` where applicable).
- [ ] Pro plan `limits.modules` includes `digital-signature` if plan-gating uses that list.
- [ ] Phase guard: `MODULE_MIN_PHASE['digital-signature']` in `phase-activation.middleware.ts` (default `v1`).

## HTTP

- [ ] Routes mounted at `/api/v1/digital-signature` via `moduleRegistry.mountRoutes()`.
- [ ] `GET /api/v1/digital-signature` — list workspaces (`ecosystem_systems` for current user, `system_slug = digital-signature`).
- [ ] `POST /api/v1/digital-signature` — create workspace (body: `name`, optional `budgetAllocated`).
- [ ] `POST /api/v1/digital-signature/:id/run` — stub run (body: `mode`: `request` | `remind` | `verify`, optional `input` object). Rate-limited.

## Data

- [ ] Rows use `ecosystem_systems.system_slug = 'digital-signature'`.
- [ ] Runs in `ecosystem_runs` with `run_type` = `digital_signature_<mode>` (e.g. `digital_signature_verify`).

## Verification

- [ ] `npm run lint`
- [ ] `npm test -- --testPathPattern=digital-signature`

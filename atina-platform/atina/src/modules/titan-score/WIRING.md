# Titan Score (`titan-score`) — wiring gate

Use this when integrating the ecosystem module (`slug: titan-score`).

## Phase gate

- [ ] `MODULE_MIN_PHASE['titan-score']` = **`v3`** in `phase-activation.middleware.ts` (already present).

## Backend (core)

- [ ] `TitanScoreModule` imported and registered in `CoreEngine.registerModules()`.
- [ ] Seed row for `modules` table in `001_seed_data.ts` (name, slug `titan-score`, description, `required_plan` if applicable).

## HTTP

- [ ] Routes mounted at `/api/v1/titan-score` via `mountRoutes()` (automatic from registry).
- [ ] `GET /api/v1/titan-score/status` — modes, score range 0–100, weight profiles (auth).
- [ ] `GET /api/v1/titan-score` — list workspaces (auth).
- [ ] `POST /api/v1/titan-score` — create workspace (body: `name`, optional `budgetAllocated`, `weightProfile`).
- [ ] `POST /api/v1/titan-score/:id/run` — run with `mode`: `snapshot` | `trend` | `compare` (auth + rate limit).

## Data

- [ ] Rows use `ecosystem_systems.system_slug = 'titan-score'`.
- [ ] Runs stored in `ecosystem_runs` with `run_type` like `titan-score_snapshot`, `titan-score_trend`, `titan-score_compare`.

## Run modes

| Mode       | Body shape |
| ---------- | ---------- |
| `snapshot` | Optional `payload` object; single deterministic score 0–100. |
| `trend`    | `points`: `{ key, value }[]` (1–100); per-point and summary scores. |
| `compare`  | `left` and `right` objects; scores, delta, `winner`. |

## Verification

- [ ] `npm run lint`
- [ ] `npm test -- --testPathPattern=titan-score`

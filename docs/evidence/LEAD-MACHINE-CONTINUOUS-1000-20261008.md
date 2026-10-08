# Lead machine continuous (1000-catalog) — 2026-10-08

## Goal
After raising the catalog to **1000** industry packages, the lead machine must:
1. Use **catalog problems** (5–10) for ICP keywords — not blind dumps
2. Run **without stalling** when funded (budget + Apollo/Hunter)
3. Be **tunable** via `deploy.config.json`

## What shipped

| Piece | Behavior |
|-------|----------|
| `lead-machine-continuous.ts` | Industry rotation, problem-aware ICP plan, fail-soft cursor |
| `lead-machine-scheduler.service.ts` | Interval ticks; persists `data/lead-machine-state.json` |
| Provider retry | Apollo/Hunter: 1 retry then next provider — never freeze queue |
| Kickoff analysis | Injects `problemsSolved` from `lead-gen-retainer__{industry}` |
| Admin API | `GET /api/v1/client-hunter/lead-machine/status`, `POST .../tick` |

## Tuning (deploy.config.json)

```json
"leadDatabaseEnabled": true,
"leadDatabaseRolloutPhase": "F5",
"leadLiveHarvestOnKickoff": true,
"leadMachineContinuous": true,
"leadMachineAutoWhenFunded": true,
"leadMachineIndustriesPerTick": "2",
"leadMachineDailyIndustryCap": "40",
"leadMachineIntervalMs": "900000"
```

- **Continuous OR autoWhenFunded + monthlyBudgetEur > 0** → machine runnable
- Daily cap prevents runaway Apollo spend; cursor advances even when hot=0
- Analysis → hot filter still applies; **0 hot leads is honest**

## Honesty
- No invented leads
- Stall reasons are explicit on status (`LEAD_DATABASE_ENABLED=false`, phase, missing keys, daily cap)
- Stripe LIVE unrelated

## Tests
`npx jest --runInBand src/tests/unit/lead-machine-continuous.test.ts src/tests/unit/lead-gen-analysis-hunt.test.ts`

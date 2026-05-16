# Nivo 3 — usklađenost sa CEO sekcijom G (Atina SaaS)



**Agent:** N3-B2 · **Samo ovaj fajl** u `atina-platform/atina/docs/operations/`.

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](../../../../docs/EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](../../../../docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../../../../scripts/README.md) — **Kad podigneš novi broj**.

## Zadatak



1. Poveži svaku stavku iz [`CHECKLIST-CEO-SISTEM.md`](../../../../CHECKLIST-CEO-SISTEM.md) **CEO sekcije G** sa postojećim fajlovima u `docs/operations/` (npr. `deploy-rollback-checklist.md`, `production-config-matrix.md`).

2. Gde dok ne postoji — predloži **naslov** novog poddokumenta (bez širenja van `docs/operations/` u ovom PR-u osim ovog fajla).



## Inventar `docs/operations/`



| Fajl | Kratak kontekst |

|------|-----------------|

| [`db-backup-restore-runbook.md`](./db-backup-restore-runbook.md) | Snapshot / restore pre migracija i prozora održavanja |

| [`db-rollback-drill-runbook.md`](./db-rollback-drill-runbook.md) | Vežba rollback šeme i `schema_migrations` |

| [`deploy-rollback-checklist.md`](./deploy-rollback-checklist.md) | Staging/prod deploy redosled, build gate, migracije, smoke URL-ovi, rollback |

| [`digital-signature-wiring-checklist.md`](./digital-signature-wiring-checklist.md) | Digitalni potpis (van direktnog G gate-a) |

| [`monitoring-alert-channel-policy.md`](./monitoring-alert-channel-policy.md) | Admin overview / execution-stats / alert rute |

| [`NIVO-1-GATE.md`](./NIVO-1-GATE.md) | N1: `test:ci`, `smoke:all`; put ka [`deploy-rollback-checklist.md`](./deploy-rollback-checklist.md) i **CEO sekciji G** u [`CHECKLIST-CEO-SISTEM.md`](../../../../CHECKLIST-CEO-SISTEM.md) |

| [`NIVO-1-SMOKE-EVIDENCE.template.md`](./NIVO-1-SMOKE-EVIDENCE.template.md) | Šablon evidencije dima |

| [`NIVO-2-E2E.md`](./NIVO-2-E2E.md) | N2 integracioni tok, migracije lokalno, napomene za staging |

| [`NIVO-3-G-ALIGNMENT.md`](./NIVO-3-G-ALIGNMENT.md) | Ova matrica (G ↔ operations) |

| [`production-config-matrix.md`](./production-config-matrix.md) | Prod `.env` / tajne / SMTP / plaćanja / DB_SSL |

| [`release-gate-checklist.md`](./release-gate-checklist.md) | Formalni release gate-ovi, vlasnici, rollback u GO odluci |

| [`release-signoff-template.md`](./release-signoff-template.md) | Sign-off metapodaci, uključujući rollback vlasnika |



## Matrica



**CEO sekcija G** (redosled kao u [`CHECKLIST-CEO-SISTEM.md`](../../../../CHECKLIST-CEO-SISTEM.md)):



| CEO sekcija G | Postojeći doc u `operations/` | Gap |

|-------|------------------------------|-----|

| `npm run build` u produkciji | [`deploy-rollback-checklist.md`](./deploy-rollback-checklist.md) (build gate / predeploy tabela) | — |

| `npm run test:ci` u CI — N1 job `atina-saas`, F.4 | [`NIVO-1-GATE.md`](./NIVO-1-GATE.md) (`npm run test:ci`); [`release-gate-checklist.md`](./release-gate-checklist.md) (unit/lint evidencija u gate registru); **F.4** timski runbook [`NIVO-1-F4-TIM-CHECKLIST.md`](../../../../docs/NIVO-1-F4-TIM-CHECKLIST.md) (pet jobova **CI (monorepo)** na `main` — job **`python`** (required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](../../../../docs/GIT-BRANCH-PROTECTION.md)): **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../../../scripts/README.md), zatim `pytest` — **ili** lokalni [`verify-monorepo.ps1`](../../../../scripts/verify-monorepo.ps1) (**Port mismatch** Nest/pg — [`scripts/README.md`](../../../../scripts/README.md)) · [`smoke-stack.ps1`](../../../../scripts/smoke-stack.ps1) (HTTP, opciono; Atina Node stub = **GET** `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](./release-gate-checklist.md) *Local notes — Smoke tests*); u istom workflow-u i **`omnigroup-web`**). **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../../../../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `docs/D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../../../../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14). Konfiguracija joba: repo `.github/workflows/`, nije u `operations/`. | — |

| Migracije pregledane na stagingu | [`deploy-rollback-checklist.md`](./deploy-rollback-checklist.md) (staging deploy: migracije jednom); uz to [`db-backup-restore-runbook.md`](./db-backup-restore-runbook.md) za snapshot pre prozora; [`NIVO-2-E2E.md`](./NIVO-2-E2E.md) za integracioni kontekst nakon `migrate` | — |

| `.env` produkcija (bez default tajni, `NODE_ENV=production`, `DB_SSL` …) | [`production-config-matrix.md`](./production-config-matrix.md) | — |

| Stripe / PayPal / Wise **live** + webhook secreti | [`production-config-matrix.md`](./production-config-matrix.md) (sekcija plaćanja i webhook promenljive) | — |

| SMTP proveren ako je email obavezan | [`production-config-matrix.md`](./production-config-matrix.md) (sekcija SMTP / `SMTP_ENABLED`) | — |

| Smoke: `/health`, auth, `forge/status`, workflow execution-stats, forge-admin (`npm run smoke:all`) | [`deploy-rollback-checklist.md`](./deploy-rollback-checklist.md) (lista endpointa i staging smoke); [`NIVO-1-GATE.md`](./NIVO-1-GATE.md); [`NIVO-1-SMOKE-EVIDENCE.template.md`](./NIVO-1-SMOKE-EVIDENCE.template.md) | — |

| Admin monitoring: `GET /api/v1/admin/overview`, execution-stats | [`monitoring-alert-channel-policy.md`](./monitoring-alert-channel-policy.md) | — |

| Vlasnik rollback-a i uslovi za rollback definisani | [`deploy-rollback-checklist.md`](./deploy-rollback-checklist.md) (staging/prod: rollback owner, okidači); [`release-gate-checklist.md`](./release-gate-checklist.md); [`release-signoff-template.md`](./release-signoff-template.md) | — |



**Gap (novi poddokumenti):** za trenutnih devet stavki **CEO sekcije G** nije potreban novi fajl u `docs/operations/` — sve ima primarni ili sekundarni mapirani postojeći doc. Ostali fajlovi iz inventara (`digital-signature-wiring-checklist.md`, `db-rollback-drill-runbook.md`) nisu direktno redovi **CEO sekcije G** u matrici, ali podržavaju DB disciplinu.



## Reference

- [`NIVO-2-STAGING-WEBHOOKS.md`](../../../../docs/NIVO-2-STAGING-WEBHOOKS.md) (root `docs/`)
- [`NIVO-1-F4-TIM-CHECKLIST.md`](../../../../docs/NIVO-1-F4-TIM-CHECKLIST.md) — **F.4** (pun monorepo gate, GitHub **ili** lokalno)



# Nivo 3 — Supply Core PDF vs Nest modul



**Agent:** N3-B4 · **Samo ovaj fajl** u `atina-system/docs/`.

**Evidencija / šabloni (indeks + dry-run):** [`../../docs/EVIDENCE-INDEX.md`](../../docs/EVIDENCE-INDEX.md) · [`../../docs/NIVO-1-DRYRUN-LOG.md`](../../docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`../../scripts/README.md`](../../scripts/README.md) — **Kad podigneš novi broj**.

## PDF



- `sve/Titan_Supply_Core_PRO (1).pdf` (inventar: `docs/NIVO-3-SVE-INVENTORY.md`, stavka #12)



## Sažetak tema (po PDF planu, bez citata)



Kod u `supply-core` eksplicitno vezuje implementaciju za **TSC (Titan Supply Core) — Supply Agent** i opis iz PDF-a u **sekcijama 1–30** (isti konceptualni opis u specifikaciji i u kodu). Na visokom nivou PDF pokriva: ulogu **Supply Agent**-a, **Vault** kao registar resursa, **heartbeat** telemetriju (broj resursa, faza, rezervisano za radnike), **periodičnu proveru dostupnosti** / tick, **HTTP integracije** za status i ručni unos resursa, i **uklapanje u Nest** (modul, DI, perzistencija). Deo PRO tematike van ovog foldera (npr. pun worker orchestration, auth na ruti) u trenutnom repou nije u `supply-core/**`.



## Zadatak



1. Mapiraj poglavlja/plan iz PDF-a (sažetak po sekcijama **bez** citiranja celog PDF-a) na `src/modules/supply-core/**`.

2. Status: aligned / partial / N/A + lista fajlova u Nest repou kao dokaz.



## Tabela



| Tema (iz PDF sažetka) | Kod (`atina-system`) | Status |

|------------------------|------------------------|--------|

| TSC Supply Agent — uloga, servis agenta | `src/modules/supply-core/supply-agent.service.ts` | aligned |

| Periodični tick / Cron (provera stanja, heartbeat upis) | `src/modules/supply-core/supply-agent.service.ts` | aligned |

| Vault — evidencija resursa (broj, CRUD u servisu) | `src/modules/supply-core/supply-agent.service.ts` | aligned |

| Heartbeat model (resourceCount, pendingWorkers, phase) | `src/modules/supply-core/supply-agent.service.ts` | partial |

| HTTP — status vault-a i nedavni heartbeat-i (`GET …/vault/status`) | `src/modules/supply-core/supply-core.controller.ts`, `supply-agent.service.ts` | aligned |

| HTTP — ručni unos resursa / integracija (`POST …/vault/resource`) | `src/modules/supply-core/supply-core.controller.ts`, `supply-agent.service.ts` | aligned |

| Nest modul — controller, servis, TypeORM feature import | `src/modules/supply-core/supply-core.module.ts` | aligned |

| Integracija sa sistemskom fazom (PhaseService u tick-u) | `src/modules/supply-core/supply-agent.service.ts` | partial |

| Worker queue / pending workers / dodela posla (PRO širina) | `src/modules/supply-core/supply-agent.service.ts` (polje `pendingWorkers` fiksno 0) | partial |

| Entiteti Vault / Heartbeat (šema van modula; modul ih registruje) | `src/database/entities/vault-resource.entity.ts`, `src/database/entities/supply-agent-heartbeat.entity.ts` (korišćenje kroz `supply-core.module.ts`) | partial |

| API bezbednost (guard, tenant, rate limit) na `supply` rutama | — (nema u `supply-core/**`) | N/A |

| Napredni secrets engine / šifrovanje payload-a (puno PRO opisa) | `src/modules/supply-core/supply-agent.service.ts` (JSON u `payloadJson`) | partial |



**Legenda statusa:** **aligned** — ponašanje iz PDF teme jasno pokriveno u navedenim fajlovima; **partial** — samo deo teme ili pojednostavljen placeholder; **N/A** — nije implementirano u ovom modulu / folderu.

## Reference (pun monorepo)

Posle izmena koje diraju i Nest i ostatak repoa: iz korena [`verify-monorepo.ps1`](../../scripts/verify-monorepo.ps1) (isti red kao **CI (monorepo)** na GitHubu — job **`python`**: **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](../../docs/GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../scripts/README.md) + pytest + Atina `test:ci` + **`apps/omnigroup-web`** build + Nest `verify:ci` + tri `docker compose config`; opciono **`-SkipOmnigroupWeb`** / **`-SkipNestVerifyCi`** / **`-SkipCompose`** / **`-SkipDocAudit`**) · [`smoke-stack.ps1`](../../scripts/smoke-stack.ps1) (HTTP, opciono — Atina Node **GET /health**; **`npm run smoke:all`:** [`release-gate-checklist.md`](../../atina-platform/atina/docs/operations/release-gate-checklist.md) *Smoke tests*) · [`scripts/README.md`](../../scripts/README.md) (**Port mismatch** Nest/pg) · **F.4** [`NIVO-1-F4-TIM-CHECKLIST.md`](../../docs/NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `docs/D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).


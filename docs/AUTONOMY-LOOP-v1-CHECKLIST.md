# Autonomy Loop v1 — checklist

**Cilj:** zatvorena petlja bez čoveka — istraži → generiši → deploy → prodaj → uči → reinvestiraj.

**Modul:** `atina-platform/atina/src/modules/autonomy-loop/`  
**API:** `/api/v1/autonomy-loop/*`  
**Migracija:** `015_autonomy_loop.sql`

---

## Komponente

| # | Komponenta | Fajl / ruta | Status |
|---|------------|-------------|--------|
| 1 | **Industry Registry** (500+ vertikala) | `data/industry-seed.ts`, `industry-registry.service.ts` | [x] |
| 2 | **Market Research Agent** | `market-research.service.ts` | [x] |
| 3 | **Module Generator** (TS/React template) | `module-generator.service.ts`, `templates/*` | [x] |
| 4 | **Auto Deploy Pipeline** (Git + CI hook) | `deploy-pipeline.service.ts` | [x] |
| 5 | **Revenue Feedback Loop** | `revenue-feedback.service.ts` | [x] |
| 6 | **Autonomous Orchestrator** | `autonomy-orchestrator.service.ts` | [x] |
| 7 | **Closed Loop** (background tick) | `autonomy-loop.module.ts` scheduler | [x] |
| 8 | **Titan Master → expand** integracija | `titan-master.service.ts` | [x] |
| 9 | **Workflow-chain real execution** | `ecosystem-run.executor.ts` | [x] |
| 10 | **Unit testovi** | `autonomy-loop.*.test.ts` | [x] |

---

## Env (`.env`)

```env
AUTONOMY_ENABLED=true
AUTONOMY_TICK_INTERVAL_MS=300000
AUTONOMY_AUTO_DEPLOY=false
AUTONOMY_GIT_REPO_PATH=
AUTONOMY_GENERATED_DIR=data/generated-verticals
AUTONOMY_MAX_VERTICALS_PER_TICK=3
AUTONOMY_REAL_ECOSYSTEM_RUNS=true
```

---

## API tok (closed loop)

1. `POST /autonomy-loop/verticals/seed` — učitaj 500+ vertikala (admin)
2. `POST /autonomy-loop/tick` — jedan ciklus: research → generate → deploy → feedback → learn
3. `GET /autonomy-loop/status` — scheduler, broj vertikala, poslednji ciklus
4. `POST /autonomy-loop/verticals/:slug/research` — samo istraživanje
5. `POST /autonomy-loop/verticals/:slug/generate` — samo generisanje
6. `POST /autonomy-loop/verticals/:slug/deploy` — samo deploy
7. `POST /autonomy-loop/feedback/sync` — sinhronizuj revenue iz payments

---

## Ručni smoke (posle migrate)

```powershell
cd atina-platform/atina
npm run migrate
npm run test:ci -- --testPathPattern=autonomy-loop
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/autonomy-loop/status
curl -X POST -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/autonomy-loop/verticals/seed
curl -X POST -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/autonomy-loop/tick
```

---

## Faze nakon v1

- [x] Dashboard panel u `omnigroup-web` (`AutonomyLoopPanel`, `/dashboard#autonomy`)
- [x] OpenRouter/Apify direktni fallback (bez gateway 404)
- [x] Scrape seed: DuckDuckGo HTML + Wikipedia (ne Google)
- [x] **Budget guard** (016 migration, daily/tick/reserve USD) + `/autonomy-loop/budget`
- [x] **Telegram / COMMS** obaveštenja posle tick-a (`check-autonomy-env.ps1`)
- [ ] Webhook iz CI kad deploy završi
- [ ] Vector RAG po vertikali (ai-rag ingest auto)
- [ ] Multi-tenant white-label auto-packaging

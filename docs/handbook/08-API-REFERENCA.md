# 08 — API referenca

**Deo priručnika:** [`README.md`](./README.md) · Prethodno: [`07-ALATI-YOUTUBE-NAPLATA.md`](./07-ALATI-YOUTUBE-NAPLATA.md) · Sledeće: [`09-MODEL-PODATAKA.md`](./09-MODEL-PODATAKA.md)

Inventar svih HTTP interfejsa u monorepu, snimljen 2026-11-03 čitanjem koda (ne iz Swagger-a). Kratki indeks ugovora koji postoji od ranije: [`../API-CONTRACTS-INDEX.md`](../API-CONTRACTS-INDEX.md).

**Legenda auth kolone (Express):** `public` = bez middleware-a; `JWT user` = `authenticate` (Bearer JWT ili `X-API-Key`); `admin` = `authenticate` + `requireAdmin`. Globalni `express-rate-limit` važi za sve rute osim `/health`; per-ruta limiteri su navedeni gde postoje.

## A) Atina Express SaaS — `/api/v1/{slug}`

Boot: `atina-platform/atina/src/index.ts` → `CoreEngine` → `ModuleRegistry.mountRoutes`. Nema `src/app.ts` ni `src/routes*`. **Ukupno: 61 modul, 348 modulskih ruta + 3 inženjerske.** Nema Prometheus `/metrics` endpointa (backlog u `infra/observability/README.md`).

### Inženjerske rute

| Metod | Putanja | Auth | Opis |
|---|---|---|---|
| GET | `/` | public | JSON sa linkovima na health/API/web |
| GET | `/health` | public (bez limitera) | Liveness + provera Forge vault-a |
| GET | `/api/v1` | public | Info o API-ju + lista registrovanih modula |

### Svi moduli

| Slug | Naziv | Bazna putanja | Ruta | Auth nivoi |
|---|---|---|---|---|
| `admin` | Admin Panel | `/api/v1/admin` | 22 | admin |
| `ai-memory` | AI Learning & Memory | `/api/v1/ai-memory` | 2 | JWT user |
| `ai-rag` | AI RAG | `/api/v1/ai-rag` | 2 | JWT user |
| `alert-system` | Alert System | `/api/v1/alert-system` | 6 | JWT user, admin |
| `analytics` | Analytics | `/api/v1/analytics` | 4 | JWT user, admin |
| `apex-predator` | Apex Predator | `/api/v1/apex-predator` | 4 | JWT user, admin |
| `api-gateway` | API Gateway | `/api/v1/api-gateway` | 3 | admin |
| `atina-system` | Atina System | `/api/v1/atina-system` | 4 | JWT user |
| `audit-log` | Audit Log | `/api/v1/audit-log` | 2 | admin |
| `auth` | Authentication | `/api/v1/auth` | 9 | JWT user, public |
| `automation` | Automation | `/api/v1/automation` | 6 | JWT user |
| `autonomy-loop` | Autonomy Loop | `/api/v1/autonomy-loop` | 22 | JWT user, admin |
| `backup-recovery` | Backup & Recovery | `/api/v1/backup-recovery` | 3 | admin |
| `billing` | Billing | `/api/v1/billing` | 19 | JWT user, admin, public |
| `client-hunter` | Client Hunter | `/api/v1/client-hunter` | 11 | JWT user |
| `compliance` | Compliance | `/api/v1/compliance` | 2 | admin |
| `contracts` | Contracts | `/api/v1/contracts` | 9 | JWT user |
| `craftor` | Craftor | `/api/v1/craftor` | 4 | JWT user |
| `crm` | CRM | `/api/v1/crm` | 7 | JWT user |
| `cursor-agent` | Cursor Agent | `/api/v1/cursor-agent` | 3 | admin |
| `deal-offer` | Deal Offer | `/api/v1/deal-offer` | 4 | JWT user |
| `digital-signature` | Digital Signature | `/api/v1/digital-signature` | 3 | JWT user |
| `dominus360` | Dominus360 | `/api/v1/dominus360` | 4 | JWT user |
| `follow-up` | Follow-up | `/api/v1/follow-up` | 4 | JWT user |
| `follow-up-automation` | Follow-up Automation | `/api/v1/follow-up-automation` | 4 | JWT user |
| `forge` | Forge | `/api/v1/forge` | 4 | JWT user |
| `gdpr` | GDPR | `/api/v1/gdpr` | 4 | JWT user, admin |
| `integration-hub` | Integration Hub | `/api/v1/integration-hub` | 3 | JWT user |
| `kpi` | KPI Module | `/api/v1/kpi` | 1 | admin |
| `lead-scoring` | Lead Scoring | `/api/v1/lead-scoring` | 4 | JWT user |
| `load-balancer` | Load Balancer | `/api/v1/load-balancer` | 3 | admin |
| `notifications` | Notifications | `/api/v1/notifications` | 5 | JWT user |
| `omnigame` | OmniGame | `/api/v1/omnigame` | 3 | JWT user |
| `omnitube` | OmniTube | `/api/v1/omnitube` | 3 | JWT user |
| `outreach` | Outreach | `/api/v1/outreach` | 4 | JWT user |
| `package-pricing` | Package Pricing | `/api/v1/package-pricing` | 3 | JWT user |
| `payments` | Payments | `/api/v1/payments` | 18 | JWT user, admin, public |
| `phase-launch` | Phase Launch | `/api/v1/phase-launch` | 5 | admin |
| `product-factory` | Product Factory | `/api/v1/product-factory` | 8 | JWT user |
| `proxy-rotation` | Proxy & Rotation | `/api/v1/proxy-rotation` | 4 | JWT user |
| `public-site` | Public Site | `/api/v1/public-site` | 7 | JWT user, public |
| `recommendation` | Recommendation Module | `/api/v1/recommendation` | 1 | JWT user |
| `resource-management` | Resource Management | `/api/v1/resource-management` | 2 | admin |
| `resource-procurement` | Resource Procurement | `/api/v1/resource-procurement` | 8 | admin |
| `scaling` | Scaling | `/api/v1/scaling` | 3 | admin |
| `scraper` | Web Scraper | `/api/v1/scraper` | 5 | JWT user |
| `self-healing` | Self-Healing Supervisor | `/api/v1/self-healing` | 5 | admin |
| `sistem-naplate` | Sistem Naplate Engine | `/api/v1/sistem-naplate` | 3 | JWT user |
| `subscriptions` | Subscriptions | `/api/v1/subscriptions` | 4 | JWT user, admin |
| `system-updater` | System Updater | `/api/v1/system-updater` | 3 | admin |
| `tasks` | Tasks | `/api/v1/tasks` | 6 | JWT user, admin |
| `template-engine` | Template Engine | `/api/v1/template-engine` | 2 | JWT user |
| `titan-master` | Titan Master | `/api/v1/titan-master` | 4 | JWT user, admin |
| `titan-monitor` | Titan Monitor | `/api/v1/titan-monitor` | 1 | admin |
| `titan-score` | Titan Score | `/api/v1/titan-score` | 4 | JWT user |
| `titanis` | Titanis Sales Engine | `/api/v1/titanis` | 3 | JWT user |
| `titanix` | Titanix Execution Engine | `/api/v1/titanix` | 3 | JWT user |
| `users` | User Management | `/api/v1/users` | 10 | JWT user, admin |
| `validator` | Validator | `/api/v1/validator` | 4 | JWT user |
| `video-meetings` | Video Meetings | `/api/v1/video-meetings` | 15 | JWT user, admin, public |
| `workflow-chain` | Workflow Chain | `/api/v1/workflow-chain` | 20 | JWT user |
Na disku bez `*.module.ts` (nisu montirani): `dominus-swarm/`, `marketing-growth/`, `shared/`.

### Detaljne tabele ruta za ključne module

Ispod su rute modula koje koristi sajt, naplata i fulfillment. Za ostale module obrazac je gotovo uvek `GET /status`, `GET /`, `POST /`, `POST /:id/run` (JWT user) uz opcioni `GET /admin/*` (admin).

### `auth` — Authentication

| | |
|---|---|
| Bazna putanja | `/api/v1/auth` |
| Fajl | `atina-platform/atina/src/modules/auth/auth.module.ts` |
| Broj ruta | 9 |

| Metod | Putanja | Auth | Limiter | Opis |
|---|---|---|---|---|
| POST | `/register` | public | authLimiter | register |
| POST | `/login` | public | authLimiter | login |
| POST | `/refresh` | public | authLimiter | refresh token |
| POST | `/logout` | public | authSessionLimiter | logout |
| POST | `/forgot-password` | public | passwordResetLimiter | forgot password |
| POST | `/reset-password` | public | passwordResetLimiter | reset password |
| GET | `/verify-email/:token` | public | authLimiter | verify email |
| GET | `/me` | JWT user | authSessionLimiter | get me |
| POST | `/change-password` | JWT user | authSessionLimiter | change password |

### `users` — User Management

| | |
|---|---|
| Bazna putanja | `/api/v1/users` |
| Fajl | `atina-platform/atina/src/modules/users/users.module.ts` |
| Broj ruta | 10 |

| Metod | Putanja | Auth | Limiter | Opis |
|---|---|---|---|---|
| GET | `/profile` | JWT user | — | get profile |
| PATCH | `/profile` | JWT user | — | update profile |
| GET | `/stats` | JWT user | — | get stats |
| GET | `/api-keys` | JWT user | — | list api keys |
| POST | `/api-keys` | JWT user | — | create api key |
| DELETE | `/api-keys/:id` | JWT user | — | revoke api key |
| GET | `/` | admin | — | list users |
| GET | `/:id` | JWT user | — | get user by id |
| PATCH | `/:id` | admin | — | admin update user |
| DELETE | `/:id` | admin | — | deactivate user |

### `billing` — Billing

| | |
|---|---|
| Bazna putanja | `/api/v1/billing` |
| Fajl | `atina-platform/atina/src/modules/billing/billing.module.ts` |
| Broj ruta | 19 |

| Metod | Putanja | Auth | Limiter | Opis |
|---|---|---|---|---|
| GET | `/deliverables` | public | — | get deliverables |
| GET | `/quotes` | public | — | get quote catalog |
| POST | `/quote` | public | — | post quote |
| GET | `/industry-catalog` | public | — | get industry catalog |
| GET | `/category-pricing` | public | — | get category pricing |
| GET | `/plans` | public | — | get plans |
| GET | `/plans/:slug` | public | — | get plan |
| GET | `/subscription` | JWT user | — | get current subscription |
| GET | `/invoices` | JWT user | — | get invoices |
| GET | `/invoices/:id` | JWT user | — | get invoice |
| GET | `/limit/:key` | JWT user | — | check limit |
| GET | `/revenue-allocation/summary` | admin | — | get revenue allocation summary |
| GET | `/revenue-allocation/:paymentId` | admin | — | get revenue allocation by payment |
| GET | `/fulfillment/jobs/admin` | admin | — | list fulfillment jobs admin |
| GET | `/fulfillment/jobs` | JWT user | — | list fulfillment jobs |
| GET | `/fulfillment/jobs/:paymentId` | JWT user | — | get fulfillment job |
| GET | `/fulfillment/jobs/:paymentId/artifacts/:filename` | JWT user | — | download fulfillment artifact |
| POST | `/fulfillment/jobs/:paymentId/approve` | admin | — | approve fulfillment job |
| POST | `/fulfillment/jobs/:paymentId/reject` | admin | — | reject fulfillment job |

### `payments` — Payments

| | |
|---|---|
| Bazna putanja | `/api/v1/payments` |
| Fajl | `atina-platform/atina/src/modules/payments/payments.module.ts` |
| Broj ruta | 18 |

| Metod | Putanja | Auth | Limiter | Opis |
|---|---|---|---|---|
| POST | `/stripe/checkout` | JWT user | paymentsLimiter, authSessionLimiter | create checkout session |
| POST | `/stripe/webhook` | public | webhookLimiter | stripe webhook |
| POST | `/stripe/cancel` | JWT user | paymentsLimiter, authSessionLimiter | cancel subscription |
| GET | `/stripe/portal` | JWT user | paymentsLimiter, authSessionLimiter | billing portal |
| POST | `/paypal/order` | JWT user | paymentsLimiter, authSessionLimiter | create pay pal order |
| POST | `/paypal/capture/:orderId` | JWT user | paymentsLimiter, authSessionLimiter | capture pay pal order |
| POST | `/wise/transfer` | JWT user | paymentsLimiter, authSessionLimiter | create wise transfer |
| POST | `/wise/confirm/:paymentId` | admin | paymentsLimiter, authSessionLimiter | confirm wise payment |
| GET | `/methods` | public | — | get payment methods |
| POST | `/manual/checkout` | JWT user | paymentsLimiter, authSessionLimiter | create manual checkout |
| POST | `/manual/deliverable-checkout` | JWT user | paymentsLimiter, authSessionLimiter | create deliverable manual checkout |
| POST | `/manual/mark-sent/:paymentId` | JWT user | paymentsLimiter, authSessionLimiter | mark manual payment sent |
| POST | `/manual/confirm/:paymentId` | admin | paymentsLimiter, authSessionLimiter | confirm manual payment |
| POST | `/kriptoman/checkout` | JWT user | paymentsLimiter, authSessionLimiter | create kriptoman checkout |
| POST | `/kriptoman/webhook` | public | webhookLimiter | kriptoman webhook |
| POST | `/kriptoman/sync/:paymentId` | JWT user | paymentsLimiter, authSessionLimiter | sync kriptoman payment |
| POST | `/kriptoman/confirm/:paymentId` | admin | paymentsLimiter, authSessionLimiter | confirm kriptoman payment |
| GET | `/history` | JWT user | paymentsLimiter, authSessionLimiter | get payment history |

### `crm` — CRM

| | |
|---|---|
| Bazna putanja | `/api/v1/crm` |
| Fajl | `atina-platform/atina/src/modules/crm/crm.module.ts` |
| Broj ruta | 7 |

| Metod | Putanja | Auth | Limiter | Opis |
|---|---|---|---|---|
| GET | `/contacts` | JWT user | authSessionLimiter | list contacts |
| POST | `/contacts/bulk` | JWT user | authSessionLimiter | bulk import |
| GET | `/contacts/:id` | JWT user | authSessionLimiter | get contact |
| POST | `/contacts` | JWT user | authSessionLimiter | create contact |
| PATCH | `/contacts/:id` | JWT user | authSessionLimiter | update contact |
| DELETE | `/contacts/:id` | JWT user | authSessionLimiter | delete contact |
| GET | `/stats` | JWT user | authSessionLimiter | stats |

### `client-hunter` — Client Hunter

| | |
|---|---|
| Bazna putanja | `/api/v1/client-hunter` |
| Fajl | `atina-platform/atina/src/modules/client-hunter/client-hunter.module.ts` |
| Broj ruta | 11 |

| Metod | Putanja | Auth | Limiter | Opis |
|---|---|---|---|---|
| GET | `/readiness` | JWT user | — | readiness |
| POST | `/bootstrap` | JWT user | — | bootstrap |
| POST | `/pipeline/run` | JWT user | — | run pipeline |
| POST | `/preview/german-job-email` | JWT user | — | preview german job email |
| GET | `/job-boards` | JWT user | — | job boards |
| GET | `/hot-clients` | JWT user | — | hot clients |
| GET | `/status` | JWT user | — | status |
| GET | `/lead-databases/status` | JWT user | — | lead database status |
| GET | `/` | JWT user | — | list |
| POST | `/` | JWT user | — | create |
| POST | `/:id/run` | JWT user | — | run |

### `autonomy-loop` — Autonomy Loop

| | |
|---|---|
| Bazna putanja | `/api/v1/autonomy-loop` |
| Fajl | `atina-platform/atina/src/modules/autonomy-loop/autonomy-loop.module.ts` |
| Broj ruta | 22 |

| Metod | Putanja | Auth | Limiter | Opis |
|---|---|---|---|---|
| GET | `/status` | JWT user | — | status |
| GET | `/budget` | JWT user | — | budget |
| GET | `/verticals` | JWT user | — | list verticals |
| GET | `/verticals/:slug` | JWT user | — | get vertical |
| GET | `/verticals/:slug/delivery-pack` | JWT user | — | get delivery pack |
| POST | `/verticals/seed` | admin | — | seed verticals |
| POST | `/verticals/:slug/research` | JWT user | — | research |
| POST | `/verticals/:slug/generate` | JWT user | — | generate |
| POST | `/categories/:category/batch` | admin | — | process category batch |
| GET | `/categories/status` | JWT user | — | get categories rollout status |
| POST | `/categories/rollout` | admin | — | process categories rollout |
| POST | `/categories/rollout/async` | admin | — | start categories rollout job |
| GET | `/categories/rollout/job` | JWT user | — | get categories rollout job |
| GET | `/outbound/stats` | JWT user | — | outbound stats |
| POST | `/outbound/process-send` | admin | — | process outbound send |
| POST | `/verticals/:slug/deploy` | JWT user | — | deploy |
| POST | `/feedback/sync` | JWT user | — | sync feedback |
| POST | `/tick` | JWT user | — | tick |
| GET | `/evolution/tasks` | JWT user | — | list evolution tasks |
| POST | `/evolution/tick` | admin | — | run evolution tick |
| POST | `/scheduler/start` | admin | — | start scheduler |
| POST | `/scheduler/stop` | admin | — | stop scheduler |

### `video-meetings` — Video Meetings

| | |
|---|---|
| Bazna putanja | `/api/v1/video-meetings` |
| Fajl | `atina-platform/atina/src/modules/video-meetings/video-meetings.module.ts` |
| Broj ruta | 15 |

| Metod | Putanja | Auth | Limiter | Opis |
|---|---|---|---|---|
| GET | `/avatar/media-stack` | public | — | get avatar media stack |
| GET | `/support/agents` | public | — | get support agents |
| GET | `/support/methods` | public | — | get support methods |
| POST | `/support/book` | JWT user | paymentsLimiter, authSessionLimiter | book support |
| GET | `/support/mine` | JWT user | authSessionLimiter | list my support |
| POST | `/support/confirm/:id` | admin | paymentsLimiter, authSessionLimiter | confirm support |
| POST | `/support/avatar/session` | JWT user | paymentsLimiter, authSessionLimiter | start support avatar session |
| POST | `/support/avatar/chat` | JWT user | paymentsLimiter, authSessionLimiter | chat support avatar |
| GET | `/support/avatar/session/:sessionId/history` | JWT user | authSessionLimiter | history support avatar |
| GET | `/sales/agents` | public | — | get sales agents |
| GET | `/sales/methods` | public | — | get sales methods |
| POST | `/sales/book` | JWT user | paymentsLimiter, authSessionLimiter | book sales |
| POST | `/sales/avatar/session` | JWT user | paymentsLimiter, authSessionLimiter | start sales avatar session |
| POST | `/sales/avatar/chat` | JWT user | paymentsLimiter, authSessionLimiter | chat sales avatar |
| GET | `/sales/avatar/session/:sessionId/history` | JWT user | authSessionLimiter | history sales avatar |

### `public-site` — Public Site

| | |
|---|---|
| Bazna putanja | `/api/v1/public-site` |
| Fajl | `atina-platform/atina/src/modules/public-site/public-site.module.ts` |
| Broj ruta | 7 |

| Metod | Putanja | Auth | Limiter | Opis |
|---|---|---|---|---|
| GET | `/solutions` | public | — | list solutions |
| GET | `/solutions/:slug` | public | — | get solution |
| GET | `/client-sites/mine` | JWT user | — | list my client sites |
| GET | `/client-sites/:slug` | public | — | get client site |
| POST | `/client-sites/:slug/orders` | public | — | place shop order |
| POST | `/client-sites` | JWT user | — | create client site |
| PATCH | `/client-sites/:slug/publish` | JWT user | — | publish client site |

### `product-factory` — Product Factory

| | |
|---|---|
| Bazna putanja | `/api/v1/product-factory` |
| Fajl | `atina-platform/atina/src/modules/product-factory/product-factory.module.ts` |
| Broj ruta | 8 |

| Metod | Putanja | Auth | Limiter | Opis |
|---|---|---|---|---|
| GET | `/stats` | JWT user | authSessionLimiter | stats |
| GET | `/projects` | JWT user | authSessionLimiter | list |
| GET | `/projects/:id` | JWT user | authSessionLimiter | get by id |
| POST | `/projects` | JWT user | authSessionLimiter | create |
| POST | `/projects/:id/build` | JWT user | authSessionLimiter | build |
| POST | `/projects/:id/test` | JWT user | authSessionLimiter | test |
| POST | `/projects/:id/deploy-prep` | JWT user | authSessionLimiter | deploy prep |
| POST | `/internal/tick` | JWT user | authSessionLimiter | internal tick |

### `admin` — Admin Panel

| | |
|---|---|
| Bazna putanja | `/api/v1/admin` |
| Fajl | `atina-platform/atina/src/modules/admin/admin.module.ts` |
| Broj ruta | 22 |

| Metod | Putanja | Auth | Limiter | Opis |
|---|---|---|---|---|
| GET | `/overview` | admin | authSessionLimiter | get overview |
| GET | `/users` | admin | authSessionLimiter | list users |
| POST | `/users/invite` | admin | adminMutationLimiter, authSessionLimiter | invite user |
| PATCH | `/users/:id` | admin | adminMutationLimiter, authSessionLimiter | patch user |
| GET | `/payments` | admin | authSessionLimiter | list payments |
| GET | `/modules` | admin | authSessionLimiter | list modules |
| PATCH | `/modules/:id` | admin | adminMutationLimiter, authSessionLimiter | patch module |
| GET | `/phase-gating` | admin | authSessionLimiter | get phase gating |
| GET | `/phase-gating/timeline` | admin | authSessionLimiter | list phase gating timeline |
| GET | `/workflow/templates/execution-stats` | admin | authSessionLimiter | get workflow template execution stats |
| GET | `/logs` | admin | authSessionLimiter | list logs |
| POST | `/logs` | admin | adminMutationLimiter, authSessionLimiter | create log |
| GET | `/plans` | admin | authSessionLimiter | list plans |
| PATCH | `/plans/:id` | admin | adminMutationLimiter, authSessionLimiter | patch plan |
| GET | `/health` | admin | authSessionLimiter | get health |
| GET | `/onboarding-status` | admin | authSessionLimiter | list onboarding status |
| GET | `/onboarding-status/:userId` | admin | authSessionLimiter | get onboarding user detail |
| POST | `/onboarding-status/:userId/retry` | admin | adminMutationLimiter, authSessionLimiter | retry onboarding user |
| POST | `/onboarding-status/retry-all` | admin | adminMutationLimiter, authSessionLimiter | retry all onboarding |
| GET | `/push/vapid-public-key` | admin | authSessionLimiter | get push vapid public key |
| POST | `/push/subscribe` | admin | adminMutationLimiter, authSessionLimiter | subscribe push |
| DELETE | `/push/subscribe` | admin | adminMutationLimiter, authSessionLimiter | unsubscribe push |

### `workflow-chain` — Workflow Chain

| | |
|---|---|
| Bazna putanja | `/api/v1/workflow-chain` |
| Fajl | `atina-platform/atina/src/modules/workflow-chain/workflow-chain.module.ts` |
| Broj ruta | 20 |

| Metod | Putanja | Auth | Limiter | Opis |
|---|---|---|---|---|
| GET | `/` | JWT user | authSessionLimiter | list |
| GET | `/templates` | JWT user | authSessionLimiter | list templates |
| GET | `/templates/:templateKey` | JWT user | authSessionLimiter | preview template |
| POST | `/templates/bootstrap` | JWT user | authSessionLimiter | bootstrap templates |
| POST | `/templates/:templateKey/create` | JWT user | authSessionLimiter | create from template |
| POST | `/templates/:templateKey/create-and-run` | JWT user | authSessionLimiter | create and run from template |
| GET | `/executions/stats` | JWT user | authSessionLimiter | execution stats |
| GET | `/executions/step-analytics` | JWT user | authSessionLimiter | step analytics |
| GET | `/executions` | JWT user | authSessionLimiter | list executions |
| GET | `/executions/:executionTaskId` | JWT user | authSessionLimiter | get execution |
| POST | `/executions/:executionTaskId/rerun` | JWT user | authSessionLimiter | rerun execution |
| GET | `/:id` | JWT user | authSessionLimiter | get |
| GET | `/:id/validate` | JWT user | authSessionLimiter | validate |
| PATCH | `/:id` | JWT user | authSessionLimiter | update |
| POST | `/:id/pause` | JWT user | authSessionLimiter | pause |
| POST | `/:id/activate` | JWT user | authSessionLimiter | activate |
| POST | `/:id/clone` | JWT user | authSessionLimiter | clone |
| DELETE | `/:id` | JWT user | authSessionLimiter | delete |
| POST | `/` | JWT user | authSessionLimiter | create |
| POST | `/:id/run` | JWT user | authSessionLimiter | run |

### `resource-procurement` — Resource Procurement

| | |
|---|---|
| Bazna putanja | `/api/v1/resource-procurement` |
| Fajl | `atina-platform/atina/src/modules/resource-procurement/resource-procurement.module.ts` |
| Broj ruta | 8 |

| Metod | Putanja | Auth | Limiter | Opis |
|---|---|---|---|---|
| GET | `/catalog` | admin | authSessionLimiter | catalog |
| GET | `/settings` | admin | authSessionLimiter | settings |
| PATCH | `/settings/auto` | admin | adminMutationLimiter, authSessionLimiter | set auto procurement |
| GET | `/orders` | admin | authSessionLimiter | list orders |
| POST | `/orders/checkout` | admin | adminMutationLimiter, authSessionLimiter | checkout |
| POST | `/orders/:id/mark-paid` | admin | adminMutationLimiter, authSessionLimiter | mark paid |
| POST | `/orders/:id/confirm` | admin | adminMutationLimiter, authSessionLimiter | confirm paid |
| POST | `/auto/check` | admin | adminMutationLimiter, authSessionLimiter | run auto check |

### Parametri ponude (`POST /api/v1/billing/quote`, `GET /api/v1/billing/quotes`)

| Polje | Tip | Napomena |
|---|---|---|
| `deliverableId` | string | id iz kataloga (samo `POST /quote`) |
| `tier` | `budget` \| `standard` \| `premium` \| `regulated` \| `nonprofit` | multiplikator 0.75 / 1 / 1.35 / 1.65 / 0.6 |
| `industryCategory` | string | ključ iz `CATEGORY_MARKET_INDEX` |
| `paymentProvider` | `manual` \| `stripe` \| `kriptoman` \| … | naknada se dodaje na cenu |
| `marketIntensity` | 0–100 | utiče na TAM/konkurenciju/intenzitet |
| `marketRegion` | `balkan` \| `eu` \| `dach` \| `global` | **novo u v2**; podrazumevano `eu` |

Isti parametri idu u `POST /api/v1/payments/manual/deliverable-checkout` (server ponovo računa cenu).

## B) NestJS `atina-system`

Bootstrap `atina-system/src/bootstrap/configure-app.ts` (helmet, `ValidationPipe`, CORS). Nema globalnog auth guard-a.

| Metod | Putanja | Guard | Handler / fajl |
|---|---|---|---|
| GET | `/`, `/health` | javno | `app.controller.ts#health` |
| POST | `/internal/queue/smoke` | header `x-internal-queue-smoke-key` (404 u produkciji) | `app.controller.ts#enqueueQueueSmoke` |
| POST | `/ai/chat`, `/ai/session` | javno | `modules/ai/ai.controller.ts` |
| GET | `/dashboard/overview` | javno | `modules/analytics/analytics.controller.ts` |
| POST | `/auth/register`, `/auth/login` | javno | `modules/auth/auth.controller.ts` |
| POST / GET / GET / PATCH | `/invoices`, `/invoices/:id` | javno | `modules/billing/billing.controller.ts` |
| POST / GET / GET / PATCH | `/contracts`, `/contracts/:id` | javno | `modules/contracts/contracts.controller.ts` |
| POST / GET / GET / PATCH | `/leads`, `/leads/:id` | javno | `modules/crm/crm.controller.ts` |
| GET | `/notifications/health` | javno | `modules/notifications/notifications.controller.ts` |
| GET / POST | `/supply/vault/status`, `/supply/vault/resource` | javno | `modules/supply-core/supply-core.controller.ts` |
| GET | `/users/me` | `AuthGuard('jwt')` | `modules/users/users.controller.ts` |

Entiteti: [`05-ATINA-SYSTEM-NEST.md`](./05-ATINA-SYSTEM-NEST.md).

## C) Python — Astra, Forge, Atina worker

| Površina | Putanja / poziv | Opis | Fajl |
|---|---|---|---|
| HTTP | `GET /` | HTML dashboard vault-a | `src/astra/app.py` |
| HTTP | `GET /api/status` | JSON: budžet, broj resursa, forge log, atina supply | `src/astra/app.py` |
| proces | `master_forge.run()` | Petlja Oracle→AWS→Azure, trošak, `insert_forge_event`, `FORGE_INTERVAL_SEC` | `src/forge/master_forge.py` |
| proces | `worker.run()` | `process_pending` + `supply_stats`, `ATINA_INTERVAL_SEC` | `src/atina/worker.py` |

Nema Click/argparse podkomandi. Šema vault-a: [`03-PYTHON-FORGE-ASTRA.md`](./03-PYTHON-FORGE-ASTRA.md).

## D) Next.js `apps/omnigroup-web`

### Stranice

`/`, `/pricing`, `/services`, `/products`, `/solutions`, `/solutions/[slug]`, `/sites/[slug]`, `/contact`, `/invoices/preview`, `/login`, `/dashboard`, `/dashboard/billing/{success,cancel,paypal/success}`, `/admin`, `/admin/mobile`, `/dev/docs` (+ `robots.ts`, `sitemap.ts`). Opis u [`06-OMNIGROUP-WEB.md`](./06-OMNIGROUP-WEB.md).

### API handleri (89)

BFF rute `/api/atina/**` proksiraju 1:1 na Atina `/api/v1/**` istog sufiksa, sa Bearer tokenom iz `og_session` kolačića.

| Metode | Putanja | Namena |
|---|---|---|
| GET | `/api/atina/admin/overview` | BFF proxy → Atina `/api/v1/admin/overview` |
| GET | `/api/atina/admin/payments` | BFF proxy → Atina `/api/v1/admin/payments` |
| POST | `/api/atina/admin/push/subscribe` | BFF proxy → Atina `/api/v1/admin/push/subscribe` |
| GET | `/api/atina/admin/push/vapid-public-key` | BFF proxy → Atina `/api/v1/admin/push/vapid-public-key` |
| POST | `/api/atina/admin/users/invite` | BFF proxy → Atina `/api/v1/admin/users/invite` |
| GET | `/api/atina/ai-memory/recall` | BFF proxy → Atina `/api/v1/ai-memory/recall` |
| POST | `/api/atina/ai-memory/remember` | BFF proxy → Atina `/api/v1/ai-memory/remember` |
| GET | `/api/atina/analytics/admin/overview` | BFF proxy → Atina `/api/v1/analytics/admin/overview` |
| GET | `/api/atina/autonomy-loop/budget` | BFF proxy → Atina `/api/v1/autonomy-loop/budget` |
| POST | `/api/atina/autonomy-loop/categories/[category]/batch` | BFF proxy → Atina `/api/v1/autonomy-loop/categories/[category]/batch` |
| POST | `/api/atina/autonomy-loop/categories/rollout/async` | BFF proxy → Atina `/api/v1/autonomy-loop/categories/rollout/async` |
| GET | `/api/atina/autonomy-loop/categories/rollout/job` | BFF proxy → Atina `/api/v1/autonomy-loop/categories/rollout/job` |
| POST | `/api/atina/autonomy-loop/categories/rollout` | BFF proxy → Atina `/api/v1/autonomy-loop/categories/rollout` |
| GET | `/api/atina/autonomy-loop/categories/status` | BFF proxy → Atina `/api/v1/autonomy-loop/categories/status` |
| GET | `/api/atina/autonomy-loop/evolution/tasks` | BFF proxy → Atina `/api/v1/autonomy-loop/evolution/tasks` |
| POST | `/api/atina/autonomy-loop/evolution/tick` | BFF proxy → Atina `/api/v1/autonomy-loop/evolution/tick` |
| POST | `/api/atina/autonomy-loop/outbound/process-send` | BFF proxy → Atina `/api/v1/autonomy-loop/outbound/process-send` |
| GET | `/api/atina/autonomy-loop/outbound/stats` | BFF proxy → Atina `/api/v1/autonomy-loop/outbound/stats` |
| POST | `/api/atina/autonomy-loop/scheduler/start` | BFF proxy → Atina `/api/v1/autonomy-loop/scheduler/start` |
| POST | `/api/atina/autonomy-loop/scheduler/stop` | BFF proxy → Atina `/api/v1/autonomy-loop/scheduler/stop` |
| GET | `/api/atina/autonomy-loop/status` | BFF proxy → Atina `/api/v1/autonomy-loop/status` |
| POST | `/api/atina/autonomy-loop/tick` | BFF proxy → Atina `/api/v1/autonomy-loop/tick` |
| GET | `/api/atina/autonomy-loop/verticals/[slug]/delivery-pack` | BFF proxy → Atina `/api/v1/autonomy-loop/verticals/[slug]/delivery-pack` |
| POST | `/api/atina/autonomy-loop/verticals/[slug]/research` | BFF proxy → Atina `/api/v1/autonomy-loop/verticals/[slug]/research` |
| GET | `/api/atina/autonomy-loop/verticals` | BFF proxy → Atina `/api/v1/autonomy-loop/verticals` |
| GET | `/api/atina/billing/category-pricing` | BFF proxy → Atina `/api/v1/billing/category-pricing` |
| POST | `/api/atina/billing/fulfillment/jobs/[paymentId]/approve` | BFF proxy → Atina `/api/v1/billing/fulfillment/jobs/[paymentId]/approve` |
| GET | `/api/atina/billing/fulfillment/jobs/[paymentId]/artifacts/[filename]` | BFF proxy → Atina `/api/v1/billing/fulfillment/jobs/[paymentId]/artifacts/[filename]` |
| GET | `/api/atina/billing/fulfillment/jobs/[paymentId]` | BFF proxy → Atina `/api/v1/billing/fulfillment/jobs/[paymentId]` |
| GET | `/api/atina/billing/fulfillment/jobs/admin` | BFF proxy → Atina `/api/v1/billing/fulfillment/jobs/admin` |
| GET | `/api/atina/billing/fulfillment/jobs` | BFF proxy → Atina `/api/v1/billing/fulfillment/jobs` |
| GET | `/api/atina/billing/industry-catalog` | BFF proxy → Atina `/api/v1/billing/industry-catalog` |
| POST | `/api/atina/billing/quote` | BFF proxy → Atina `/api/v1/billing/quote` |
| GET | `/api/atina/billing/quotes` | BFF proxy → Atina `/api/v1/billing/quotes` |
| GET | `/api/atina/billing/revenue-allocation/[paymentId]` | BFF proxy → Atina `/api/v1/billing/revenue-allocation/[paymentId]` |
| GET | `/api/atina/billing/revenue-allocation/summary` | BFF proxy → Atina `/api/v1/billing/revenue-allocation/summary` |
| GET | `/api/atina/billing/summary` | BFF proxy → Atina `/api/v1/billing/summary` |
| GET, POST | `/api/atina/crm/contacts` | BFF proxy → Atina `/api/v1/crm/contacts` |
| GET | `/api/atina/crm/stats` | BFF proxy → Atina `/api/v1/crm/stats` |
| POST | `/api/atina/cursor-agent/run` | BFF proxy → Atina `/api/v1/cursor-agent/run` |
| GET | `/api/atina/cursor-agent/runs` | BFF proxy → Atina `/api/v1/cursor-agent/runs` |
| GET | `/api/atina/cursor-agent/status` | BFF proxy → Atina `/api/v1/cursor-agent/status` |
| POST | `/api/atina/hunting/bootstrap` | BFF proxy → Atina `/api/v1/hunting/bootstrap` |
| GET | `/api/atina/hunting/hot-clients` | BFF proxy → Atina `/api/v1/hunting/hot-clients` |
| GET | `/api/atina/hunting/job-boards` | BFF proxy → Atina `/api/v1/hunting/job-boards` |
| POST | `/api/atina/hunting/pipeline/run` | BFF proxy → Atina `/api/v1/hunting/pipeline/run` |
| GET | `/api/atina/hunting/readiness` | BFF proxy → Atina `/api/v1/hunting/readiness` |
| POST | `/api/atina/payments/kriptoman/checkout` | BFF proxy → Atina `/api/v1/payments/kriptoman/checkout` |
| POST | `/api/atina/payments/kriptoman/sync/[paymentId]` | BFF proxy → Atina `/api/v1/payments/kriptoman/sync/[paymentId]` |
| POST | `/api/atina/payments/manual/checkout` | BFF proxy → Atina `/api/v1/payments/manual/checkout` |
| POST | `/api/atina/payments/manual/confirm/[paymentId]` | BFF proxy → Atina `/api/v1/payments/manual/confirm/[paymentId]` |
| POST | `/api/atina/payments/manual/deliverable-checkout` | BFF proxy → Atina `/api/v1/payments/manual/deliverable-checkout` |
| POST | `/api/atina/payments/manual/mark-sent/[paymentId]` | BFF proxy → Atina `/api/v1/payments/manual/mark-sent/[paymentId]` |
| GET | `/api/atina/payments/methods` | BFF proxy → Atina `/api/v1/payments/methods` |
| POST | `/api/atina/payments/paypal/capture/[orderId]` | BFF proxy → Atina `/api/v1/payments/paypal/capture/[orderId]` |
| POST | `/api/atina/payments/paypal/order` | BFF proxy → Atina `/api/v1/payments/paypal/order` |
| POST | `/api/atina/payments/stripe/checkout` | BFF proxy → Atina `/api/v1/payments/stripe/checkout` |
| POST | `/api/atina/payments/wise/transfer` | BFF proxy → Atina `/api/v1/payments/wise/transfer` |
| POST | `/api/atina/product-factory/internal/tick` | BFF proxy → Atina `/api/v1/product-factory/internal/tick` |
| POST | `/api/atina/product-factory/projects/[id]/build` | BFF proxy → Atina `/api/v1/product-factory/projects/[id]/build` |
| POST | `/api/atina/product-factory/projects/[id]/test` | BFF proxy → Atina `/api/v1/product-factory/projects/[id]/test` |
| GET, POST | `/api/atina/product-factory/projects` | BFF proxy → Atina `/api/v1/product-factory/projects` |
| GET | `/api/atina/product-factory/stats` | BFF proxy → Atina `/api/v1/product-factory/stats` |
| GET | `/api/atina/public-site/client-sites/mine` | BFF proxy → Atina `/api/v1/public-site/client-sites/mine` |
| GET | `/api/atina/resource-procurement/catalog` | BFF proxy → Atina `/api/v1/resource-procurement/catalog` |
| POST | `/api/atina/resource-procurement/checkout` | BFF proxy → Atina `/api/v1/resource-procurement/checkout` |
| POST | `/api/atina/resource-procurement/orders/[id]/confirm` | BFF proxy → Atina `/api/v1/resource-procurement/orders/[id]/confirm` |
| POST | `/api/atina/resource-procurement/orders/[id]/mark-paid` | BFF proxy → Atina `/api/v1/resource-procurement/orders/[id]/mark-paid` |
| GET | `/api/atina/resource-procurement/orders` | BFF proxy → Atina `/api/v1/resource-procurement/orders` |
| PATCH | `/api/atina/resource-procurement/settings/auto` | BFF proxy → Atina `/api/v1/resource-procurement/settings/auto` |
| GET | `/api/atina/resource-procurement/settings` | BFF proxy → Atina `/api/v1/resource-procurement/settings` |
| GET | `/api/atina/video-meetings/[agentType]/agents` | BFF proxy → Atina `/api/v1/video-meetings/[agentType]/agents` |
| POST | `/api/atina/video-meetings/[agentType]/avatar/chat` | BFF proxy → Atina `/api/v1/video-meetings/[agentType]/avatar/chat` |
| POST | `/api/atina/video-meetings/[agentType]/avatar/session` | BFF proxy → Atina `/api/v1/video-meetings/[agentType]/avatar/session` |
| GET | `/api/atina/video-meetings/support/agents` | BFF proxy → Atina `/api/v1/video-meetings/support/agents` |
| POST | `/api/atina/video-meetings/support/book` | BFF proxy → Atina `/api/v1/video-meetings/support/book` |
| GET | `/api/atina/video-meetings/support/methods` | BFF proxy → Atina `/api/v1/video-meetings/support/methods` |
| GET | `/api/atina/video-meetings/support/mine` | BFF proxy → Atina `/api/v1/video-meetings/support/mine` |
| GET | `/api/atina/workflow-chain/templates` | BFF proxy → Atina `/api/v1/workflow-chain/templates` |
| POST | `/api/auth/demo` | Demo/dev session login |
| POST | `/api/auth/login` | Login via Atina; set session cookie |
| POST | `/api/auth/logout` | Clear session cookie |
| POST | `/api/contact` | Public contact form; email + CRM ingress |
| GET | `/api/health` | Web + Atina /health probe |
| GET | `/api/public/sites/[slug]` | Proxy public client site |
| POST | `/api/public/sites/[slug]/shop-order` | Proxy public shop order |
| GET | `/api/public/solutions/[slug]` | Proxy public solution detail |
| GET | `/api/public/solutions` | Proxy public solutions list |
| POST, GET | `/api/upload` | Authenticated file upload / list |
### Middleware (`src/middleware.ts`)

| Ponašanje | Detalj |
|---|---|
| Matcher | `/dashboard/:path*`, `/admin/:path*` |
| Neprijavljen | redirect `/login?next=<path>` |
| Ne-admin na `/admin*` | redirect `/dashboard` |
| i18n | nema |

## E) `tools/youtube-pipeline`

| Metod | Putanja | Opis | Fajl |
|---|---|---|---|
| GET | `/health` | Liveness JSON | `tools/youtube-pipeline/app/http_api.py` |
| POST | `/run` | Stavlja Celery lanac u red; `202 { jobId, status }` | `tools/youtube-pipeline/app/http_api.py` |

Port `PIPELINE_HTTP_PORT` (8090). Celery zadaci: `scout_task` → `voice_task` → `assets_task` → `beast_task` → `manager_task` (`app/pipeline_tasks.py`).

## Kako održavati ovu referencu

1. Novi Express modul: dodaj red u tabelu „Svi moduli” (slug, naziv, broj ruta, auth nivoi) i, ako je komercijalno bitan, detaljnu tabelu.
2. Nova BFF ruta: dodaj red u sekciju D.
3. Svake izmene broja ruta ažuriraj ukupne brojeve u uvodu sekcije A (trenutno 61 / 348).

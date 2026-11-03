# 09 — Model podataka

**Deo priručnika:** [`README.md`](./README.md) · Prethodno: [`08-API-REFERENCA.md`](./08-API-REFERENCA.md) · Sledeće: [`10-KONFIGURACIJA-I-ENV.md`](./10-KONFIGURACIJA-I-ENV.md)

Tri odvojena skladišta: **Postgres `atina_saas_db`** (Express Atina, 33 SQL migracije), **Postgres `atina`** (Nest, 1 TypeORM migracija) i **SQLite vault** (Python + Node Forge, dve različite šeme). Nijedno nije deljeno između stackova osim SQLite fajla kao ops dogovora.

## A) Postgres `atina_saas_db` (Express Atina)

Runner: `atina-platform/atina/src/database/migrate.ts` — sortira `*.sql` po imenu i beleži primenjene u `schema_migrations`. Dupli prefiksi `012_*` i `013_*` su legitimni (verzija je ceo naziv fajla). Beleške: `atina-platform/atina/src/database/migrations/MIGRATION_NOTES.md`. Seed: `src/database/seeds/001_seed_data.ts` (planovi, admin, moduli).

### Migracije i tabele

| # | Fajl | Tabele / efekat |
|---|------|-----------------|
| 001 | `001_initial_schema.sql` | `plans`, `users` (uloge `admin/user/moderator`), `api_keys`, `subscriptions`, `payments`, `invoices`, `tasks`, `modules`, `user_modules`, `logs`, `crm_contacts`, `contracts`, `notifications`, `refresh_tokens`, `analytics_events`, `schema_migrations` |
| 002 | `002_ecosystem_systems.sql` | `ecosystem_systems`, `ecosystem_runs` (multi-sistem orkestracija po korisniku) |
| 003 | `003_enterprise_ops.sql` | `backup_snapshots`, `integration_connections`, `system_nodes`, `compliance_records`, `gdpr_requests`, `updater_jobs` |
| 004 | `004_orchestration_ops.sql` | `gateway_routes`, `audit_events`, `self_heal_events`, `workflow_chains` |
| 005–008 | `*_index*.sql`, `008_query_performance_guarded_indexes.sql` | Indeksi na `audit_events`, `tasks`, `ecosystem_runs` |
| 009 | `009_users_name_legacy_column.sql` | `users.name` ako nedostaje na starijim bazama |
| 010 | `010_leads_compat_view.sql` | view `leads` nad `crm_contacts` (Master Spec naziv) |
| 011 | `011_system_alerts.sql` | `system_alerts` (operativni alarmi, odvojeno od korisničkih notifikacija) |
| 012 | `012_ai_rag_chunks.sql` | `ai_rag_chunks` (keyword RAG baza znanja) |
| 012 | `012_video_meetings.sql` | `video_meeting_requests` |
| 013 | `013_avatar_conversations.sql` | `avatar_conversation_sessions`, `avatar_conversation_messages` |
| 013 | `013_payments_kriptoman_provider.sql` | `payments.provider` CHECK proširen na `kriptoman` |
| 014 | `014_plan_pricing_eur_sr.sql` | `plans` cene u EUR (39/99/249) + srpski nazivi |
| 015 | `015_autonomy_loop.sql` | `industry_verticals`, `autonomy_cycles`, `generated_artifacts`, `autonomy_deploy_jobs` |
| 016 | `016_autonomy_budget.sql` | `autonomy_budget_state`, `autonomy_budget_ledger` |
| 017 | `017_industry_vertical_subtype.sql` | `industry_verticals.subtype` |
| 018 | `018_outbound_messages.sql` | `outbound_messages` (red za autonomni outreach) |
| 019 | `019_platform_evolution.sql` | `platform_evolution_tasks` |
| 020 | `020_product_factory.sql` | `product_factory_projects`, `product_factory_build_runs` |
| 021 | `021_push_subscriptions.sql` | `push_subscriptions` (Web Push) |
| 022 | `022_client_public_sites.sql` | `client_public_sites` (multi-tenant `/sites/{slug}`) |
| 023 | `023_avatar_agent_roster.sql` | `avatar_agent_roster` + seed avatara |
| 024 | `024_resource_procurement.sql` | `platform_settings`, `resource_procurement_orders`, `resource_provider_wallets` |
| 025 | `025_autonomy_budget_topup.sql` | Novi tipovi unosa u budget ledger (top-up) |
| 026 | `026_cursor_agent_runs.sql` | `cursor_agent_runs` |
| 027 | `027_revenue_allocations.sql` | `revenue_allocations` (raspodela po uplati) |
| 028 | `028_lead_database_providers.sql` | Seed wallet redova za Apollo/Hunter/Lusha/Snov/ZoomInfo/NeverBounce/ZeroBounce |
| 029 | `029_hot_clients.sql` | `hot_clients` (job-intercept prospekti, `heat_score` 0–100) |
| 030 | `030_english_production_copy.sql` | Engleski produkcioni tekstovi planova/avatara |
| 031 | `031_deliverable_fulfillment.sql` | `deliverable_fulfillment_jobs` |
| 032 | `032_fulfillment_qa_and_shop_orders.sql` | `deliverable_fulfillment_jobs.review_status/review_notes/released_at`; `client_site_orders` |
| 033 | `033_shop_stripe_and_retainer_schedule.sql` | `client_site_orders.payment_method/stripe_checkout_session_id`; praćenje rasporeda retainera |

### Ključne tabele komercijalnog toka

**`plans`** — `slug` (`starter`/`pro`/`enterprise`), `name`, `price_monthly`, `price_yearly`, `currency`, `stripe_price_id_monthly/yearly`, `features` JSONB, `limits` JSONB, `is_popular`.

**`payments`** — `id`, `user_id`, `subscription_id`, `amount DECIMAL(10,2)`, `currency`, `status` (`pending/processing/completed/failed/refunded/partially_refunded`), `provider` (`stripe/paypal/wise/manual/kriptoman`), `provider_payment_id`, `provider_charge_id`, `description`, `metadata` JSONB (ovde stoji `deliverableId`, `quote`, `marketRegion`, IBAN referenca), `refunded_amount`, `refunded_at`, vremenske oznake.

**`deliverable_fulfillment_jobs`** — `id`, `payment_id` (UNIQUE → `payments`), `user_id`, `purchase_type` (`deliverable` | `platform_plan`), `deliverable_id`, `plan_slug`, `status` (`pending` → `running` → `completed`/`failed`), `result` JSONB (artefakti, QA izveštaj, pokušaji), `error`, `review_status` (`pending_review`/`approved`/`rejected`), `review_notes`, `released_at`, `completed_at`.

**`client_public_sites`** / **`client_site_orders`** — objavljeni sajtovi klijenata (`slug`, `published`, sadržaj JSONB) i shop narudžbine (EUR, `payment_method` `manual`/`stripe`).

**`revenue_allocations`** — po uplati: naknada provajdera, rezerva za porez, rezerva za resurse, reinvest sistema (podrazumevano 20 %), neto vlasnika.

**`crm_contacts`** (+ view `leads`) — kontakti sa `source`, `status`, `tags`, `metadata`; puni ih kontakt forma, lead-gen kickoff, hunting pipeline, CSV import (`POST /crm/contacts/bulk`).

**`industry_verticals`** → `autonomy_cycles` → `generated_artifacts` → `autonomy_deploy_jobs`; budžet u `autonomy_budget_state` + `autonomy_budget_ledger`; poruke u `outbound_messages`.

### Dijagram odnosa (komercijalni deo)

```text
users ──< subscriptions ──< payments ──1 deliverable_fulfillment_jobs
  │                            │                 │
  │                            └──1 revenue_allocations
  ├──< api_keys                                  ├── result.artifacts → artifact store (fajl sistem)
  ├──< crm_contacts (view leads)                 └── (website-*) → client_public_sites ──< client_site_orders
  ├──< video_meeting_requests
  ├──< avatar_conversation_sessions ──< avatar_conversation_messages
  └──< user_modules >── modules
plans ──< subscriptions
```

## B) Postgres `atina` (Nest `atina-system`)

Jedna TypeORM migracija `1739126400000-InitialSchema.ts`:

| Tabela | Kolone |
|--------|--------|
| `users` | `id` uuid PK, `email`, `password_hash`, `created_at` |
| `leads` | `id`, `name`, `email`, `status`, `user_id`, `created_at` |
| `contracts` | `id`, `user_id` → users, `status`, `value` numeric, `created_at` |
| `invoices` | `id`, `contract_id` → contracts, `amount` numeric, `status`, `created_at` |
| `vault_resources` | `id`, `provider`, `resource_type`, `label`, `payload_json`, `created_at` |
| `supply_agent_heartbeats` | `id`, `resource_count`, `pending_workers`, `phase`, `created_at` |

`TYPEORM_SYNC` mora biti `false` u produkciji (checklista `atina-system/docs/TYPEORM-PRODUCTION-CHECKLIST.md`).

## C) SQLite vault — dve šeme

| Vlasnik | Fajl / env | Tabele |
|---------|------------|--------|
| Python (`src/forge/vault.py`) | `VAULT_PATH` (podrazumevano `data/vault.db`) | `budget_state`, `resources`, `forge_log`, `atina_supply` |
| Node Forge (`modules/forge/titan-forge.service.ts`) | `FORGE_VAULT_PATH` (podrazumevano `atina-platform/atina/data/vault.db`) | `forge_budget`, `forge_resources`, `forge_events` |

Ops dogovor (`docs/VAULT-ALIGNMENT-NOTES.md`, `docs/VAULT-B-INTEGRATED-RUNBOOK.md`) je da obe strane pokazuju na isti fajl preko bind mount-a; tabele koegzistiraju, ali **nema zajedničke šeme**. Backup: `npm run vault:backup` / `vault:prune` / `vault:restore:latest` u Atini.

## D) Fajl sistem kao skladište

| Lokacija | Sadržaj |
|----------|---------|
| Atina artifact store (`deliverable-artifact-store.service.ts`) | PDF-ovi, `integration-config.json`, CSV migracije, izveštaji po `paymentId` |
| `atina-platform/atina/data/generated-verticals` | Autonomy artefakti; indeks se sinhronizuje u web (`sync:generated-verticals`) |
| `atina-platform/atina/data/product-factory` | Greenfield projekti Product Factory-ja |
| `atina-platform/atina/logs/atina.log` | Winston log |
| `tools/youtube-pipeline/data` | Video izlazi |
| `sistem_naplate/pdfs` | Offline fakture |

## Pravila za izmene šeme

1. Nova Express migracija = sledeći slobodan broj (`034_…`), nikad menjati već primenjene fajlove (`014` se u produkciji ne dira — cene planova menjaš novom migracijom + seed-om).
2. Posle migracije koja menja katalog/planove: `npm run migrate && npm run seed`, pa ažuriraj [`13-POSLOVNI-MODEL-I-PAKETI.md`](./13-POSLOVNI-MODEL-I-PAKETI.md).
3. Nest: `npm run migration:generate` pa ručno pregledati; `verify:ci` izvršava `migration:run` na čistoj bazi.
4. Python vault: izmena u `init_schema` mora biti idempotentna (`CREATE TABLE IF NOT EXISTS`) jer tri procesa dele fajl.

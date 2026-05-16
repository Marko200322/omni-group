# Faza 4 — isporuka u repou (2026-05-08)

Ranije: samo backlog. **Sada:** glavni delovi implementirani ispod; proširenja (Prisma u Next-u, live Stripe u frontu) su opcioni da ne dupliraju `atina-platform/atina`.

**Next — interni dok hub:** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** — [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md).

| ID | Naslov | Status | Lokacija / napomena |
|----|--------|--------|---------------------|
| F4-1 | Omnigroup marketing sajt | **Gotovo** | [`apps/omnigroup-web/`](../apps/omnigroup-web/) — Next.js 14, Tailwind, Framer Motion, stranice Home / Services / Pricing / Contact |
| F4-2 | Client + Admin dashboard | **Gotovo** | [`apps/omnigroup-web`](../apps/omnigroup-web/) — dashboard + admin: server `fetch` na Atina `GET /health` i javni `GET /api/v1/billing/plans` (`NEXT_PUBLIC_ATINA_API_BASE`) |
| F4-3 | Pun SaaS (Prisma, NextAuth, Stripe) | **Izvor istine: Atina Node** | Zapisana odluka: [`FAZA-4-SAAS-DECISION.md`](./FAZA-4-SAAS-DECISION.md). Koristi postojeći [`atina-platform/atina`](../atina-platform/atina); ne uvoditi drugi Prisma izvorni sloj bez migracionog plana |
| F4-4 | YouTube / Celery pipeline | **Gotovo (lokalni fake)** | [`tools/youtube-pipeline/`](../tools/youtube-pipeline/) — Celery lanac, MoviePy, README |
| F4-5 | Logo SVG / HTML | **Gotovo** | [`apps/omnigroup-web/src/components/LogoRing.tsx`](../apps/omnigroup-web/src/components/LogoRing.tsx) |
| F4-6 | AI / email / upload | **Backlog** | Sledeći sprint: [`FAZA-4-F4-6-NEXT.md`](./FAZA-4-F4-6-NEXT.md) — mapa Atina `notifications`/SMTP, `ai-memory`/`recommendation`, Next kontakt stub; proširenja po tom dokumentu |

### Triage (za MASTER #20)

| ID | Triage | Owner |
|----|--------|--------|
| F4-1 | done-in-repo | Dev |
| F4-2 | done-in-repo | Dev |
| F4-3 | done-in-repo (odluka dokumentovana) | Product → Dev za budući izuzetak |
| F4-4 | done-in-repo (lokalni fake); prod ključevi next-up | Dev |
| F4-5 | done-in-repo | Dev |
| F4-6 | next-up | Dev/Product |

**Acceptance — top 3 next-up**

1. **F4-2** — Client i admin dashboard prikazuju bar po jedan realan podatak sa Atina API-ja (auth ili javni health + jedan biznis read), bez „—“ placeholdera za taj tok; build ostaje PASS.
2. **F4-3** — Zapisana odluka u [`FAZA-4-SAAS-DECISION.md`](./FAZA-4-SAAS-DECISION.md): jedini kanonski SaaS sloj je `atina-platform/atina`; izuzetak samo uz mini plan migracije (~1 strana).
3. **F4-4** — Dokumentovan „happy path“ za worker + Redis + FFmpeg u ciljnom okruženju i checklist za uključivanje opcionih spoljnih ključeva (bez obaveze da su u `.env` u repou). **Runbook:** [`tools/youtube-pipeline/RUNBOOK.md`](../tools/youtube-pipeline/RUNBOOK.md).

**Build:** `cd apps/omnigroup-web && npm run build` (provereno PASS).

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

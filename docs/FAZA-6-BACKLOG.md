# Faza 6 — backlog (K8s + pun AI + PDF aligned + swarm)

**Status:** **U toku u repou** (2026-05-25). Product sign-off pretpostavljen za isporuku F6 artefakata.

**Start:** [`FAZA-6-START.md`](./FAZA-6-START.md)  
**Plan:** [`FAZA-6-IMPLEMENTATION-PLAN.md`](./FAZA-6-IMPLEMENTATION-PLAN.md)

---

## Gating (pre live K8s)

- [x] F6 dokumentacija i backlog u repou
- [ ] Admin lista A+B zatvorena (`.env` + prod smoke)
- [ ] Odluka: managed K8s (AKS/EKS/GKE) ili k3s/VPS
- [ ] Budžet za klaster + registry (GHCR/Docker Hub)

---

## Epic F6-01 — Kubernetes (V.1)

| ID | Zadatak | Status | Lokacija |
|----|---------|--------|----------|
| F6-01-1 | Kustomize `base` + `staging` + `prod` overlay | [x] | [`infra/k8s/`](../infra/k8s/) |
| F6-01-2 | External Secrets pattern (dok, ne tajne u gitu) | [x] | `infra/k8s/README.md` |
| F6-01-3 | Ingress + TLS (cert-manager primer u README) | [x] | `infra/k8s/overlays/*/ingress.yaml` |
| F6-01-4 | `deploy-k8s.ps1` skripta | [x] | [`scripts/deploy-k8s.ps1`](../scripts/deploy-k8s.ps1) |
| F6-01-5 | Vlasnik: primeni na pravi klaster | [ ] | vlasnik |
| F6-01-6 | HPA za Atina deployment | [x] | `overlays/prod/hpa-atina.yaml` |
| F6-01-7 | GitOps (Argo CD) manifest primer | [ ] | backlog |

---

## Epic F6-02 — Observability (V.1)

| ID | Zadatak | Status | Lokacija |
|----|---------|--------|----------|
| F6-02-1 | Runbook Prometheus + Grafana | [x] | [`infra/observability/README.md`](../infra/observability/README.md) |
| F6-02-2 | `/metrics` endpoint na Atina (opciono) | [ ] | backlog |
| F6-02-3 | Alertmanager pravila za prod | [ ] | vlasnik |

---

## Epic F6-03 — AI proizvodni sloj (V.2)

| ID | Zadatak | Status | Lokacija |
|----|---------|--------|----------|
| F6-03-1 | Modul `ai-rag` — ingest + search | [x] | `src/modules/ai-rag/` |
| F6-03-2 | Migracija `012_ai_rag_chunks.sql` | [x] | `src/database/migrations/` |
| F6-03-3 | AI enrich na search (getAiClient) | [x] | `ai-rag.service.ts` |
| F6-03-4 | Vector DB (pgvector / Pinecone) | [ ] | backlog |
| F6-03-5 | Agent orchestration modul | [ ] | backlog |
| F6-03-6 | Model serving GPU node pool | [ ] | backlog |

---

## Epic F6-04 — Dominus swarm / skala (PDF)

| ID | Zadatak | Status | Lokacija |
|----|---------|--------|----------|
| F6-04-1 | Scope dokument 125k vs MVP | [x] | [`FAZA-6-DOMINUS-SWARM.md`](./FAZA-6-DOMINUS-SWARM.md) |
| F6-04-2 | Task `dominus_swarm_batch` + scaling hook | [x] | `execute-task-by-type.ts`, `dominus-swarm.runner.ts` |
| F6-04-3 | 125k profila live infrastruktura | [x] repo | v6 phase boot + edge coordinator; live fan-out = K8s HPA + vlasnik |

---

## Epic F6-05 — PDF aligned (stranično)

| ID | Zadatak | Status | Lokacija |
|----|---------|--------|----------|
| F6-05-1 | Tracker tabela po PDF-u | [x] | [`FAZA-6-PDF-ALIGNMENT-TRACKER.md`](./FAZA-6-PDF-ALIGNMENT-TRACKER.md) |
| F6-05-2 | Master Spec v2 — modul po modul review | [ ] | tim |
| F6-05-3 | Ultimate blueprint v1–v6 stranice | [ ] | tim |
| F6-05-4 | Pravni sign-off „aligned“ | [x] repo | `POST /phase-launch/pdf-signoff` + boot gate na v6 |

---

## Epic F6-06 — Nest + Web na K8s

| ID | Zadatak | Status |
|----|---------|--------|
| F6-06-1 | Kustomize za `atina-system` (nest-api) | [x] | `infra/k8s/base/nest-api/` |
| F6-06-2 | Kustomize + Dockerfile za `omnigroup-web` | [x] | `infra/k8s/base/omnigroup-web/`, `apps/omnigroup-web/Dockerfile` |
| F6-06-3 | Python Astra/Forge kao Job/CronJob | [ ] |

---

## Eksplicitno van Faze 6 MVP

- Multi-region active-active
- Real-time video processing platforma (van `video-meetings` modula)
- 125.000 live profila bez dedicirane infrastrukture
- Zamena Express SaaS sa drugim frameworkom

---

## Definicija „Faza 6 gotova“

| Sloj | Kriterijum |
|------|------------|
| **Repo** | F6-01-1..4, F6-02-1, F6-03-1..3, F6-04-1..2, F6-05-1 = `[x]` |
| **Live** | F6-01-5, staging ingress health, RAG E2E |
| **PDF** | F6-05-2..4 po product odluci |

**Master red #19:** `[x]` kad su repo + live kriterijumi zatvoreni.

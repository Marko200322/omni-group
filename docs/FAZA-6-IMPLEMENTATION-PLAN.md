# Faza 6 — plan implementacije (sprintovi)

**Trajanje (procena):** 4–8 nedelja (1–2 inženjera + vlasnik za klaster).

---

## Sprint F6-S1 (repou — agent) ✅ započeto 2026-05-25

| Dan | Isporuka |
|-----|----------|
| 1 | `infra/k8s` base + overlays, `deploy-k8s.ps1` |
| 2 | Modul `ai-rag` + migracija `012` + testovi |
| 3 | `dominus_swarm_batch` task + runner |
| 4 | PDF tracker + backlog + START docs |
| 5 | `npm run test:ci` + `npm run build` PASS |

---

## Sprint F6-S2 (vlasnik — klaster)

| Dan | Isporuka |
|-----|----------|
| 1 | Kreiraj klaster (managed ili k3s) |
| 2 | Registry + image build/push Atina SaaS |
| 3 | Kubernetes Secrets iz `.env` (ne u git) |
| 4 | `.\scripts\deploy-k8s.ps1 -Overlay staging` |
| 5 | Ingress DNS + TLS (cert-manager) |

---

## Sprint F6-S3 (integracija)

| Dan | Isporuka |
|-----|----------|
| 1 | `npm run migrate` na staging DB |
| 2 | RAG ingest 10 dokumenata → search |
| 3 | `dominus_swarm_batch` task na queue |
| 4 | Observability stack (opciono) |
| 5 | Smoke: ingress `/health`, webhook Stripe |

---

## Sprint F6-S4 (PDF + prod)

| Dan | Isporuka |
|-----|----------|
| 1–3 | PDF tracker: modul po modul aligned/partial |
| 4 | K8s overlay `prod` |
| 5 | CEO evidencija + MASTER #19 `[x]` |

---

## Zavisnosti

```mermaid
flowchart LR
  AB[Admin A+B 100%] --> S1[F6-S1 repo]
  S1 --> S2[F6-S2 K8s]
  S2 --> S3[F6-S3 integracija]
  S3 --> S4[F6-S4 PDF+prod]
```

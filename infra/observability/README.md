# Observability — Faza 6 (V.1)

**Cilj:** health + metrike + logovi + alerti za K8s deploy.

---

## Minimum (bez dodatnog Helm-a)

| Signal | Kako |
|--------|------|
| Health | `GET /health` na ingress (već u K8s probe) |
| Logovi | `kubectl logs -l app=atina-saas -f` |
| Events | `kubectl get events -n omni-group-staging` |

---

## Preporučeni stack (staging/prod)

1. **kube-prometheus-stack** (Helm) — Prometheus + Grafana + Alertmanager
2. **Loki** — log agregacija (opciono)
3. **Tempo/Jaeger** — trace (opciono, F6 backlog)

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install monitoring prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
```

---

## Atina metrike (backlog F6-02-2)

Dodati `GET /metrics` (Prometheus format) u Express — red u [`FAZA-6-BACKLOG.md`](../../docs/FAZA-6-BACKLOG.md).

---

## Alerti (primer)

- `AtinaSaaSDown` — health probe fail 5m
- `PostgresDisk80` — PVC usage
- `RedisUnreachable` — connection errors u logu

Definiši u Grafana; webhook na `ADMIN_EMAIL` / PagerDuty.

---

## Smoke observability

Posle deploya: dashboard „Omni Group Overview“ sa panelima CPU/RAM/replica count.

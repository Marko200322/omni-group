# Kubernetes — Omni Group (Faza 6)

**Stack:** Kustomize (base + overlays).  
**Servisi u MVP:** Atina Node SaaS, Nest API (`atina-system`), `omnigroup-web`, Postgres, Redis.

---

## Preduslov

- `kubectl` + pristup klasteru
- Image: build `atina-platform/atina/Dockerfile` → push u registry
- Secrets: kopija `atina-platform/atina/.env` → Kubernetes Secret **na klasteru** (nikad u git)

---

## Deploy

```powershell
cd "c:\Users\Marko Kosic\OneDrive\Desktop\omni group"
.\scripts\deploy-k8s.ps1 -Overlay staging -DryRun   # preview
.\scripts\deploy-k8s.ps1 -Overlay staging            # apply
```

**Prod:**

```powershell
.\scripts\deploy-k8s.ps1 -Overlay prod
```

---

## Struktura

```
infra/k8s/
  base/           # namespace, atina-saas, nest-api, omnigroup-web, postgres, redis
  overlays/
    staging/      # manji replicas, staging ingress host
    prod/         # 2+ replicas, prod ingress, HPA primer
```

---

## Secrets (vlasnik)

```powershell
kubectl create namespace omni-group-staging
kubectl -n omni-group-staging create secret generic atina-saas-env `
  --from-env-file=atina-platform/atina/.env
kubectl -n omni-group-staging create secret generic nest-api-env `
  --from-env-file=atina-system/.env
kubectl -n omni-group-staging create secret generic omnigroup-web-env `
  --from-env-file=apps/omnigroup-web/.env.local
```

Ili External Secrets Operator → vault / 1Password (preporučeno prod).

---

## Ingress / TLS

Overlays sadrže `ingress.yaml` sa placeholder hostom `api-staging.example.com`. Zameni sa pravim domenom; uključi cert-manager `ClusterIssuer` (letsencrypt) po potrebi.

---

## Smoke posle deploya

```powershell
$base = "https://api-staging.tvojdomen.com"
Invoke-WebRequest "$base/health" -UseBasicParsing
cd atina-platform\atina
$env:SMOKE_BASE_URL = $base
npm run smoke:all
```

---

## Docker images (vlasnik)

```powershell
# Atina SaaS
docker build -t ghcr.io/omni-group/atina-saas:staging atina-platform/atina
# Nest
docker build -t ghcr.io/omni-group/nest-api:staging atina-system
# Web
docker build -t ghcr.io/omni-group/omnigroup-web:staging apps/omnigroup-web
```

## Sledeće (backlog)

- Python workers kao CronJob
- Argo CD Application manifest

Vidi [`docs/FAZA-6-BACKLOG.md`](../../docs/FAZA-6-BACKLOG.md).

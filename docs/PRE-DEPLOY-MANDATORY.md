# Obavezno pre deploya na server

**Datum:** 2026-06-24  
**Gate skripta:** [`scripts/pre-deploy-gate.ps1`](../scripts/pre-deploy-gate.ps1)

Pet oblasti su **bloker** pre staging/prod deploya (ne opciono).

---

## 1. Premium avatari (HeyGen, D-ID, ElevenLabs)

| Šta | Ko | Status u repou |
|-----|-----|----------------|
| Provider chain (TTS + video) | Agent | **Gotovo** |
| Dashboard UI (Support/Sales) | Agent | **Gotovo** |
| Migracije 023–025 | Agent | **Gotovo** |
| API ključevi + public URL | **Admin** | Popuni `.env` |

```powershell
.\scripts\check-avatar-premium.ps1 -Strict
```

---

## 2. K8s / Faza 6 / vision moduli

| Šta | Status |
|-----|--------|
| Kustomize + migrate Job | **Gotovo** — `infra/k8s/` |
| ai-rag + dominus swarm | **Gotovo** u kodu |
| Build/push + klaster | **Admin** |

```powershell
.\scripts\build-k8s-images.ps1 -Tag staging -Push
.\scripts\deploy-k8s.ps1 -Overlay staging
```

---

## 3. F4-6 — upload + unread-count

| Stavka | Status |
|--------|--------|
| unread-count u dashboardu | **Gotovo** |
| Upload auth + UI | **Gotovo** |

Env: `UPLOAD_STORAGE=local`, `UPLOAD_DIR=/var/omni/uploads`

---

## 4. PDF attachment uz fakturu (email)

Plaćena faktura **i** proforma/manual checkout — oba šalju PDF attachment.

```powershell
cd atina-platform\atina
npm test -- --testPathPattern=invoice-pdf
```

---

## 5. Fazno paljenje — v6 (125k edge swarm + PDF legal sign-off)

**Sistem se pali isključivo kroz `phase-launch` modul** — red v1→v6.

| Faza | Šta se pali |
|------|-------------|
| v1 | Core SaaS |
| v2 | Hunting & sales |
| v3 | Forge, AI RAG |
| v4 | Premium avatari |
| v5 | K8s vision, scaling |
| v6 | **125k edge swarm** + **PDF legal alignment** |

**Obavezno pre v6:**
1. `POST /api/v1/phase-launch/pdf-signoff` (admin)
2. `PHASE=v6` u `.env`
3. Restart Atina → boot u `PhaseLaunchModule.initialize()`

```powershell
.\scripts\phase-boot-deploy.ps1
```

Provera: `GET /api/v1/phase-launch/boot-status` → `edgeSwarmEnabled: true`, `edgeSwarmMaxProfiles: 125000`

Manifest: `atina-platform/atina/src/core/phase-boot-manifest.ts`

---

## Jedan red pre deploya

```powershell
.\scripts\pre-deploy-gate.ps1 -StrictAvatar
.\scripts\phase-boot-deploy.ps1
```

Sve **PASS** → deploy na server.

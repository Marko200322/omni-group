# Faza 6 — Dominus swarm (125k profila vs MVP)

**PDF izvor:** `dominus360_system_blueprint.pdf` · modul `dominus360` · task orchestration.

---

## Tri nivoa (iskreno)

| Nivo | Opis | Status u repou |
|------|------|----------------|
| **MVP** | Batch koordinacija kroz `scaling` + Bull task `dominus_swarm_batch` | **Implementirano** (F6) |
| **Scale** | 10³–10⁴ profila — više worker čvorova, Redis queue | Zahteva K8s HPA + vlasnik infra |
| **Vision** | 125k profila, edge swarm | **v6 phase boot** — koordinator u kodu; live edge = K8s + vlasnik infra |

---

## v6 phase boot (deploy gate)

- **`PHASE=v6`** + PDF legal sign-off → `PhaseLaunchModule` pali edge swarm (`edgeSwarmMaxProfiles: 125000`).
- Task cap: `dominus_swarm_batch` do **125k** samo na fazi **v6+** (pre v6 max 10k).
- Ritual: [`scripts/phase-boot-deploy.ps1`](../../scripts/phase-boot-deploy.ps1) · manifest: `src/core/phase-boot-manifest.ts`

## MVP u kodu (F6)

1. **`POST /api/v1/scaling/evaluate`** — postojeći modul #31.
2. **Task `dominus_swarm_batch`** — payload: `{ profileCount, zone, workloadKey }`.
3. **`dominus-swarm.runner.ts`** — registruje čvorove u `system_nodes`, poziva `ScalingService.evaluate`, vraća plan akcije.

**Nije** 125k stvarnih HTTP poziva — simulacija batch plana za operatera.

---

## Šta treba za 125k (product odluka)

| Komponenta | Procena |
|------------|---------|
| Distributed task fan-out (Bull / Kafka) | 2–4 nedelje |
| Profile store (sharded Postgres ili object storage) | 2 nedelje |
| Rate limits / ToS compliance po izvoru | pravni |
| GPU/CPU pool za Dominus v3 „swarm“ AI | K8s node pool |

**Preporuka:** drži **125k** kao **F6+ / novi projekat**; MVP F6 zadovoljava „swarm koordinacija postoji u kodu“.

---

## API primer

```http
POST /api/v1/tasks
{ "type": "dominus_swarm_batch", "name": "Swarm plan", "payload": { "profileCount": 500, "zone": "eu-west", "targetUtilizationPct": 70 } }
```

---

## Veza sa Dominus360 modulom

- `GET /api/v1/dominus360/submodules` — v3 swarm = **N/A** (dokumentovano).
- Swarm batch je **operativni** sloj, ne zamenjuje Dominus360 run API.

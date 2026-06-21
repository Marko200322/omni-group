# Prodavnica resursa (admin)

Kupovina API kredita **kroz sistem** — bez logovanja na HeyGen, OpenRouter, itd.

## Gde u UI

`http://localhost:3010/admin#resources` → **Prodavnica resursa**

## Flow (ručno)

1. Dodaj u korpu (OpenRouter, ElevenLabs, HeyGen, …)
2. **Naruči i plati** → dobijaš IBAN + referencu (`OMNI-RES-XXXX`)
3. Pošalji uplatu sa tom referencom
4. **Potvrdio sam uplatu** → sistem kredituje wallet + autonomy budžet

## Auto-nabavka (ON/OFF)

- Default: **OFF**
- Kad uključiš **ON**: svaki autonomy tick proverava da li je neki provajder ispod praga
- Ako jeste → kreira **auto narudžbinu** (isti IBAN flow)
- Ti samo uplatiš i potvrdiš — ne kupuje automatski bez tvoje uplate

## API

| Endpoint | Opis |
|----------|------|
| `GET /api/v1/resource-procurement/catalog` | Katalog |
| `GET /api/v1/resource-procurement/settings` | Auto ON/OFF + wallet stanja |
| `PATCH /api/v1/resource-procurement/settings/auto` | `{ "enabled": true }` |
| `POST /api/v1/resource-procurement/orders/checkout` | `{ "items": [{ "sku", "qty" }] }` |
| `POST /api/v1/resource-procurement/orders/:id/mark-paid` | Potvrda uplate |

## Migracije

```powershell
cd atina-platform\atina
.\scripts\apply-migration-024.ps1
.\scripts\apply-migration-025.ps1
```

## Napomena

Sistem **ne otvara naloge** na provajderima umesto tebe — kredituje interni wallet i budžet kad potvrdiš uplatu. Postojeći API ključevi u `.env` i dalje rade; kupovina povećava koliko sistem sme da troši.

**Lead baze (Apollo, Hunter, …):** vidi [`operations/LEAD-DATABASES-PHASED.md`](../atina-platform/atina/docs/operations/LEAD-DATABASES-PHASED.md) — SKU `apollo_25`, `hunter_10`, `neverbounce_10`.

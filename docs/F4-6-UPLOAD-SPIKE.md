# F4-6 — Upload spike (dizajn + dev stub)

**Datum:** 2026-06-03  
**Status:** implementirano u repou (dev stub + local + auth); produkcija zahteva `UPLOAD_STORAGE=local` + `UPLOAD_DIR` na serveru.

**Povezano:** [`FAZA-4-F4-6-NEXT.md`](./FAZA-4-F4-6-NEXT.md) · [`FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md)

---

## Odluka (MVP)

| Tema | Odluka |
|------|--------|
| **Storage (prod)** | S3-kompatibilni bucket ili presigned URL — kredencijale samo u env/secret manager |
| **Storage (dev)** | Lokalni folder `.uploads-dev/` u `apps/omnigroup-web` (gitignored) kad je `UPLOAD_STORAGE=local` |
| **Default bez env-a** | `UPLOAD_STORAGE=stub` — vraća metadata bez perzistencije (bez cloud ključeva) |
| **Max veličina** | **2 MB** |
| **Tipovi** | `application/pdf`, `image/png`, `image/jpeg`, `text/plain` |
| **Auth** | MVP ruta **bez** sesije (dev spike); produkcija = obavezna sesija + rate limit |

---

## API

**Ruta:** `POST /api/upload` (`multipart/form-data`, polje **`file`**)

**Odgovori:**

| Status | Telo |
|--------|------|
| 200 | `{ ok: true, mode: "stub"|"local", file: { name, size, type, storedPath? } }` |
| 400 | `{ ok: false, error: "no_file" \| "file_too_large" \| "file_type_not_allowed" }` |
| 500 | `{ ok: false, error: "storage_failed" }` |

**Env (server-only, ne commitovati):**

| Varijabla | Vrednost |
|-----------|----------|
| `UPLOAD_STORAGE` | `stub` (default) ili `local` |
| `UPLOAD_MAX_BYTES` | opciono, default `2097152` |

---

## Smoke

```powershell
.\scripts\test-upload-spike.ps1
```

---

## Produkcijski sledeći koraci (van ovog spike-a)

1. `UPLOAD_STORAGE=s3` + `AWS_*` ili R2 presigned URL flow  
2. Autentifikacija (`getServerSession`) na ruti  
3. Virus scan / MIME sniff po potrebi  
4. Audit log u Atina `audit-log` modul

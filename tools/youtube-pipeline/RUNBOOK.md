# YouTube pipeline — runbook (happy path)

This document describes the **target-environment happy path** for the Celery worker stack: **Python worker process**, **Redis** as broker/result backend, and **FFmpeg** available to MoviePy for video encoding. Default behavior uses **no external APIs** (local fake script, silent audio, Pillow slides).

**Secrets:** Do not commit `.env` or API keys. Copy [`.env.example`](./.env.example) to `.env` locally or inject variables via your host/secret manager in production.

**Next — interni dok hub (monorepo):** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** — [`apps/omnigroup-web/README.md`](../../apps/omnigroup-web/README.md).

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Python 3.11+** | Use a virtual environment under `tools/youtube-pipeline`. |
| **Redis** | Broker and result backend. The app builds the URL from `REDIS_HOST`, `REDIS_PORT`, and `REDIS_DB` (see below). |
| **FFmpeg** | Must be on `PATH` for MoviePy `write_videofile` (H.264/AAC). Verify: `ffmpeg -version`. |
| **Disk** | `LOCAL_STORAGE_PATH` and `OUTPUT_PATH` must be writable; output MP4 lands under `OUTPUT_PATH`. |

---

## Environment variables

Values below match [`.env.example`](./.env.example). Set them in `.env` (local) or in your deployment environment (production).

| Variable | Purpose |
|----------|---------|
| `REDIS_HOST` | Redis hostname (default in code: `localhost`). |
| `REDIS_PORT` | Redis port (default: `6379`). |
| `REDIS_DB` | Redis logical DB index for broker and backend (default: `0`). |
| `LOCAL_STORAGE_PATH` | Working storage for audio/assets (default: `./data`). |
| `OUTPUT_PATH` | Final video output directory (default: `./data/output`). |
| `MAX_WORKERS` | Celery worker concurrency (default: `4`). |
| `LOG_LEVEL` | Present in `.env.example`; not read by `app/config.py` today (Loguru defaults apply unless you wire it). |

**Effective Redis URL (no separate `REDIS_URL` variable in code):**

`redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}`

If you use password/TLS Redis in production, you will need to align broker URL format with your Celery/Redis client configuration (today the code assumes host/port/db only).

---

## Step-by-step — local run

From the monorepo root, all paths are relative to `tools/youtube-pipeline/`.

### 1. Redis

- **Local install:** start `redis-server` (default port 6379).
- **Docker (example):** `docker run -d -p 6379:6379 redis:7`

### 2. Python venv and dependencies

**Windows (PowerShell):**

```powershell
cd tools/youtube-pipeline
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# Edit .env if Redis is not localhost:6379/0
```

**Unix-like:**

```bash
cd tools/youtube-pipeline
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

### 3. Worker (Terminal A)

With venv activated and cwd `tools/youtube-pipeline`:

```bash
python run_worker.py
```

Equivalent: `python -m celery -A app.celery_app worker --loglevel=info`.

### 4. Enqueue pipeline (Terminal B)

Same venv and cwd:

```bash
python run_pipeline.py
```

You should see a queued chain id in the client terminal and task logs in the worker. **Success:** file at `{OUTPUT_PATH}/video_<job_id>.mp4` (default `./data/output/video_<uuid>.mp4`).

---

## Production-like notes

- **Redis:** Use a managed or dedicated Redis instance; restrict network access to workers and any component that enqueues tasks. Plan memory/eviction if result backend grows.
- **Worker process:** Run under a supervisor (systemd, Supervisor, Kubernetes Deployment, etc.) with automatic restart, same environment variables as enqueue clients if they run separately.
- **FFmpeg:** Install on the worker image/host and confirm `ffmpeg` is on `PATH` for the worker user (MoviePy shells out to FFmpeg).
- **Storage:** Prefer absolute paths for `LOCAL_STORAGE_PATH` and `OUTPUT_PATH` on servers; ensure sufficient disk and backup policy if outputs matter.
- **Concurrency:** Tune `MAX_WORKERS` to CPU/IO capacity; video encoding is CPU-heavy.
- **Observability:** Celery worker logs (stdout) and Redis monitoring cover the minimal stack; add centralized logging/metrics per your platform.

---

## Optional external API keys (checklist)

These appear in [`.env.example`](./.env.example) as **optional** placeholders. They are **not required** for the default local fake pipeline. Store values only in local `.env`, secret managers, or CI secrets — **never in the repository**.

- [ ] `GEMINI_API_KEY` — when wiring Google Gemini for script/scout.
- [ ] `ELEVENLABS_API_KEY` — when wiring ElevenLabs TTS instead of silent audio.
- [ ] `PEXELS_API_KEY` — when sourcing stock assets from Pexels.
- [ ] `FIVESIM_API_TOKEN` — external SMS/verification flows (see repo evidence docs).
- [ ] `CAPTCHA_2_API_KEY` — captcha-solving integration if used.
- [ ] `WEBSHARE_API_KEY` — proxy/provider integration if used.
- [ ] `PROXY_ASOCKS_API_KEY` — proxy/provider integration if used.
- [ ] `FIVESIM_DEPRECATED_API_KEY` — legacy/alternate FiveSim key if applicable.
- [ ] `OWNER_CONTACT_EMAIL` — operational contact (not a provider secret; still keep out of public prompts).

**Governance:** Tajne samo u `.env` / vault-u (ne u repou). Mapiranje ključeva: [`docs/SECRETS-MATRIX.md`](../../docs/SECRETS-MATRIX.md) · politika: [`docs/AKCIONI-PLAN-NOVITETI-I-CEO.md`](../../docs/AKCIONI-PLAN-NOVITETI-I-CEO.md).

**YouTube / upload APIs:** Not yet listed in `.env.example`; add keys only when upload or Data API tasks are implemented, using the same “secrets outside the repo” rule.

---

## Related

- Quick start: [`README.md`](./README.md)

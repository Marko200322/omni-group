# 07 — Alati: YouTube pipeline i `sistem_naplate`

**Deo priručnika:** [`README.md`](./README.md) · Prethodno: [`06-OMNIGROUP-WEB.md`](./06-OMNIGROUP-WEB.md) · Sledeće: [`08-API-REFERENCA.md`](./08-API-REFERENCA.md)

## YouTube pipeline (`tools/youtube-pipeline`)

Lokalni Celery lanac koji od teme proizvodi MP4 (i opciono ga otprema na YouTube). Koristi ga Express modul `omnitube` i isporuka `video-pipeline-retainer` preko `YOUTUBE_PIPELINE_URL`. Podrazumevani režim radi sa fake-ovima (bez spoljnih API-ja), pa se može pokrenuti bilo gde sa Redis-om.

### Zavisnosti i procesi

`requirements.txt`: `celery==5.4.0`, `redis==5.0.1`, `moviepy`, `Pillow`, `ffmpeg-python`, `requests`, `loguru`, `tenacity`, `python-dotenv`; opciono Google YouTube klijent.

| Proces | Komanda | Uloga |
|--------|---------|-------|
| Worker | `python run_worker.py` | Celery worker (app `omnitube`, `app/celery_app.py`) |
| Jednokratni lanac | `python run_pipeline.py` | Pokreće ceo lanac iz CLI-ja |
| HTTP API | `python run_http.py` | `app/http_api.py` na `PIPELINE_HTTP_PORT` (8090) |

### Lanac zadataka (`app/pipeline_tasks.py`)

```text
scout_task → voice_task → assets_task → beast_task → manager_task
(naslov, skripta,   (WAV glas)   (PNG slajdovi)  (MP4 montaža)  (opcioni upload, status complete)
 ključne reči)
```

### HTTP

| Metod | Putanja | Odgovor |
|-------|---------|---------|
| GET | `/health` | `{ status: "ok" }` |
| POST | `/run` | `202 { jobId, status }` — stavlja lanac u red |

### Env (`.env.example`, `app/config.py`; učitava i Atina `.env` + `config/env-aggregator.json` sekciju `youtubePipeline`)

`PIPELINE_HTTP_PORT`, `REDIS_HOST/PORT/DB`, `LOCAL_STORAGE_PATH`, `OUTPUT_PATH`, `MAX_WORKERS`; opciono `AI_*`, `SCRAPER_*`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`, `YOUTUBE_PRIVACY_STATUS`.

### Skladište i testovi

Izlaz ide u `./data` / `./data/output`; Redis je broker i backend. Nema pytest suite — ručni happy-path je u `tools/youtube-pipeline/RUNBOOK.md`.

### Brzi start

```bash
cd tools/youtube-pipeline
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python run_worker.py &          # terminal 1
python run_http.py &            # terminal 2
curl -s -X POST http://127.0.0.1:8090/run -H 'content-type: application/json' -d '{"topic":"demo"}'
```

## Sistem naplate (`sistem_naplate`)

Samostalne Python skripte iz FAZE 1 (pre Atina `payments` modula). Generišu PDF fakture i simuliraju proveru uplate sa Telegram obaveštenjem. Ne zavise od Atine i nisu HTTP servis.

| Fajl | Uloga |
|------|-------|
| `generate_invoice.py` | Pravi PDF fakturu u `sistem_naplate/pdfs/` (fpdf2) |
| `check_payment.py <broj>` | Proverava „uplatu” (simulacija preko `SIMULATE_PAYMENT_RECEIVED`) i šalje Telegram poruku |
| `config.py` (iz `config.example.py`) | Telegram token/chat, IBAN, podaci izdavaoca |
| `tests/test_billing_scripts.py` | 4 testa — `python -m pytest sistem_naplate/tests -q` (nije u root `testpaths`) |

Zavisnosti: `fpdf2>=2.7.0`, `requests>=2.28.0`.

Ne mešati sa Express modulom `sistem-naplate` (`atina-platform/atina/src/modules/sistem-naplate/`) — to je SaaS modul sa rutama `/api/v1/sistem-naplate`. Produkciona proforma faktura za klijente se generiše u Atini (`modules/payments/service/invoice-pdf.service.ts`), a ove skripte ostaju kao offline rezerva.

## Ostali alati u `scripts/`

Root `scripts/` sadrži 43 PowerShell skripte (audit, smoke, deploy, e2e). Pregled i `Get-Help` snapshot: `scripts/README.md`, `docs/SCRIPTS-HELP-SNAPSHOT.md`. Najvažnije za ovaj priručnik su navedene u [`11-RAZVOJ-I-TESTIRANJE.md`](./11-RAZVOJ-I-TESTIRANJE.md).

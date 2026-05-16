# YouTube pipeline (Celery) — local fake mode

- **No external APIs** in default path (scout generates text; voice = silent WAV; assets = Pillow slides; beast = MoviePy + FFmpeg).
- **Prerequisites:** Python 3.11+, Redis, **FFmpeg** on `PATH`.

```powershell
cd tools/youtube-pipeline
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# Terminal 1: redis-server (or Docker)
# Terminal 2:
python run_worker.py
# Terminal 3:
python run_pipeline.py
```

Output video: `data/output/video_<job_id>.mp4`.

Production keys (Gemini, ElevenLabs, Pexels, YouTube API) are optional follow-ups — keep them in `.env`, not in prompt dumps.

**Pun monorepo:** [`NIVO-1-START.md`](../../NIVO-1-START.md) · **Monorepo evidencija (indeks + dry-run):** [`docs/EVIDENCE-INDEX.md`](../../docs/EVIDENCE-INDEX.md) · [`docs/NIVO-1-DRYRUN-LOG.md`](../../docs/NIVO-1-DRYRUN-LOG.md) · **Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../../scripts/README.md) — **Kad podigneš novi broj**.

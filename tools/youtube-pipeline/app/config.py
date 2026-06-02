import os
from pathlib import Path

from dotenv import load_dotenv

from app.load_env_aggregator import apply_env_aggregator

apply_env_aggregator()


def _load_atina_dotenv() -> None:
    """Jedan izvor tajni: atina-platform/atina/.env (ne prepisuje već postavljene varijable)."""
    root = Path(__file__).resolve().parents[3]
    for _ in range(4):
        candidate = root / "atina-platform" / "atina" / ".env"
        if candidate.is_file():
            load_dotenv(candidate, override=False)
            return
        parent = root.parent
        if parent == root:
            break
        root = parent


_load_atina_dotenv()
load_dotenv(override=False)

# Agregatori (atina-platform/atina/.env — učitaj ručno ili preko istih imena u okruženju)
AI_URL = os.getenv("AI_URL", "")
AI_KEY = os.getenv("AI_KEY", "")
SCRAPER_URL = os.getenv("SCRAPER_URL", "")
SCRAPER_KEY = os.getenv("SCRAPER_KEY", "")

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", "0"))
LOCAL_STORAGE = Path(os.getenv("LOCAL_STORAGE_PATH", "./data"))
OUTPUT_PATH = Path(os.getenv("OUTPUT_PATH", "./data/output"))
MAX_WORKERS = int(os.getenv("MAX_WORKERS", "4"))

# YouTube Data API v3 (optional upload in manager_task)
YOUTUBE_CLIENT_ID = os.getenv("YOUTUBE_CLIENT_ID", "")
YOUTUBE_CLIENT_SECRET = os.getenv("YOUTUBE_CLIENT_SECRET", "")
YOUTUBE_REFRESH_TOKEN = os.getenv("YOUTUBE_REFRESH_TOKEN", "")
YOUTUBE_PRIVACY_STATUS = os.getenv("YOUTUBE_PRIVACY_STATUS", "private")

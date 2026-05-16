import os
from pathlib import Path

from dotenv import load_dotenv

from app.load_env_aggregator import apply_env_aggregator

apply_env_aggregator()
load_dotenv()

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

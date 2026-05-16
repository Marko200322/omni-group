"""Run from repo: cd tools/youtube-pipeline && python -m celery -A app.celery_app worker --loglevel=info"""

import subprocess
import sys

if __name__ == "__main__":
    raise SystemExit(
        subprocess.call(
            [sys.executable, "-m", "celery", "-A", "app.celery_app", "worker", "--loglevel=info"]
        )
    )

from celery import Celery

from app.config import REDIS_DB, REDIS_HOST, REDIS_PORT

broker = f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"

celery_app = Celery(
    "omnitube",
    broker=broker,
    backend=broker,
)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_concurrency=int(__import__("os").getenv("MAX_WORKERS", "4")),
)

# Register task modules
import app.pipeline_tasks  # noqa: E402, F401

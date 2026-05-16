"""Enqueue full pipeline. Requires Redis + worker. cd tools/youtube-pipeline && python run_pipeline.py"""

from celery import chain

from app.pipeline_tasks import assets_task, beast_task, manager_task, scout_task, voice_task

if __name__ == "__main__":
    result = chain(
        scout_task.s(),
        voice_task.s(),
        assets_task.s(),
        beast_task.s(),
        manager_task.s(),
    ).apply_async()
    print("Queued chain id:", result.id)

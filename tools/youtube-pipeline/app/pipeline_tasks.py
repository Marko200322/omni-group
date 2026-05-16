"""Celery pipeline: scout → voice → assets → beast → manager (fake / local, no external APIs)."""

from __future__ import annotations

import uuid
from typing import Any

from loguru import logger
from app.celery_app import celery_app
from app.config import OUTPUT_PATH
from app.utils import assets_dir, audio_dir, ensure_dirs


def _job_template() -> dict[str, Any]:
    return {
        "id": str(uuid.uuid4()),
        "title": "",
        "script": "",
        "keywords": [],
        "voice_path": "",
        "assets": [],
        "output_path": "",
        "status": "pending",
    }


@celery_app.task(bind=True)
def scout_task(self, job: dict[str, Any] | None = None) -> dict[str, Any]:
    j = job or _job_template()
    logger.info("scout_task start job={}", j.get("id"))
    j["title"] = j.get("title") or "Top 5 AI Secrets (local test)"
    j["script"] = j.get("script") or (
        "Hook: everyone talks about models. Body: systems win. "
        "End: the loop closes when you ship."
    )
    j["keywords"] = j.get("keywords") or ["ai", "systems", "shipping"]
    j["status"] = "scout_done"
    logger.info("scout_task done")
    return j


@celery_app.task(bind=True)
def voice_task(self, job: dict[str, Any]) -> dict[str, Any]:
    logger.info("voice_task start job={}", job.get("id"))
    ensure_dirs()
    from moviepy.audio.AudioClip import AudioArrayClip
    import numpy as np

    duration = 4.0
    fps = 22050
    samples = np.zeros((int(duration * fps), 1), dtype=np.float32)
    clip = AudioArrayClip(samples, fps=fps)
    out = audio_dir() / f"voice_{job['id']}.wav"
    clip.write_audiofile(str(out), fps=fps, logger=None)
    clip.close()
    job["voice_path"] = str(out)
    job["status"] = "voice_done"
    logger.info("voice_task done path={}", out)
    return job


@celery_app.task(bind=True)
def assets_task(self, job: dict[str, Any]) -> dict[str, Any]:
    logger.info("assets_task start job={}", job.get("id"))
    ensure_dirs()
    from PIL import Image, ImageDraw

    paths: list[str] = []
    for i, kw in enumerate(job.get("keywords") or ["frame"]):
        img = Image.new("RGB", (1280, 720), color=(20 + i * 40, 10, 40))
        d = ImageDraw.Draw(img)
        d.text((80, 320), kw, fill=(255, 255, 255))
        p = assets_dir() / f"slide_{job['id']}_{i}.png"
        img.save(p)
        paths.append(str(p))
    job["assets"] = paths
    job["status"] = "assets_done"
    logger.info("assets_task done count={}", len(paths))
    return job


@celery_app.task(bind=True)
def beast_task(self, job: dict[str, Any]) -> dict[str, Any]:
    logger.info("beast_task start job={}", job.get("id"))
    ensure_dirs()
    from moviepy.editor import AudioFileClip, ImageClip, concatenate_videoclips

    clips = []
    for ap in job.get("assets") or []:
        clips.append(ImageClip(ap).set_duration(1.5))
    if not clips:
        raise RuntimeError("no assets")
    video = concatenate_videoclips(clips, method="compose")
    audio = AudioFileClip(job["voice_path"])
    video = video.set_audio(audio)
    out = OUTPUT_PATH / f"video_{job['id']}.mp4"
    OUTPUT_PATH.mkdir(parents=True, exist_ok=True)
    video.write_videofile(str(out), fps=24, codec="libx264", audio_codec="aac", logger=None)
    video.close()
    audio.close()
    job["output_path"] = str(out)
    job["status"] = "beast_done"
    logger.info("beast_task done path={}", out)
    return job


@celery_app.task(bind=True)
def manager_task(self, job: dict[str, Any]) -> dict[str, Any]:
    logger.info("VIDEO READY: {}", job.get("output_path"))
    job["status"] = "complete"
    return job



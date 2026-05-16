from pathlib import Path

from app.config import LOCAL_STORAGE, OUTPUT_PATH


def ensure_dirs() -> None:
    for p in (
        LOCAL_STORAGE / "audio",
        LOCAL_STORAGE / "assets",
        OUTPUT_PATH,
    ):
        p.mkdir(parents=True, exist_ok=True)


def audio_dir() -> Path:
    return LOCAL_STORAGE / "audio"


def assets_dir() -> Path:
    return LOCAL_STORAGE / "assets"

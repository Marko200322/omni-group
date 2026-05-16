"""Apply config/env-aggregator.json (integrations + youtubePipeline) into os.environ."""

from __future__ import annotations

import json
import os
from pathlib import Path


def _find_repo_root(start: Path) -> Path | None:
    current = start.resolve()
    for _ in range(10):
        candidate = current / "config" / "env-aggregator.json"
        if candidate.is_file():
            return current
        parent = current.parent
        if parent == current:
            break
        current = parent
    return None


def apply_env_aggregator() -> None:
    root = _find_repo_root(Path(__file__).resolve().parents[3])
    if root is None:
        return

    path = root / "config" / "env-aggregator.json"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return

    for section in ("youtubePipeline",):
        block = data.get(section)
        if not isinstance(block, dict):
            continue
        for key, value in block.items():
            if key.startswith("_"):
                continue
            if os.environ.get(key) is not None:
                continue
            if value is None:
                continue
            os.environ[key] = str(value)

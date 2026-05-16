from __future__ import annotations

from enum import Enum


class CloudProvider(str, Enum):
    ORACLE = "oracle"
    AWS = "aws"
    AZURE = "azure"


ORDER: tuple[CloudProvider, ...] = (
    CloudProvider.ORACLE,
    CloudProvider.AWS,
    CloudProvider.AZURE,
)


def next_provider(step_index: int) -> CloudProvider:
    return ORDER[step_index % len(ORDER)]

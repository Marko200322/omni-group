# -*- coding: utf-8 -*-
"""Unify Val pointer wording (širom dokova), YAML comments, and pytest.ini-style evidence lines with STAGING pattern."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
YAML_COMMENT = re.compile(
    r"Evidence index \+ dry-run:\s*([^\s#,]+),\s*([^\s#]+\.md)"
)
INI_COMMENT = re.compile(
    r"Evidence index \+ dry-run log:\s*([^\s#,]+),\s*([^\s#]+\.md)"
)


def write_preserving_newlines(path: Path, original: str, new: str) -> None:
    data = path.read_bytes()
    uses_crlf = b"\r\n" in data
    if new == original:
        return
    t = new.replace("\r\n", "\n").replace("\r", "\n")
    if uses_crlf:
        t = t.replace("\n", "\r\n")
    path.write_bytes(t.encode("utf-8"))


def main() -> int:
    # 1) Markdown: širom repoa → širom dokova (canonical with CONTRIBUTING / RUN-ATINA-PLATFORM.txt)
    for path in ROOT.rglob("*.md"):
        if "node_modules" in path.parts:
            continue
        text = path.read_bytes().decode("utf-8")
        if "širom repoa" not in text:
            continue
        new = text.replace("širom repoa", "širom dokova")
        write_preserving_newlines(path, text, new)

    # 2) YAML / compose comments: English evidence line → same label as STAGING (Serbian + middle dot)
    for path in list(ROOT.rglob("*.yml")) + list(ROOT.rglob("*.yaml")):
        if "node_modules" in path.parts:
            continue
        text = path.read_bytes().decode("utf-8")
        if "Evidence index + dry-run:" not in text:
            continue

        def repl(m: re.Match[str]) -> str:
            return f"Monorepo evidencija (indeks + dry-run): {m.group(1)} · {m.group(2)}"

        new = YAML_COMMENT.sub(repl, text)
        write_preserving_newlines(path, text, new)

    # 3) pytest.ini / other *.ini comment headers (same evidence phrase as YAML)
    for path in ROOT.rglob("*.ini"):
        if "node_modules" in path.parts:
            continue
        text = path.read_bytes().decode("utf-8")
        if "Evidence index + dry-run log:" not in text:
            continue

        def repl_ini(m: re.Match[str]) -> str:
            return f"Monorepo evidencija (indeks + dry-run): {m.group(1)} · {m.group(2)}"

        new = INI_COMMENT.sub(repl_ini, text)
        write_preserving_newlines(path, text, new)

    return 0


if __name__ == "__main__":
    sys.exit(main())

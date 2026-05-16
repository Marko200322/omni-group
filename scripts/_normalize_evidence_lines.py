# -*- coding: utf-8 -*-
"""Normalize 'indeks + dry-run' phrasing to match docs/STAGING-RELEASE-CHECKLIST.md."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MD_LINK = re.compile(r"\[`[^`]*`\]\([^)]+\)")


def sub(pattern: str, repl: str, text: str) -> str:
    return re.sub(pattern, repl, text, flags=re.MULTILINE)


def normalize(text: str) -> str:
    ml = MD_LINK.pattern
    text = sub(
        rf"\*\*Monorepo evidencija:\*\* ({ml}) \u00b7 indeks \+ dry-run ({ml})",
        r"**Monorepo evidencija (indeks + dry-run):** \1 · \2",
        text,
    )
    text = sub(
        rf"\*\*Monorepo evidencija:\*\* (\*\*{ml}\*\*) \u00b7 indeks \+ dry-run (\*\*{ml}\*\*)",
        r"**Monorepo evidencija (indeks + dry-run):** \1 · \2",
        text,
    )
    text = sub(
        rf"\*\*Evidencija / šabloni:\*\* ({ml}) \u00b7 indeks \+ dry-run ({ml})",
        r"**Evidencija / šabloni (indeks + dry-run):** \1 · \2",
        text,
    )
    text = sub(
        rf"\*\*Indeks svih dokaza:\*\* ({ml}) \u00b7 indeks \+ dry-run ({ml})",
        r"**Evidencija / šabloni (indeks + dry-run):** \1 · \2",
        text,
    )
    text = sub(
        rf"\*\*Gde je koji dokaz:\*\* ({ml}) \u00b7 indeks \+ dry-run ({ml})",
        r"**Gde je koji dokaz (indeks + dry-run):** \1 · \2",
        text,
    )
    text = sub(
        rf"- \*\*Evidencija / šabloni:\*\* ({ml}) \u00b7 indeks \+ dry-run ({ml})",
        r"- **Evidencija / šabloni (indeks + dry-run):** \1 · \2",
        text,
    )
    text = sub(
        rf"\*\*Evidencija / šabloni \(monorepo\):\*\* ({ml}) \u00b7 indeks \+ dry-run zapisi ({ml})",
        r"**Evidencija / šabloni (monorepo; indeks + dry-run):** \1 · \2",
        text,
    )
    text = text.replace(
        "**Indeks + dry-run:**",
        "**Monorepo evidencija (indeks + dry-run):**",
    )
    return text


def main() -> int:
    for path in ROOT.rglob("*.md"):
        if "node_modules" in path.parts:
            continue
        data = path.read_bytes()
        text = data.decode("utf-8")
        uses_crlf = b"\r\n" in data
        # Normalize line endings for transforms, then restore CRLF if the file used it.
        text_norm = text.replace("\r\n", "\n").replace("\r", "\n")
        new_norm = normalize(text_norm)
        if new_norm == text_norm:
            continue
        out = new_norm
        if uses_crlf:
            out = out.replace("\n", "\r\n")
        path.write_bytes(out.encode("utf-8"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
